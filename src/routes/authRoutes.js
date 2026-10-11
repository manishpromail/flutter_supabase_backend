const express = require('express');
const router = express.Router();
const { signup, login, getProfile } = require('../controllers/authController');
const { requireAuth } = require('../middlewares/authMiddleware');

// POST /api/auth/signup
router.post('/signup', signup);

// POST /api/auth/login
router.post('/login', login);

// GET /api/auth/me (Protected route)
router.get('/me', requireAuth, getProfile);

module.exports = router;
