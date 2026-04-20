/**
 * Supabase Authentication Middleware
 * 
 * Implements JWT token verification for protected routes.
 * Validates Supabase auth tokens and attaches user data to request.
 * 
 * Architecture:
 * - Verifies Supabase JWT tokens
 * - Fetches user profile from Supabase
 * - Checks user roles for authorization
 * - Supports admin/supervisor role checks
 */

import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config()

const supabaseUrl = process.env.VITE_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.warn('⚠️  Supabase credentials not configured. Auth middleware will fail.')
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

/**
 * Authenticate user with Supabase JWT token
 * Extracts token from Authorization header and verifies it
 * Attaches user data to req.user
 */
export async function authenticateUser(req, res, next) {
  try {
    // Extract token from Authorization header
    const authHeader = req.headers.authorization
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Authentication required' })
    }
    
    const token = authHeader.replace('Bearer ', '')
    
    // Verify token with Supabase
    const { data: { user }, error } = await supabase.auth.getUser(token)
    
    if (error || !user) {
      return res.status(401).json({ error: 'Invalid or expired token' })
    }
    
    // Fetch user profile to get role
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id, username, role, avatar_url')
      .eq('id', user.id)
      .single()
    
    if (profileError) {
      console.error('[Auth] Profile fetch error:', profileError)
      // Continue with basic user data if profile fetch fails
      req.user = {
        id: user.id,
        email: user.email,
        role: 'user' // Default role
      }
    } else {
      req.user = {
        id: user.id,
        email: user.email,
        username: profile.username,
        role: profile.role || 'user',
        avatar_url: profile.avatar_url
      }
    }
    
    next()
  } catch (error) {
    console.error('[Auth] Authentication error:', error)
    return res.status(500).json({ error: 'Authentication failed' })
  }
}

/**
 * Optional authentication - doesn't block if no token
 * Useful for endpoints that work for both authenticated and anonymous users
 */
export async function optionalAuth(req, res, next) {
  try {
    const authHeader = req.headers.authorization
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      req.user = null
      return next()
    }
    
    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error } = await supabase.auth.getUser(token)
    
    if (error || !user) {
      req.user = null
      return next()
    }
    
    // Fetch profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('id, username, role, avatar_url')
      .eq('id', user.id)
      .single()
    
    req.user = profile ? {
      id: user.id,
      email: user.email,
      username: profile.username,
      role: profile.role || 'user',
      avatar_url: profile.avatar_url
    } : {
      id: user.id,
      email: user.email,
      role: 'user'
    }
    
    next()
  } catch (error) {
    console.error('[Auth] Optional auth error:', error)
    req.user = null
    next()
  }
}

/**
 * Require admin or supervisor role
 * Must be used after authenticateUser middleware
 */
export function requireAdmin(req, res, next) {
  if (!req.user) {
    return res.status(401).json({ error: 'Authentication required' })
  }
  
  if (req.user.role !== 'admin' && req.user.role !== 'supervisor') {
    return res.status(403).json({ error: 'Admin or supervisor access required' })
  }
  
  next()
}

/**
 * Require specific role
 * Must be used after authenticateUser middleware
 */
export function requireRole(role) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' })
    }
    
    if (req.user.role !== role) {
      return res.status(403).json({ error: `${role} access required` })
    }
    
    next()
  }
}

export { supabase }
