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
    this.init();
  }

  async init() {
    // Essayer Redis Bull si disponible
    try {
      const Bull = require('bull');
      this.Bull = Bull;
      this.useRedis = true;
      console.log('✅ Redis Bull available for queues');
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
    if (this.useRedis && this.Bull) {
      queue = new this.Bull(name, {
        redis: {
          host: process.env.REDIS_HOST || 'localhost',
          port: process.env.REDIS_PORT || 6379,
          password: process.env.REDIS_PASSWORD,
        },
        defaultJobOptions: {
          attempts: 3,
          backoff: {
            type: 'exponential',
            delay: 2000,
          },
        },
      });
    } else {
      queue = new MemoryQueue(name);
    }

    this.queues.set(name, queue);
    return queue;
  }

  async addJob(queueName, jobData, options = {}) {
    const queue = this.getQueue(queueName);
    return await queue.add(jobData, options);
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
