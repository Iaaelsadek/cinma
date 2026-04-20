/**
 * API Authentication Middleware
 * 
 * Feature #1: API_KEY Protection
 * Feature #6: Modular Auth (JWT-ready)
 */

import dotenv from 'dotenv';
dotenv.config();

const API_KEY = process.env.API_KEY || 'cinema-online-secret-key';

/**
 * Optional API Key Middleware
 * Checks for API key in header but doesn't block if missing
 */
export function optionalApiKey(req, res, next) {
  const apiKey = req.headers['x-api-key'];
  
  if (apiKey && apiKey !== API_KEY) {
    return res.status(401).json({ error: 'Invalid API key' });
  }
  
  // Mark request as authenticated if key is valid
  req.authenticated = apiKey === API_KEY;
  next();
}

/**
 * Required API Key Middleware
 * Blocks request if API key is missing or invalid
 */
export function requireApiKey(req, res, next) {
  const apiKey = req.headers['x-api-key'];
  
  if (!apiKey) {
    return res.status(401).json({ error: 'API key required' });
  }
  
  if (apiKey !== API_KEY) {
    return res.status(401).json({ error: 'Invalid API key' });
  }
  
  req.authenticated = true;
  next();
}

/**
 * JWT Authentication Middleware (Future)
 * Ready for Supabase JWT integration
 */
export async function requireJWT(req, res, next) {
  const token = req.headers.authorization?.replace('Bearer ', '');
  
  if (!token) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  
  try {
    // TODO: Verify JWT with Supabase
    // const { data, error } = await supabase.auth.getUser(token);
    // if (error) throw error;
    // req.user = data.user;
    
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Invalid token' });
  }
}

/**
 * Admin Role Middleware (Future)
 * Checks if user has admin role in Supabase profiles table
 */
export async function requireAdmin(req, res, next) {
  if (!req.user) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  
  try {
    // TODO: Check admin role in Supabase
    // const { data, error } = await supabase
    //   .from('profiles')
    //   .select('role')
    //   .eq('id', req.user.id)
    //   .single();
    // 
    // if (error || data.role !== 'admin') {
    //   return res.status(403).json({ error: 'Admin access required' });
    // }
    
    next();
  } catch (error) {
    return res.status(500).json({ error: 'Authorization check failed' });
  }
}
