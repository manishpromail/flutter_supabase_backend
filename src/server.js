const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
require('dotenv').config();

const authRoutes = require('./routes/authRoutes');
const productRoutes = require('./routes/productRoutes');
const categoryRoutes = require('./routes/categoryRoutes');
const schemaRoutes = require('./routes/schemaRoutes');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(morgan('dev')); // Logs incoming HTTP requests in terminal

// Health Check Endpoint
app.get('/', (req, res) => {
  res.json({
    status: 'online',
    message: 'Full-Stack Mobile + Node.js + Supabase Relational API is running 🚀',
    relationships: {
      'one_to_one': 'products <-> product_details (Unique FK)',
      'one_to_many': 'products <-> reviews (Product has Many Reviews)',
      'many_to_many': 'products <-> categories (via product_categories junction table)'
    },
    endpoints: {
      auth: {
        signup: 'POST /api/auth/signup',
        login: 'POST /api/auth/login',
        profile: 'GET /api/auth/me'
      },
      products: {
        list: 'GET /api/products',
        detail: 'GET /api/products/:id',
        create: 'POST /api/products',
        add_review: 'POST /api/products/:id/reviews'
      },
      categories: {
        list: 'GET /api/categories',
        create: 'POST /api/categories'
      },
      schema: {
        info: 'GET /api/schema/relationships'
      }
    }
  });
});

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Mount Routes
app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/schema', schemaRoutes);

// 404 Handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Route ${req.originalUrl} not found`
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Unhandled Server Error:', err.stack);
  res.status(500).json({
    success: false,
    message: 'Internal server error',
    error: err.message
  });
});

// Start listening on 0.0.0.0 so iOS simulators, Android emulators, and local network can reach it
app.listen(PORT, '0.0.0.0', () => {
  console.log(`===============================================`);
  console.log(`🚀 Node.js Backend Server running on port ${PORT}`);
  console.log(`📍 Local URL:            http://localhost:${PORT}`);
  console.log(`📱 Android Emulator URL: http://10.0.2.2:${PORT}`);
  console.log(`===============================================`);
});
