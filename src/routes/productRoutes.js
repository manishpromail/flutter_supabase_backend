const express = require('express');
const router = express.Router();
const { getProducts, createProduct } = require('../controllers/productController');
const { requireAuth } = require('../middlewares/authMiddleware');

// Middleware to extract token if provided (optional authentication)
const optionalAuth = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    req.token = authHeader.split(' ')[1];
  }
  next();
};

// GET /api/products - list all products
router.get('/', optionalAuth, getProducts);

// POST /api/products - add product (requires user to be logged in)
router.post('/', requireAuth, createProduct);

module.exports = router;
