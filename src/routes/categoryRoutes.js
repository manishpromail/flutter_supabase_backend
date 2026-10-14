const express = require('express');
const router = express.Router();
const { getCategories, createCategory } = require('../controllers/categoryController');
const { requireAuth } = require('../middlewares/authMiddleware');

const optionalAuth = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    req.token = authHeader.split(' ')[1];
  }
  next();
};

// GET /api/categories - list all categories
router.get('/', optionalAuth, getCategories);

// POST /api/categories - add a new category (requires auth)
router.post('/', requireAuth, createCategory);

module.exports = router;
