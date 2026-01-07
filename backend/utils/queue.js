/**
 * Système de queues pour traitements lourds en arrière-plan
 * Supporte Redis Bull pour la production, mémoire pour le développement
 */
const EventEmitter = require('events');

class MemoryQueue extends EventEmitter {
  constructor(name) {
    super();
    this.name = name;
    this.jobs = [];
    this.processing = false;
    this.workers = [];
  }

  async add(jobData, options = {}) {
    const job = {
      id: require('uuid').v4(),
      data: jobData,
      options: {
        delay: options.delay || 0,
        attempts: options.attempts || 3,
        backoff: options.backoff || { type: 'exponential', delay: 2000 },
        ...options
      },
      createdAt: new Date(),
      attempts: 0,
      status: 'waiting'
    };

    this.jobs.push(job);
    this.emit('job:added', job);
    
    // Traiter immédiatement si pas de délai
    if (!options.delay) {
      this.process();
    } else {
      setTimeout(() => this.process(), options.delay);
    }

    return job;
  }

  async process() {
    if (this.processing || this.jobs.length === 0) {
      return;
    }

    this.processing = true;

    while (this.jobs.length > 0) {
      const job = this.jobs.shift();
      
      if (job.status === 'waiting') {
        job.status = 'processing';
        this.emit('job:processing', job);

        try {
          // Appeler le worker
          for (const worker of this.workers) {
            await worker(job.data);
          }
          
          job.status = 'completed';
          this.emit('job:completed', job);
        } catch (error) {
          job.attempts++;
          job.lastError = error.message;

          if (job.attempts >= job.options.attempts) {
            job.status = 'failed';
            this.emit('job:failed', job);
          } else {
            // Réessayer avec backoff
            const delay = job.options.backoff.type === 'exponential'
              ? job.options.backoff.delay * Math.pow(2, job.attempts - 1)
              : job.options.backoff.delay;
            
            setTimeout(() => {
              job.status = 'waiting';
              this.jobs.push(job);
              this.process();
            }, delay);
          }
        }
      }
    }

    this.processing = false;
  }

  onJob(worker) {
    this.workers.push(worker);
  }

  async getJob(jobId) {
    return this.jobs.find(j => j.id === jobId);
  }

  async getJobs(status = null) {
    if (status) {
      return this.jobs.filter(j => j.status === status);
    }
    return this.jobs;
  }
}

class QueueManager {
  constructor() {
    this.queues = new Map();
    this.useRedis = false;
    this.Bull = null;
    this.redisErrorLogged = false; // Flag pour éviter le spam de logs
    // Initialisation synchrone immédiate
    this._initSync();
    // Initialisation asynchrone en arrière-plan
    this._initAsync().catch(() => {
      // Erreur silencieuse, on utilisera memory queues
    });
  }

  _initSync() {
    // Vérification synchrone initiale
    if (!process.env.REDIS_URL && !process.env.REDIS_HOST) {
      this.useRedis = false;
      if (process.env.NODE_ENV !== 'production') {
        console.log('ℹ️  Redis not configured for queues, using memory queues');
      }
      return;
    }
  }

  async _initAsync() {
    // Vérifier si Redis est configuré
    if (!process.env.REDIS_URL && !process.env.REDIS_HOST) {
      this.useRedis = false;
      console.log('ℹ️  Redis not configured for queues, using memory queues');
      return;
    }

    // Vérifier que REDIS_URL n'est pas localhost (non disponible sur Render)
    if (process.env.REDIS_URL && process.env.REDIS_URL.includes('127.0.0.1')) {
      console.warn('⚠️  REDIS_URL points to localhost, using memory queues instead');
      this.useRedis = false;
      return;
    }

    // Essayer Redis Bull si disponible
    try {
      const Bull = require('bull');
      this.Bull = Bull;
      // Ne pas activer Redis automatiquement - tester la connexion d'abord
      this.useRedis = false; // Désactivé par défaut, sera activé si la connexion réussit
      console.log('✅ Redis Bull available for queues (will test connection)');
    } catch (error) {
      console.warn('⚠️  Redis Bull not available, using memory queues');
      this.useRedis = false;
    }
  }

