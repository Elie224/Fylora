/**
 * Routes pour recevoir les métriques frontend
 */
const express = require('express');
const router = express.Router();
const kpiMonitor = require('../utils/kpiMonitor');

router.post('/frontend', (req, res, next) => {
  try {
    const { type, value, metadata } = req.body;

    // Enregistrer la métrique frontend
    kpiMonitor.recordFrontendMetric(type, value);

    res.status(200).json({ success: true });
  } catch (err) {
    next(err);
  }
});

module.exports = router;


