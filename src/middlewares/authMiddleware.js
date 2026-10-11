const { supabase } = require('../config/supabase');

/**
 * Middleware to authenticate requests using Supabase JWT
 */
const requireAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'No authorization token provided'
      });
    }

    const token = authHeader.split(' ')[1];
    const { data, error } = await supabase.auth.getUser(token);

    if (error || !data.user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid or expired token',
        error: error?.message
      });
    }

    // Attach user and raw token to request object
    req.user = data.user;
    req.token = token;
    next();
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: 'Failed to authenticate token',
      error: err.message
    });
  }
};

module.exports = { requireAuth };