  getQueue(name) {
    if (this.queues.has(name)) {
      return this.queues.get(name);
    }

    let queue;
    // Vérifier que Redis est vraiment disponible avant d'essayer de l'utiliser
    if (this.Bull && process.env.REDIS_URL && !process.env.REDIS_URL.includes('127.0.0.1')) {
      try {
        // Utiliser REDIS_URL si disponible et valide
        const redisConfig = { 
          url: process.env.REDIS_URL,
          maxRetriesPerRequest: null, // Désactiver les tentatives automatiques
          retryStrategy: (times) => {
            // Si Redis n'est pas disponible, arrêter immédiatement
            if (times > 1) {
              return null; // Arrêter les tentatives
            }
            return 100; // Une seule tentative rapide
          },
          connectTimeout: 2000, // Timeout court
          lazyConnect: true, // Ne pas se connecter immédiatement
          enableOfflineQueue: false, // Désactiver la queue offline pour éviter les erreurs
        };
        
        queue = new this.Bull(name, {
          redis: redisConfig,
          defaultJobOptions: {
            attempts: 3,
            backoff: {
              type: 'exponential',
              delay: 2000,
            },
          },
          settings: {
            retryProcessDelay: 5000,
          },
        });
        
        // Gérer les erreurs de connexion Redis sans faire planter l'application
        queue.on('error', (error) => {
          // Ignorer les erreurs de connexion - elles ne sont pas critiques
          // Les erreurs Redis ne doivent pas faire planter l'application
          if (error.message && (error.message.includes('ECONNREFUSED') || 
                                error.message.includes('Connection') ||
                                error.message.includes('Connection is closed') ||
                                error.message.includes('127.0.0.1'))) {
            // Basculer vers memory queue si Redis n'est pas disponible
            // Ne logger qu'une seule fois pour éviter le spam
            if (!this.redisErrorLogged) {
              console.warn(`Redis unavailable for queue ${name}, using memory queue instead`);
              this.redisErrorLogged = true;
            }
            this.useRedis = false;
            // Remplacer la queue par une memory queue
            try {
              const memoryQueue = new MemoryQueue(name);
              this.queues.set(name, memoryQueue);
              // Émettre un événement pour que les workers puissent se reconnecter
              memoryQueue.emit('ready');
            } catch (err) {
              // Ignorer silencieusement
            }
            return;
          }
          // Logger les autres erreurs mais ne pas faire planter
          if (!this.redisErrorLogged) {
            console.warn(`Redis queue error for ${name}:`, error.message);
            this.redisErrorLogged = true;
          }
        });
        
        // Gérer les erreurs lors de l'ajout de jobs
        queue.on('stalled', () => {
          // Jobs bloqués - basculer vers memory queue
          if (!this.redisErrorLogged) {
            console.warn(`Redis queue ${name} stalled, switching to memory queue`);
            this.useRedis = false;
            const memoryQueue = new MemoryQueue(name);
            this.queues.set(name, memoryQueue);
          }
        });
        
        // Gérer les erreurs de connexion au démarrage
        queue.on('ready', () => {
          console.log(`Redis queue ${name} ready`);
        });
        
        // Capturer les erreurs de connexion initiale
        queue.on('waiting', (jobId) => {
          // Ne rien faire, juste pour éviter les warnings
        });
        
      } catch (err) {
        // Si la création de la queue échoue, utiliser memory queue
        console.warn(`Failed to create Redis queue ${name}, using memory queue:`, err.message);
        this.useRedis = false;
        queue = new MemoryQueue(name);
      }
    } else {
      // Utiliser memory queue si Redis n'est pas disponible
      queue = new MemoryQueue(name);
    }

    this.queues.set(name, queue);
    return queue;
  }

  async addJob(queueName, jobData, options = {}) {
    try {
      const queue = this.getQueue(queueName);
      
      // Si c'est une queue Bull, vérifier qu'elle est vraiment connectée
      if (this.Bull && queue && queue.client && queue.client.status !== 'ready') {
        // Redis n'est pas prêt, utiliser memory queue
        console.warn(`Redis not ready for queue ${queueName}, using memory queue`);
        this.useRedis = false;
        const memoryQueue = new MemoryQueue(queueName);
        this.queues.set(queueName, memoryQueue);
        return await memoryQueue.add(jobData, options);
      }
      
      return await queue.add(jobData, options);
    } catch (error) {
      // Si l'erreur est liée à Redis (connexion fermée, etc.), basculer vers memory queue
      if (error.message && (error.message.includes('Connection is closed') ||
                            error.message.includes('ECONNREFUSED') ||
                            error.message.includes('Connection'))) {
        console.warn(`Redis error for queue ${queueName}, switching to memory queue:`, error.message);
        this.useRedis = false;
        const memoryQueue = new MemoryQueue(queueName);
        this.queues.set(queueName, memoryQueue);
        // Réessayer avec la memory queue
        return await memoryQueue.add(jobData, options);
      }
      // Pour les autres erreurs, les propager
      throw error;
    }
  }

  async processQueue(queueName, worker) {
    const queue = this.getQueue(queueName);
    
    if (this.useRedis && this.Bull) {
      queue.process(worker);
    } else {
      queue.onJob(worker);
    }
  }
}

// Instance singleton
const queueManager = new QueueManager();

// Queues prédéfinies
const queues = {
  // Traitement de fichiers (OCR, métadonnées, etc.)
  fileProcessing: queueManager.getQueue('file-processing'),
  
  // Envoi d'emails
  emails: queueManager.getQueue('emails'),
  
  // Nettoyage et maintenance
  cleanup: queueManager.getQueue('cleanup'),
  
  // Webhooks
  webhooks: queueManager.getQueue('webhooks'),
};

module.exports = {
  queueManager,
  queues,
  MemoryQueue,
};
