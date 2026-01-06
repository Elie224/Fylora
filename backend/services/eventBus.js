/**
 * Event Bus - Gestion des événements asynchrones entre microservices
 * Utilise Redis Streams (léger) avec migration possible vers Kafka
 */

const redis = require('redis');
const logger = require('../utils/logger');
const { v4: uuidv4 } = require('uuid');

class EventBus {
  constructor() {
    this.client = null;
    this.isConnected = false;
    this.subscribers = new Map();
    this.useRedisStreams = true; // true = Redis Streams, false = Kafka
  }

  /**
   * Initialiser la connexion
   */
  async init() {
    try {
      const redisUrl = process.env.REDIS_URL;
      
      if (!redisUrl || redisUrl.includes('127.0.0.1') || redisUrl.includes('localhost')) {
        logger.logWarn('Event Bus: Redis not available, using in-memory events');
        return false;
      }

      this.client = redis.createClient({
        url: redisUrl,
        socket: {
          connectTimeout: 5000,
          reconnectStrategy: (retries) => {
            if (retries > 5) {
              logger.logWarn('Event Bus: Max Redis reconnection attempts reached, using in-memory fallback');
              return false; // Stop reconnecting
            }
            return Math.min(retries * 100, 3000);
          }
        },
      });

      this.client.on('error', (err) => {
        // Ne logger que les erreurs non-timeout pour éviter le spam
        if (!err.message.includes('timeout') && !err.message.includes('Connection timeout')) {
          logger.logError(err, { context: 'event_bus_error' });
        }
        this.isConnected = false;
      });

      this.client.on('connect', () => {
        logger.logInfo('Event Bus: Connected to Redis');
        this.isConnected = true;
      });

      await this.client.connect().catch((connectErr) => {
        // Si c'est un timeout, utiliser le fallback silencieusement
        if (connectErr.message && connectErr.message.includes('timeout')) {
          logger.logWarn('Event Bus: Redis connection timeout, using in-memory events');
        } else {
          logger.logError(connectErr, { context: 'event_bus_init' });
        }
        throw connectErr;
      });
      return true;
    } catch (err) {
      // Ne logger que si ce n'est pas un timeout attendu
      if (!err.message || (!err.message.includes('timeout') && !err.message.includes('Connection timeout'))) {
        logger.logError(err, { context: 'event_bus_init' });
      }
      return false;
    }
  }

  /**
   * Publier un événement
   */
  async publish(eventType, data, metadata = {}) {
    const event = {
      id: uuidv4(),
      type: eventType,
      data,
      metadata: {
        ...metadata,
        timestamp: new Date().toISOString(),
        source: 'fylora-backend',
      },
    };

    try {
      if (this.isConnected && this.client) {
        // Utiliser Redis Streams
        await this.client.xAdd('events', '*', {
          type: eventType,
          data: JSON.stringify(data),
          metadata: JSON.stringify(event.metadata),
        });

        logger.logInfo('Event published', {
          eventType,
          eventId: event.id,
        });
      } else {
        // Fallback: stocker en mémoire pour traitement local
        logger.logWarn('Event Bus not connected, storing event in memory', {
          eventType,
        });
        this.handleEventLocally(event);
      }

      return event.id;
    } catch (err) {
      logger.logError(err, {
        context: 'event_publish',
        eventType,
      });
      // Fallback local
      this.handleEventLocally(event);
      return event.id;
    }
  }

  /**
   * S'abonner à un type d'événement
   */
  async subscribe(eventType, handler) {
    if (!this.subscribers.has(eventType)) {
      this.subscribers.set(eventType, []);
    }

    this.subscribers.get(eventType).push(handler);

    logger.logInfo('Event subscription registered', {
      eventType,
      handlerCount: this.subscribers.get(eventType).length,
    });

    // Si Redis est connecté, créer un consumer group
    if (this.isConnected && this.client) {
      try {
        await this.client.xGroupCreate('events', `consumer_${eventType}`, '0', {
          MKSTREAM: true,
        }).catch(() => {
          // Group existe déjà, c'est OK
        });
      } catch (err) {
        // Ignorer les erreurs de création de groupe
      }
    }
  }

  /**
   * Traiter les événements (à appeler périodiquement)
   */
  async processEvents() {
    if (!this.isConnected || !this.client) {
      return;
    }

    for (const [eventType, handlers] of this.subscribers.entries()) {
      try {
        const groupName = `consumer_${eventType}`;
        const consumerName = `worker_${process.pid}`;

        // Lire les événements du stream
        const messages = await this.client.xReadGroup(
          groupName,
          consumerName,
          {
            key: 'events',
            id: '>', // Nouveaux messages seulement
          },
          {
            COUNT: 10,
            BLOCK: 1000, // Attendre 1 seconde max
          }
        );

        if (messages && messages.length > 0) {
          for (const message of messages) {
            const [, events] = message;
            for (const [eventId, fields] of events) {
              try {
                const eventData = JSON.parse(fields.data);
                const eventMetadata = JSON.parse(fields.metadata);

                // Appeler tous les handlers
                for (const handler of handlers) {
                  try {
                    await handler(eventData, eventMetadata);
                  } catch (handlerErr) {
                    logger.logError(handlerErr, {
                      context: 'event_handler_error',
                      eventType,
                      eventId,
                    });
                  }
                }

                // Acknowledger le message
                await this.client.xAck('events', groupName, eventId);
              } catch (parseErr) {
                logger.logError(parseErr, {
                  context: 'event_parse_error',
                  eventId,
                });
              }
            }
          }
        }
      } catch (err) {
        logger.logError(err, {
          context: 'event_processing',
          eventType,
        });
      }
    }
  }

  /**
   * Gérer les événements localement (fallback)
   */
  handleEventLocally(event) {
    const handlers = this.subscribers.get(event.type) || [];
    for (const handler of handlers) {
      setImmediate(async () => {
        try {
          await handler(event.data, event.metadata);
        } catch (err) {
          logger.logError(err, {
            context: 'local_event_handler',
            eventType: event.type,
          });
        }
      });
    }
  }

  /**
   * Événements standards de la plateforme
   */
  static Events = {
    // Fichiers
    FILE_UPLOADED: 'file.uploaded',
    FILE_DELETED: 'file.deleted',
    FILE_RESTORED: 'file.restored',
    FILE_SHARED: 'file.shared',
    
    // Utilisateurs
    USER_CREATED: 'user.created',
    USER_UPDATED: 'user.updated',
    USER_DELETED: 'user.deleted',
    USER_UPGRADED: 'user.upgraded',
    
    // Billing
    PAYMENT_SUCCESS: 'payment.success',
    PAYMENT_FAILED: 'payment.failed',
    SUBSCRIPTION_CANCELLED: 'subscription.cancelled',
    
    // Quota
    QUOTA_WARNING: 'quota.warning',
    QUOTA_EXCEEDED: 'quota.exceeded',
    
    // Intelligence
    OCR_COMPLETED: 'ocr.completed',
    SEARCH_INDEXED: 'search.indexed',
  };
}

// Instance singleton
const eventBus = new EventBus();

// Initialiser au démarrage
eventBus.init().catch(err => {
  logger.logError(err, { context: 'event_bus_startup' });
});

// Traiter les événements toutes les 5 secondes
if (eventBus.isConnected) {
  setInterval(() => {
    eventBus.processEvents().catch(err => {
      logger.logError(err, { context: 'event_processing_interval' });
    });
  }, 5000);
}

module.exports = eventBus;
module.exports.Events = EventBus.Events;

