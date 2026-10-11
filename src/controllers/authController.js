const { supabase } = require('../config/supabase');

/**
 * Handle User Signup
 * POST /api/auth/signup
 */
const signup = async (req, res) => {
  try {
    const { email, password, name } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email and password are required'
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 6 characters'
      });
    }

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: name || ''
        }
      }
    });

    if (error) {
      return res.status(400).json({
        success: false,
        message: error.message
      });
    }

    return res.status(201).json({
      success: true,
      message: 'Signup successful! If email confirmation is enabled on Supabase, please verify your email before logging in.',
      user: data.user,
      session: data.session
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: 'Server error during signup',
      error: err.message
    });
  }
};

/**
 * Handle User Login
 * POST /api/auth/login
 */
const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email and password are required'
      });
    }

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    if (error) {
      return res.status(400).json({
        success: false,
        message: error.message
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Login successful',
      token: data.session?.access_token,
      refreshToken: data.session?.refresh_token,
      user: {
        id: data.user.id,
        email: data.user.email,
        name: data.user.user_metadata?.full_name || ''
      }
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: 'Server error during login',
      error: err.message
    });
  }
};

/**
 * Get Authenticated User Profile
 * GET /api/auth/me
 */
const getProfile = async (req, res) => {
  try {
    // req.user is set by authMiddleware
    return res.status(200).json({
      success: true,
      user: req.user
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: 'Server error fetching profile',
      error: err.message
    });
  }
};

module.exports = {
  signup,
  login,
  getProfile
};
