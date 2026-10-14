const { supabase, getAuthenticatedClient } = require('../config/supabase');

/**
 * Format raw Supabase product row with resolved relationships
 */
const formatProductResponse = (item) => {
  if (!item) return null;

  // Flatten categories from product_categories junction table
  let categories = [];
  if (Array.isArray(item.product_categories)) {
    categories = item.product_categories
      .map((pc) => pc.categories)
      .filter(Boolean);
  } else if (Array.isArray(item.categories)) {
    categories = item.categories;
  }

  // Handle 1:1 product_details (could be array or single object depending on query)
  let productDetails = null;
  if (Array.isArray(item.product_details)) {
    productDetails = item.product_details.length > 0 ? item.product_details[0] : null;
  } else if (item.product_details && typeof item.product_details === 'object') {
    productDetails = item.product_details;
  }

  // Handle 1:M reviews
  const reviews = Array.isArray(item.reviews)
    ? [...item.reviews].sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
    : [];

  const reviewCount = reviews.length;
  const averageRating = reviewCount > 0
    ? Number((reviews.reduce((sum, r) => sum + (Number(r.rating) || 0), 0) / reviewCount).toFixed(1))
    : 0;

  return {
    id: item.id,
    title: item.title,
    description: item.description,
    price: Number(item.price) || 0,
    image_url: item.image_url,
    created_at: item.created_at,
    product_details: productDetails, // 1:1
    reviews: reviews,                // 1:M
    review_count: reviewCount,
    average_rating: averageRating,
    categories: categories           // M:M
  };
};

/**
 * Get all products with relational data (1:1 specs, 1:M reviews count, M:M categories)
 * Optional query param: ?category_id=...
 * GET /api/products
 */
