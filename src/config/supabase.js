const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing SUPABASE_URL or SUPABASE_KEY in .env file!');
}

// Default Supabase client (uses publishable anon key)
const supabase = createClient(supabaseUrl, supabaseKey);

// Helper to create client with user JWT token (respects user-based RLS)
const getAuthenticatedClient = (token) => {
  if (!token) return supabase;
  return createClient(supabaseUrl, supabaseKey, {
    global: {
      headers: {
        Authorization: `Bearer ${token}`
      }
    }
  });
};

module.exports = {
  supabase,
  getAuthenticatedClient
};
