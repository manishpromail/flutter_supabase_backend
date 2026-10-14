const express = require('express');
const router = express.Router();
const {
  getProducts,
  getProductById,
  createProduct,
  addProductReview
} = require('../controllers/productController');
const { requireAuth } = require('../middlewares/authMiddleware');

// Middleware to extract token if provided (optional authentication)
const optionalAuth = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    req.token = authHeader.split(' ')[1];
  }
  next();
};

// GET /api/products - list all products with relations & optional ?category_id=
router.get('/', optionalAuth, getProducts);

// GET /api/products/:id - get single product with full 1:1, 1:M and M:M relations
router.get('/:id', optionalAuth, getProductById);

// POST /api/products - add product (requires user to be logged in)
router.post('/', requireAuth, createProduct);

// POST /api/products/:id/reviews - add a 1:M review to a product
router.post('/:id/reviews', optionalAuth, addProductReview);

module.exports = router;