const getProducts = async (req, res) => {
  try {
    const client = req.token ? getAuthenticatedClient(req.token) : supabase;
    const { category_id } = req.query;

    // First attempt full relational select
    try {
      let query = client
        .from('products')
        .select(`
          *,
          product_details (*),
          reviews (*),
          product_categories (
            category_id,
            categories (*)
          )
        `)
        .order('created_at', { ascending: false });

      const { data, error } = await query;

      if (!error && data) {
        let formatted = data.map(formatProductResponse);

        // Filter by category_id if requested
        if (category_id) {
          const targetCatId = Number(category_id);
          formatted = formatted.filter((p) =>
            p.categories.some((c) => Number(c.id) === targetCatId)
          );
        }

        return res.status(200).json({
          success: true,
          relational_mode: true,
          count: formatted.length,
          data: formatted
        });
      }

      // If error indicates relational tables not created yet (PGRST200 / PGRST205)
      if (error && (error.code === 'PGRST200' || error.code === 'PGRST205')) {
        console.warn('Relational tables not found in schema cache. Falling back to simple products.');
      } else if (error) {
        throw error;
      }
    } catch (relError) {
      console.warn('Relational query error, falling back:', relError.message);
    }

    // Fallback: simple products query if relationship tables haven't been created yet
    const { data: simpleData, error: simpleError } = await client
      .from('products')
      .select('*')
      .order('created_at', { ascending: false });

    if (simpleError) {
      return res.status(400).json({
        success: false,
        message: simpleError.message
      });
    }

    return res.status(200).json({
      success: true,
      relational_mode: false,
      message: 'Running in simple mode. Execute schema_relationships.sql in Supabase to enable 1:1, 1:M and M:M relationships.',
      count: (simpleData || []).length,
      data: (simpleData || []).map(formatProductResponse)
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
 * Get single product by ID with full details (1:1 specs, 1:M reviews, M:M categories)
 * GET /api/products/:id
 */
const getProductById = async (req, res) => {
  try {
    const { id } = req.params;
    const client = req.token ? getAuthenticatedClient(req.token) : supabase;

    try {
      const { data, error } = await client
        .from('products')
        .select(`
          *,
          product_details (*),
          reviews (*),
          product_categories (
            category_id,
            categories (*)
          )
        `)
        .eq('id', id)
        .single();

      if (!error && data) {
        return res.status(200).json({
          success: true,
          data: formatProductResponse(data)
        });
      }

      if (error && (error.code === 'PGRST200' || error.code === 'PGRST205')) {
        // Fallback to simple
      } else if (error) {
        return res.status(404).json({
          success: false,
          message: `Product with ID ${id} not found: ${error.message}`
        });
      }
    } catch (relError) {
      console.warn('Relational single product query error, falling back:', relError.message);
    }

    // Fallback: simple query
    const { data: simpleData, error: simpleError } = await client
      .from('products')
      .select('*')
      .eq('id', id)
      .single();

    if (simpleError || !simpleData) {
      return res.status(404).json({
        success: false,
        message: `Product with ID ${id} not found`
      });
    }

    return res.status(200).json({
      success: true,
      data: formatProductResponse(simpleData)
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: 'Server error fetching product details',
      error: err.message
    });
  }
};

/**
 * Create a new product with optional 1:1 details and M:M categories
 * POST /api/products
 * Body:
 * {
 *   title: string,
 *   description: string,
 *   price: number,
 *   image_url?: string,
 *   product_details?: { sku, warranty_months, manufacturer, weight_kg, dimensions, origin_country },
 *   category_ids?: number[]
 * }
 */
const createProduct = async (req, res) => {
  try {
    const { title, description, price, image_url, product_details, category_ids } = req.body;

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

    const client = req.token ? getAuthenticatedClient(req.token) : supabase;

    const newProduct = {
      title: title.trim(),
      description: description ? description.trim() : '',
      price: parsedPrice,
      image_url: image_url && image_url.trim().length > 0
        ? image_url.trim()
        : 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=600&auto=format&fit=crop&q=80'
    };

    // 1. Insert Base Product
    const { data: createdProduct, error: productError } = await client
      .from('products')
      .insert([newProduct])
      .select()
      .single();

    if (productError || !createdProduct) {
      return res.status(400).json({
        success: false,
        message: productError ? productError.message : 'Failed to create product'
      });
    }

    const productId = createdProduct.id;
    let savedDetails = null;
    let savedCategories = [];

    // 2. Insert 1:1 Product Details if provided
    if (product_details && typeof product_details === 'object') {
      try {
        const detailsPayload = {
          product_id: productId,
          sku: product_details.sku?.trim() || `SKU-${Date.now().toString().slice(-6)}`,
          warranty_months: parseInt(product_details.warranty_months, 10) || 12,
          manufacturer: product_details.manufacturer?.trim() || 'General Manufacturer',
          weight_kg: parseFloat(product_details.weight_kg) || 0.5,
          dimensions: product_details.dimensions?.trim() || 'Standard size',
          origin_country: product_details.origin_country?.trim() || 'United States'
        };

        const { data: detailsData, error: detailsError } = await client
          .from('product_details')
          .insert([detailsPayload])
          .select()
          .single();

        if (!detailsError) {
          savedDetails = detailsData;
        } else {
          console.warn('Could not insert 1:1 product_details:', detailsError.message);
        }
      } catch (err) {
        console.warn('Error saving 1:1 product details:', err.message);
      }
    }

    // 3. Link M:M Categories via product_categories junction table
    if (Array.isArray(category_ids) && category_ids.length > 0) {
      try {
        const junctionRows = category_ids.map((catId) => ({
          product_id: productId,
          category_id: Number(catId)
        }));

        const { error: junctionError } = await client
          .from('product_categories')
          .insert(junctionRows);

        if (!junctionError) {
          // Fetch resolved categories
          const { data: catList } = await client
            .from('categories')
            .select('*')
            .in('id', category_ids);
          savedCategories = catList || [];
        } else {
          console.warn('Could not insert M:M product_categories:', junctionError.message);
        }
      } catch (err) {
        console.warn('Error linking M:M categories:', err.message);
      }
    }

    const finalResponse = {
      ...createdProduct,
      product_details: savedDetails,
      reviews: [],
      review_count: 0,
      average_rating: 0,
      categories: savedCategories
    };

    return res.status(201).json({
      success: true,
      message: 'Product created successfully with relationships',
      data: formatProductResponse(finalResponse)
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: 'Server error creating product',
      error: err.message
    });
  }
};

/**
 * Add a 1:M review to a product
 * POST /api/products/:id/reviews
 * Body: { user_name: string, rating: number (1-5), comment: string }
 */
const addProductReview = async (req, res) => {
  try {
    const { id } = req.params;
    const { user_name, rating, comment } = req.body;

    if (!user_name || rating === undefined || !comment) {
      return res.status(400).json({
        success: false,
        message: 'user_name, rating (1-5), and comment are required'
      });
    }

    const parsedRating = parseInt(rating, 10);
    if (isNaN(parsedRating) || parsedRating < 1 || parsedRating > 5) {
      return res.status(400).json({
        success: false,
        message: 'Rating must be an integer between 1 and 5'
      });
    }

    const client = req.token ? getAuthenticatedClient(req.token) : supabase;

    const newReview = {
      product_id: Number(id),
      user_name: user_name.trim(),
      rating: parsedRating,
      comment: comment.trim()
    };

    const { data, error } = await client
      .from('reviews')
      .insert([newReview])
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
      message: 'Review posted successfully (1:M relationship created)',
      data
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: 'Server error adding product review',
      error: err.message
    });
  }
};

module.exports = {
  getProducts,
  getProductById,
  createProduct,
  addProductReview
};
