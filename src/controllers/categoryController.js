const { supabase, getAuthenticatedClient } = require('../config/supabase');

/**
 * Get all categories with product counts (M:M relationship)
 * GET /api/categories
 */
const getCategories = async (req, res) => {
  try {
    const client = req.token ? getAuthenticatedClient(req.token) : supabase;

    // Try fetching with counts
    const { data, error } = await client
      .from('categories')
      .select('*, product_categories (count)')
      .order('name');

    if (error) {
      // If table doesn't exist yet, return empty list or fallback
      if (error.code === 'PGRST205') {
        return res.status(200).json({
          success: true,
          relational_mode: false,
          message: 'categories table not found. Please run schema_relationships.sql in Supabase SQL editor.',
          data: []
        });
      }
      return res.status(400).json({ success: false, message: error.message });
    }

    const formatted = (data || []).map((cat) => ({
      id: cat.id,
      name: cat.name,
      description: cat.description,
      color: cat.color,
      product_count: Array.isArray(cat.product_categories) && cat.product_categories.length > 0
        ? cat.product_categories[0]?.count || 0
        : 0
    }));

    return res.status(200).json({
      success: true,
      data: formatted
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: 'Server error fetching categories',
      error: err.message
    });
  }
};

/**
 * Create a new category
 * POST /api/categories
 * Body: { name: string, description?: string, color?: string }
 */
const createCategory = async (req, res) => {
  try {
    const { name, description, color } = req.body;

    if (!name || name.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Category name is required'
      });
    }

    const client = req.token ? getAuthenticatedClient(req.token) : supabase;

    const newCategory = {
      name: name.trim(),
      description: description ? description.trim() : '',
      color: color && color.trim().length > 0 ? color.trim() : '#2563EB'
    };

    const { data, error } = await client
      .from('categories')
      .insert([newCategory])
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
      message: 'Category created successfully',
      data
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: 'Server error creating category',
      error: err.message
    });
  }
};

module.exports = {
  getCategories,
  createCategory
};
