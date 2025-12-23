/**
 * Contrôleur pour les webhooks
 */
const Webhook = require('../models/Webhook');
const axios = require('axios');
const crypto = require('crypto');

// Créer un webhook
async function createWebhook(req, res, next) {
  try {
    const userId = req.user.id;
    const { url, events, headers, timeout_ms } = req.body;

    if (!url || !events || events.length === 0) {
      return res.status(400).json({
        error: { message: 'url and events are required' },
      });
    }

    // Générer un secret
    const secret = crypto.randomBytes(32).toString('hex');

    const webhook = new Webhook({
      user_id: userId,
      url,
      events,
      secret,
      headers: headers || {},
      timeout_ms: timeout_ms || 5000,
    });

    await webhook.save();

    res.status(201).json({
      data: {
        id: webhook._id,
        url: webhook.url,
        events: webhook.events,
        secret: webhook.secret, // Retourner le secret une seule fois
      },
      message: 'Webhook created successfully',
    });
  } catch (err) {
    next(err);
  }
}

// Obtenir les webhooks d'un utilisateur
async function getWebhooks(req, res, next) {
  try {
    const userId = req.user.id;

    const webhooks = await Webhook.find({
      user_id: userId,
    })
      .select('-secret') // Ne pas retourner le secret
      .sort({ created_at: -1 })
      .lean();

    res.status(200).json({ data: webhooks });
  } catch (err) {
    next(err);
  }
}

// Mettre à jour un webhook
async function updateWebhook(req, res, next) {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const updates = req.body;

    const webhook = await Webhook.findOne({
      _id: id,
      user_id: userId,
    });

    if (!webhook) {
      return res.status(404).json({
        error: { message: 'Webhook not found' },
      });
    }

    Object.assign(webhook, updates);
    webhook.updated_at = new Date();
    await webhook.save();

    res.status(200).json({
      data: webhook,
      message: 'Webhook updated successfully',
    });
  } catch (err) {
    next(err);
  }
}

// Supprimer un webhook
async function deleteWebhook(req, res, next) {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const webhook = await Webhook.findOne({
      _id: id,
      user_id: userId,
    });

    if (!webhook) {
      return res.status(404).json({
        error: { message: 'Webhook not found' },
      });
    }

    await Webhook.findByIdAndDelete(id);

    res.status(200).json({
      message: 'Webhook deleted successfully',
    });
  } catch (err) {
    next(err);
  }
}

// Tester un webhook
async function testWebhook(req, res, next) {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const webhook = await Webhook.findOne({
      _id: id,
      user_id: userId,
    });

    if (!webhook) {
      return res.status(404).json({
        error: { message: 'Webhook not found' },
      });
    }

    // Envoyer un événement de test
    await triggerWebhook(webhook, {
      event: 'webhook.test',
      data: {
        message: 'This is a test webhook',
        timestamp: new Date(),
      },
    });

    res.status(200).json({
      message: 'Test webhook sent successfully',
    });
  } catch (err) {
    next(err);
  }
}

// Fonction utilitaire pour déclencher un webhook
async function triggerWebhook(webhook, eventData) {
  try {
    if (!webhook.is_active) {
      return;
    }

    // Créer la signature
    const payload = JSON.stringify(eventData);
    const signature = crypto
      .createHmac('sha256', webhook.secret)
      .update(payload)
      .digest('hex');

    const headers = {
      'Content-Type': 'application/json',
      'X-Fylora-Signature': signature,
      'X-Fylora-Event': eventData.event,
      ...webhook.headers,
    };

    await axios.post(webhook.url, eventData, {
      headers,
      timeout: webhook.timeout_ms,
    });

    // Mettre à jour les statistiques
    webhook.last_success_at = new Date();
    webhook.retry_count = 0;
    await webhook.save();
  } catch (error) {
    // Enregistrer l'erreur
    webhook.last_attempt_at = new Date();
    webhook.retry_count += 1;
    webhook.last_error = {
      message: error.message,
      code: error.code,
      timestamp: new Date(),
    };
    await webhook.save();

    throw error;
  }
}

module.exports = {
  createWebhook,
  getWebhooks,
  updateWebhook,
  deleteWebhook,
  testWebhook,
  triggerWebhook,
};


