/**
 * Routes pour KPI et monitoring
 */
const express = require('express');
const router = express.Router();
const kpiMonitor = require('../utils/kpiMonitor');
const dbPoolOptimizer = require('../utils/dbPoolOptimizer');
const { authMiddleware } = require('../middlewares/authMiddleware');

// Routes publiques pour monitoring (protégées par IP en production)
router.get('/metrics', async (req, res, next) => {
  try {
    const kpis = await kpiMonitor.getKPIs();
    res.status(200).json({ data: kpis });
  } catch (err) {
    next(err);
  }
});

router.get('/bottlenecks', async (req, res, next) => {
  try {
    const bottlenecks = await kpiMonitor.identifyBottlenecks();
    res.status(200).json({ data: bottlenecks });
  } catch (err) {
    next(err);
  }
});

router.get('/db-pool', async (req, res, next) => {
  try {
    await dbPoolOptimizer.monitorPool();
    const stats = dbPoolOptimizer.getPoolStats();
    res.status(200).json({ data: stats });
  } catch (err) {
    next(err);
  }
});

// Route protégée pour admin
router.get('/admin', authMiddleware, async (req, res, next) => {
  try {
    // Vérifier que l'utilisateur est admin
    const UserModel = require('../models/userModel');
    const user = await UserModel.findById(req.user.id);
    
    if (!user || !user.is_admin) {
      return res.status(403).json({ error: { message: 'Access denied' } });
    }

    const [kpis, bottlenecks, dbStats] = await Promise.all([
      kpiMonitor.getKPIs(),
      kpiMonitor.identifyBottlenecks(),
      dbPoolOptimizer.getPoolStats(),
    ]);

    res.status(200).json({
      data: {
        kpis,
        bottlenecks,
        dbPool: dbStats,
      },
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;


