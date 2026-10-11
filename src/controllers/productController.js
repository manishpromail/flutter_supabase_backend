const { supabase, getAuthenticatedClient } = require('../config/supabase');

/**
 * Get all products
 * GET /api/products
 */
const getProducts = async (req, res) => {
  try {
    // If request has auth token, use authenticated client (respects RLS)
    const client = req.token ? getAuthenticatedClient(req.token) : supabase;

    const { data, error } = await client
      .from('products')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      return res.status(400).json({
        success: false,
        message: error.message
      });
    }

    return res.status(200).json({
      success: true,
      data: data || []
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: 'Server error fetching products',
      error: err.message
    });
  }
};

/**
 * Create a new product
 * POST /api/products
 */
const createProduct = async (req, res) => {
  try {
    const { title, description, price, image_url } = req.body;

    if (!title || price === undefined || price === null) {
      return res.status(400).json({
        success: false,
        message: 'Title and price are required'
      });
    }

    const parsedPrice = parseFloat(price);
    if (isNaN(parsedPrice) || parsedPrice < 0) {
      return res.status(400).json({
        success: false,
        message: 'Price must be a valid positive number'
      });
    }

    // Use authenticated client if token is present
    const client = req.token ? getAuthenticatedClient(req.token) : supabase;

    const newProduct = {
      title: title.trim(),
      description: description ? description.trim() : '',
      price: parsedPrice,
      image_url: image_url && image_url.trim().length > 0
        ? image_url.trim()
        : 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=600&auto=format&fit=crop&q=80'
    };

    const { data, error } = await client
      .from('products')
      .insert([newProduct])
      .select()
      .single();

    if (error) {
      return res.status(400).json({
        success: false,
        message: error.message
      });
    }

    return res.status(201).json({
      success: true,
      message: 'Product created successfully',
      data
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: 'Server error creating product',
      error: err.message
    });
  }
};

module.exports = {
  getProducts,
  createProduct
};
