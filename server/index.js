import express from 'express';
import cors from 'cors';
import axios from 'axios';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { spawn, exec } from 'child_process';
import fs from 'fs/promises';
import path from 'path';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load env vars
dotenv.config({ path: path.join(__dirname, '../.env') });

const app = express();
const port = 3001;
const allowedOrigins = (process.env.WEB_ORIGIN || '').split(',').map((s) => s.trim()).filter(Boolean);
const regularLimiter = rateLimit({ windowMs: 60 * 1000, max: 100, standardHeaders: true, legacyHeaders: false });
const sensitiveLimiter = rateLimit({ windowMs: 60 * 1000, max: 20, standardHeaders: true, legacyHeaders: false });
const pythonBin = process.env.PYTHON_BIN || 'python';
const adminToken = process.env.ADMIN_SYNC_TOKEN || '';
const adminIpAllowlist = (process.env.ADMIN_IP_ALLOWLIST || '')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);
const adminTokenMinLength = 32;

// Supabase Admin Client
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = (supabaseUrl && supabaseServiceKey) 
  ? createClient(supabaseUrl, supabaseServiceKey) 
  : null;

let lastSyncAt = null;
let lastSyncStatus = 'idle';
let lastSyncLogs = [];

app.set('trust proxy', 1);
app.use(cors({
  origin: allowedOrigins.length ? allowedOrigins : true,
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-admin-token'],
  maxAge: 86400
}));
app.use(express.json({ limit: '50mb' })); // Increased limit for file saves
app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginEmbedderPolicy: false,
}));

// Strong CSP tailored for SPA + external APIs
app.use((req, res, next) => {
  const csp = [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' https://fonts.gstatic.com data:",
    "img-src 'self' https://image.tmdb.org data: blob: https:",
    "media-src 'self' https: data:",
    "connect-src 'self' https: wss:",
    "frame-src 'self' https:",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'self'",
    "upgrade-insecure-requests",
  ].join('; ');
  res.setHeader('Content-Security-Policy', csp);
  next();
});

function isPrivateHost(hostname) {
  if (!hostname) return true;
  const host = hostname.toLowerCase();
  if (host === 'localhost' || host === '::1' || host.endsWith('.local')) return true;
  if (/^\d+\.\d+\.\d+\.\d+$/.test(host)) {
    const [a, b] = host.split('.').map((n) => Number(n));
    if (a === 10 || a === 127 || a === 0) return true;
    if (a === 169 && b === 254) return true;
    if (a === 192 && b === 168) return true;
    if (a === 172 && b >= 16 && b <= 31) return true;
  }
  return false;
}

function ensureAdminToken(req, res) {
  // Fail hard if token is not set or too weak
  if (!adminToken || adminToken.trim() === '' || adminToken.trim().length < adminTokenMinLength) {
    console.error('[SECURITY] ADMIN_SYNC_TOKEN is missing or too short. Rejecting admin request.');
    res.status(500).json({ error: 'Server security misconfiguration' });
    return false;
  }
  
  const token = String(req.headers['x-admin-token'] || '');
  if (token && token === adminToken) return true;
  
  console.warn(`[SECURITY] Invalid admin token attempt from ${req.ip}`);
  res.status(401).json({ error: 'unauthorized' });
  return false;
}

function ensureAdminIpAllowed(req, res) {
  const ip = req.ip || req.connection?.remoteAddress || '';
  const normalizedIp = (ip || '').replace('::ffff:', '');

  // Always allow localhost-style addresses for local dev
  const isLocal =
    normalizedIp === '127.0.0.1' ||
    normalizedIp === '::1' ||
    normalizedIp === '' ||
    normalizedIp === '::ffff:127.0.0.1';

  if (isLocal && adminIpAllowlist.length === 0) {
    return true;
  }

  if (adminIpAllowlist.length === 0) {
    console.error('[SECURITY] ADMIN_IP_ALLOWLIST is empty. Rejecting non-local admin request.');
    res.status(500).json({ error: 'Server security misconfiguration (admin IP allowlist empty)' });
    return false;
  }

  if (adminIpAllowlist.includes(normalizedIp)) {
    return true;
  }

  console.warn(`[SECURITY] Admin access denied for IP ${normalizedIp}`);
  res.status(403).json({ error: 'admin_ip_not_allowed' });
  return false;
}

async function getAuthContext(req) {
  if (!supabase) {
    return { ok: false, status: 500, error: 'Supabase not configured' };
  }
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return { ok: false, status: 401, error: 'Missing token' };
  }
  const token = authHeader.replace('Bearer ', '');
  const { data: { user }, error: userError } = await supabase.auth.getUser(token);
  if (userError || !user) {
    return { ok: false, status: 401, error: 'Invalid token' };
  }
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('role,banned')
    .eq('id', user.id)
    .maybeSingle();
  if (profileError || !profile) {
    return { ok: false, status: 403, error: 'Profile not found' };
  }
  if (profile.banned) {
    return { ok: false, status: 403, error: 'User is banned' };
  }
  return { ok: true, user, profile };
}

async function ensureAdminJwtRole(req, res, allowedRoles = ['admin', 'supervisor']) {
  const ctx = await getAuthContext(req);
  if (!ctx.ok) {
    res.status(ctx.status).json({ error: ctx.error });
    return false;
  }
  if (!allowedRoles.includes(ctx.profile.role)) {
    res.status(403).json({ error: 'Admin access required' });
    return false;
  }
  req.authUser = ctx.user;
  req.authProfile = ctx.profile;
  return true;
}

async function ensureSelfOrAdmin(req, res, targetUserId) {
  const ctx = await getAuthContext(req);
  if (!ctx.ok) {
    res.status(ctx.status).json({ error: ctx.error });
    return false;
  }
  const isSelf = ctx.user.id === targetUserId;
  const isAdmin = ['admin', 'supervisor'].includes(ctx.profile.role);
  if (!isSelf && !isAdmin) {
    res.status(403).json({ error: 'Access denied' });
    return false;
  }
  req.authUser = ctx.user;
  req.authProfile = ctx.profile;
  return true;
}

function runPythonScript(scriptPath) {
  return new Promise((resolve, reject) => {
    // Use the venv python if available
    const venvPython = process.platform === 'win32' ? '.venv\\Scripts\\python.exe' : '.venv/bin/python';
    const py = fs.access(venvPython).then(() => venvPython).catch(() => pythonBin);
    
    // For simplicity, just try to use the one provided or fallback
    // Actually, we should try to use the absolute path if possible
    const cmd = process.platform === 'win32' && fs.stat(path.resolve(process.cwd(), '.venv/Scripts/python.exe')).catch(()=>false) 
        ? '.venv\\Scripts\\python.exe' 
        : pythonBin;

    const child = spawn(cmd, [scriptPath], { cwd: process.cwd(), shell: true });
    const logs = [];
    child.stdout.on('data', (data) => logs.push(String(data)));
    child.stderr.on('data', (data) => logs.push(String(data)));
    child.on('error', (err) => reject(err));
    child.on('close', (code) => resolve({ code, logs }));
  });
}

// --- GOD MODE ENDPOINTS ---

// 1. System Shell Execution (DISABLED FOR SECURITY)
// This endpoint previously allowed running whitelisted shell commands via HTTP.
// It is now fully disabled to eliminate remote code execution risk from this process.
// If you absolutely need it for a locked-down ops environment, re-enable carefully
// and ensure strict network isolation, IP allowlist, and secret management.
/*
app.post('/api/admin/exec', sensitiveLimiter, async (req, res) => {
  if (!ensureAdminIpAllowed(req, res)) return;
  if (!ensureAdminToken(req, res)) return;
  const { command, cwd } = req.body;
  if (!command) return res.status(400).json({ error: 'Command required' });

  const ALLOWED_COMMANDS = [
    'npm run import:content',
    'npm run import:content --',
    'python backend/mass_content_importer.py',
    '.\\.venv\\Scripts\\python.exe backend\\mass_content_importer.py'
  ];

  const isAllowed = ALLOWED_COMMANDS.some((allowed) =>
    command === allowed || command.startsWith(allowed + ' ')
  );

  if (!isAllowed) {
    console.warn(`[BLOCKED] Attempted to run unauthorized command: ${command}`);
    return res.status(403).json({ error: 'Command not allowed for security reasons.' });
  }

  console.log(`[EXEC] ${command}`);

  exec(command, { cwd: cwd || process.cwd() }, (error, stdout, stderr) => {
    if (error) {
      return res.status(500).json({ error: error.message, stderr });
    }
    res.json({ stdout, stderr });
  });
});
*/

// --- NEW ENDPOINT TO BYPASS RLS RECURSION ---
app.get('/api/profile/:id', async (req, res) => {
  const { id } = req.params;
  if (!supabase) return res.status(500).json({ error: 'Supabase not configured' });
  const allowed = await ensureSelfOrAdmin(req, res, id);
  if (!allowed) return;

  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('id, username, avatar_url, role')
      .eq('id', id)
      .maybeSingle();
      
    if (error) throw error;
    return res.json(data || null);
  } catch (err) {
    console.error('Profile fetch error:', err);
    return res.status(500).json({ error: err.message });
  }
});

// --- NEW ENDPOINT FOR ERROR LOGGING (SECURED & RATE LIMITED) ---
app.post('/api/log', regularLimiter, async (req, res) => {
  const { message, severity, category, context, stack, url, user_agent, user_id } = req.body;
  
  if (!supabase) {
    console.error('Supabase not configured for logging');
    return res.status(500).json({ error: 'Server logging unavailable' });
  }

  try {
    // Validate required fields
    if (!message || !severity || !category) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Insert into app_diagnostics using service_role key (admin privileges)
    // This allows us to disable public INSERT RLS on the table
    const { error } = await supabase
      .from('app_diagnostics')
      .insert({
        message,
        severity,
        category,
        context,
        stack,
        url,
        user_agent,
        user_id: user_id || null, // Optional user linking
        resolved: false,
        timestamp: new Date().toISOString()
      });

    if (error) {
      console.error('Supabase log insert error:', error);
      throw error;
    }

    res.json({ success: true });
  } catch (err) {
    console.error('Logging endpoint error:', err);
    // Don't expose internal errors to client for logs
    res.status(500).json({ error: 'Logging failed' });
  }
});

app.post('/api/profile/:id', async (req, res) => {
  const { id } = req.params;
  const { username, avatar_url } = req.body;
  if (!supabase) return res.status(500).json({ error: 'Supabase not configured' });
  const allowed = await ensureSelfOrAdmin(req, res, id);
  if (!allowed) return;

  try {
    const updates = {};
    if (username !== undefined) updates.username = username;
    if (avatar_url !== undefined) updates.avatar_url = avatar_url;
    
    const { error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', id);
      
    if (error) throw error;
    return res.json({ success: true });
  } catch (err) {
    console.error('Profile update error:', err);
    return res.status(500).json({ error: err.message });
  }
});

app.post('/api/profile/:id/role', async (req, res) => {
  const { id } = req.params;
  const { role } = req.body;
  if (!supabase) return res.status(500).json({ error: 'Supabase not configured' });
  const allowed = await ensureAdminJwtRole(req, res, ['admin']);
  if (!allowed) return;
  if (!['user', 'admin', 'supervisor'].includes(role)) {
    return res.status(400).json({ error: 'Invalid role' });
  }

  try {
    const { error } = await supabase.from('profiles').update({ role }).eq('id', id);
    if (error) throw error;
    return res.json({ success: true });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

app.post('/api/profile/:id/ban', async (req, res) => {
  const { id } = req.params;
  const { banned } = req.body;
  if (!supabase) return res.status(500).json({ error: 'Supabase not configured' });
  const allowed = await ensureAdminJwtRole(req, res, ['admin']);
  if (!allowed) return;
  if (typeof banned !== 'boolean') {
    return res.status(400).json({ error: 'Invalid banned value' });
  }

  try {
    const { error } = await supabase.from('profiles').update({ banned }).eq('id', id);
    if (error) throw error;
    return res.json({ success: true });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// --- GENERIC ADMIN PROXY ---
// Helper: ensure caller is admin (using service role check)
async function ensureAdmin(req, res) {
  return ensureAdminJwtRole(req, res, ['admin', 'supervisor']);
}

// Admin proxy endpoints with role checking
app.get('/api/admin/proxy/:table', async (req, res) => {
  // Check admin access first
  const isAdmin = await ensureAdmin(req, res);
  if (isAdmin !== true) return; // Response already sent
  
  if (!supabase) return res.status(500).json({ error: 'Supabase not configured' });
  const { table } = req.params;
  const { select, order, orderAsc, eq, limit } = req.query;
  
  // Security: Restrict access to sensitive tables
  const restrictedTables = ['auth.users', 'auth.identities', 'storage.objects'];
  if (restrictedTables.includes(table)) {
    return res.status(403).json({ error: 'Access to this table is restricted' });
  }
  
  try {
    let q = supabase.from(table).select(select || '*');
    
    if (order) {
      q = q.order(order, { ascending: orderAsc === 'true' });
    }
    if (limit) {
      q = q.limit(Number(limit));
    }
    if (eq) {
      // Expect eq to be JSON string { col: val }
      try {
        const filters = JSON.parse(eq);
        for (const [k, v] of Object.entries(filters)) {
          q = q.eq(k, v);
        }
      } catch (e) {}
    }
    
    const { data, error } = await q;
    if (error) throw error;
    return res.json(data || []);
  } catch (err) {
    console.error(`Proxy list ${table} error:`, err);
    return res.status(500).json({ error: err.message });
  }
});

app.post('/api/admin/proxy/:table', async (req, res) => {
  // Check admin access first
  const isAdmin = await ensureAdmin(req, res);
  if (isAdmin !== true) return; // Response already sent
  
  if (!supabase) return res.status(500).json({ error: 'Supabase not configured' });
  const { table } = req.params;
  const body = req.body;
  
  // Security: Restrict access to sensitive tables
  const restrictedTables = ['auth.users', 'auth.identities', 'storage.objects'];
  if (restrictedTables.includes(table)) {
    return res.status(403).json({ error: 'Access to this table is restricted' });
  }
  
  try {
    const { data, error } = await supabase.from(table).insert(body).select().single();
    if (error) throw error;
    return res.json(data);
  } catch (err) {
    console.error(`Proxy insert ${table} error:`, err);
    return res.status(500).json({ error: err.message });
  }
});

app.put('/api/admin/proxy/:table/:id', async (req, res) => {
  // Check admin access first
  const isAdmin = await ensureAdmin(req, res);
  if (isAdmin !== true) return; // Response already sent
  
  if (!supabase) return res.status(500).json({ error: 'Supabase not configured' });
  const { table, id } = req.params;
  const body = req.body;
  
  // Security: Restrict access to sensitive tables
  const restrictedTables = ['auth.users', 'auth.identities', 'storage.objects'];
  if (restrictedTables.includes(table)) {
    return res.status(403).json({ error: 'Access to this table is restricted' });
  }
  
  try {
    const { data, error } = await supabase.from(table).update(body).eq('id', id).select().single();
    if (error) throw error;
    return res.json(data);
  } catch (err) {
    console.error(`Proxy update ${table} error:`, err);
    return res.status(500).json({ error: err.message });
  }
});

app.delete('/api/admin/proxy/:table/:id', async (req, res) => {
  // Check admin access first
  const isAdmin = await ensureAdmin(req, res);
  if (isAdmin !== true) return; // Response already sent
  
  if (!supabase) return res.status(500).json({ error: 'Supabase not configured' });
  const { table, id } = req.params;
  
  // Security: Restrict access to sensitive tables
  const restrictedTables = ['auth.users', 'auth.identities', 'storage.objects'];
  if (restrictedTables.includes(table)) {
    return res.status(403).json({ error: 'Access to this table is restricted' });
  }
  
  try {
    const { error } = await supabase.from(table).delete().eq('id', id);
    if (error) throw error;
    return res.json({ success: true });
  } catch (err) {
    console.error(`Proxy delete ${table} error:`, err);
    return res.status(500).json({ error: err.message });
  }
});

// 2. File System Manager (READ-ONLY LISTING, WRITE DISABLED BY DEFAULT)
app.get('/api/admin/fs', sensitiveLimiter, async (req, res) => {
  if (!ensureAdminIpAllowed(req, res)) return;
  if (!ensureAdminToken(req, res)) return;
  const targetPath = path.resolve(process.cwd(), req.query.path || '.');
  
  // Security: Prevent accessing outside project
  if (!targetPath.startsWith(process.cwd())) {
    return res.status(403).json({ error: 'Access denied' });
  }

  try {
    const stats = await fs.stat(targetPath);
    if (stats.isDirectory()) {
      const files = await fs.readdir(targetPath, { withFileTypes: true });
      const result = files.map(f => ({
        name: f.name,
        type: f.isDirectory() ? 'dir' : 'file',
        path: path.relative(process.cwd(), path.join(targetPath, f.name))
      }));
      res.json({ type: 'dir', content: result, path: path.relative(process.cwd(), targetPath) });
    } else {
      // File content reads are disabled by default for security reasons.
      // You may re-enable controlled reads if required for ops, but be aware
      // this can expose source code and secrets if misconfigured.
      res.status(403).json({ error: 'file_read_disabled_for_security' });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Remote write endpoint disabled completely; use a dedicated hardened ops channel instead.
// app.post('/api/admin/fs', sensitiveLimiter, async (req, res) => { ... });

// 3. Database Manager (SQL Runner)
app.post('/api/admin/sql', sensitiveLimiter, async (req, res) => {
  if (!ensureAdminIpAllowed(req, res)) return;
  if (!ensureAdminToken(req, res)) return;
  return res.status(403).json({ error: 'sql_endpoint_disabled' });
});

// 4. Admin Claim (Initial Setup)
app.post('/api/admin/claim', sensitiveLimiter, async (req, res) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Missing token' });
  
  if (!supabase) return res.status(503).json({ error: 'Supabase not configured' });

  try {
    const { data: { user }, error } = await supabase.auth.getUser(token);
    if (error || !user) return res.status(401).json({ error: 'Invalid token' });

    // Check existing admins
    const { count, error: countErr } = await supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true })
      .eq('role', 'admin');
    
    if (countErr) throw countErr;

    if (count > 0) {
       // If admins exist, check if THIS user is already admin
       const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
       if (profile?.role === 'admin') {
         return res.json({ success: true, message: 'Already admin' });
       }
       return res.status(403).json({ error: 'Admin already exists. Contact support.' });
    }

    // Promote user
    const { error: updateErr } = await supabase
      .from('profiles')
      .update({ role: 'admin' })
      .eq('id', user.id);
      
    if (updateErr) throw updateErr;

    res.json({ success: true, message: 'Promoted to Admin' });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- ORIGINAL ENDPOINTS ---

app.post('/api/gemini-summary', sensitiveLimiter, async (req, res) => {
  const { title, overview } = req.body || {};
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return res.status(503).json({ error: 'gemini_unconfigured' });
  }
  if (!title || !overview) {
    return res.status(400).json({ error: 'missing_input' });
  }
  const prompt = [
    'لخص هذا الفيلم في 3 جمل عربية قصيرة ومباشرة.',
    `العنوان: ${title}`,
    `الوصف: ${overview}`
  ].join('\n');
  try {
    const response = await axios.post(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
      {
        contents: [{ role: 'user', parts: [{ text: prompt }] }]
      },
      { timeout: 15000 }
    );
    const summary = response?.data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
    return res.json({ summary: String(summary).trim() });
  } catch (error) {
    return res.status(502).json({ error: 'gemini_error' });
  }
});

app.post('/api/gemini-recommendations', sensitiveLimiter, async (req, res) => {
  const { genres } = req.body || {};
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return res.status(503).json({ error: 'gemini_unconfigured' });
  }
  if (!Array.isArray(genres) || genres.length === 0) {
    return res.status(400).json({ error: 'missing_genres' });
  }
  const prompt = [
    'اقترح 5 عناوين أفلام أو مسلسلات قد تعجب المستخدم العربي بناءً على هذه التصنيفات:',
    genres.join(', '),
    'أعد العناوين كسطور منفصلة فقط دون شرح.'
  ].join('\n');
  try {
    const response = await axios.post(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-pro:generateContent?key=${apiKey}`,
      { contents: [{ role: 'user', parts: [{ text: prompt }] }] },
      { timeout: 15000 }
    );
    const titles = response?.data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
    return res.json({ titles: String(titles).trim() });
  } catch (error) {
    return res.status(502).json({ error: 'gemini_error' });
  }
});

app.get('/api/check-link', sensitiveLimiter, async (req, res) => {
  const { url } = req.query;

  if (!url) {
    return res.status(400).json({ error: 'URL is required' });
  }

  try {
    const rawUrl = Array.isArray(url) ? url[0] : url;
    const parsed = new URL(String(rawUrl));
    if (!['http:', 'https:'].includes(parsed.protocol)) {
      return res.status(400).json({ error: 'invalid_protocol' });
    }
    if (isPrivateHost(parsed.hostname)) {
      return res.status(400).json({ error: 'blocked_host' });
    }
    const start = Date.now();
    // Use HEAD request to check if link is valid without downloading body
    // Some servers block HEAD, so we fallback to GET with range
    let response;
    try {
        response = await axios.head(parsed.toString(), { 
          timeout: 5000,
          validateStatus: (status) => status < 400 
        });
    } catch (headError) {
        response = await axios.get(parsed.toString(), {
            headers: { Range: 'bytes=0-0' },
            timeout: 5000,
            validateStatus: (status) => status < 400
        });
    }

    const duration = Date.now() - start;

    res.json({
      valid: true,
      responseTime: duration,
      status: response.status
    });
  } catch (error) {
    // console.error(`Error checking link ${url}:`, error.message);
    res.json({
      valid: false,
      error: error.message
    });
  }
});

// --- HOME & CONTINUE-WATCHING AGGREGATION ENDPOINTS ---

// Simple in-memory cache for hot aggregation endpoints
const memoryCache = new Map();

function getCache(key) {
  const entry = memoryCache.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    memoryCache.delete(key);
    return null;
  }
  return entry.value;
}

function setCache(key, value, ttlMs) {
  memoryCache.set(key, { value, expiresAt: Date.now() + ttlMs });
}

async function tmdbGet(path, params = {}) {
  const apiKey = process.env.TMDB_API_KEY;
  if (!apiKey) {
    throw new Error('TMDB_API_KEY not configured on server');
  }

  const url = `https://api.themoviedb.org/3/${path}`;
  const { data } = await axios.get(url, {
    params: { api_key: apiKey, language: 'ar-SA', ...params },
    timeout: 15000,
    headers: {
      Accept: 'application/json',
      'User-Agent': 'CinemaOnline/1.0',
    },
  });
  return data;
}

app.get('/api/home', regularLimiter, async (req, res) => {
  try {
    const lang = req.query.lang === 'en' ? 'en-US' : 'ar-SA';
    const cacheKey = `home:${lang}`;
    const cached = getCache(cacheKey);
    if (cached) {
      return res.json(cached);
    }

    const [trending, popularMovies, topRatedMovies] = await Promise.all([
      tmdbGet('trending/movie/week', { language: lang }),
      tmdbGet('movie/popular', { language: lang, page: 1 }),
      tmdbGet('movie/top_rated', { language: lang, page: 1 }),
    ]);

    let mvTrending = null;
    if (supabase) {
      try {
        const { data, error } = await supabase
          .from('mv_home_trending')
          .select('*')
          .limit(30);
        if (!error) mvTrending = data || null;
      } catch {
        mvTrending = null;
      }
    }

    const payload = {
      tmdb: {
        trending,
        popularMovies,
        topRatedMovies,
      },
      supabase: {
        mvTrending,
      },
    };

    // Cache for 90 seconds to reduce TMDB load
    setCache(cacheKey, payload, 90 * 1000);
    res.json(payload);
  } catch (error) {
    console.error('/api/home error:', error?.message || error);
    res.status(502).json({ error: 'home_aggregation_failed' });
  }
});

app.get('/api/continue-watching', regularLimiter, async (req, res) => {
  if (!supabase) {
    return res.status(500).json({ error: 'Supabase not configured' });
  }

  try {
    const ctx = await getAuthContext(req);
    if (!ctx.ok) {
      return res.status(ctx.status).json({ error: ctx.error });
    }
    const userId = ctx.user.id;

    const { data: rows, error } = await supabase
      .from('continue_watching')
      .select('id, content_id, content_type, season, episode, progress, duration, updated_at')
      .eq('user_id', userId)
      .order('updated_at', { ascending: false })
      .limit(12);

    if (error) throw error;

    const movies = rows.filter((r) => r.content_type === 'movie');
    const tv = rows.filter((r) => r.content_type === 'tv');

    const movieIds = [...new Set(movies.map((r) => r.content_id))].filter(Boolean);
    const tvIds = [...new Set(tv.map((r) => r.content_id))].filter(Boolean);

    const lang = req.query.lang === 'en' ? 'en-US' : 'ar-SA';

    const cacheKey = `cw:${userId}:${lang}`;
    const cached = getCache(cacheKey);
    if (cached) {
      return res.json(cached);
    }

    async function fetchMany(ids, type) {
      const safeIds = [...new Set(ids)].filter(Boolean);
      if (!safeIds.length) return [];
      const results = await Promise.all(
        safeIds.map(async (id) => {
          try {
            return await tmdbGet(`${type}/${id}`, { language: lang });
          } catch (e) {
            console.warn(`TMDB ${type}/${id} failed:`, e?.message || e);
            return null;
          }
        })
      );
      return results.filter(Boolean);
    }

    const [moviesMeta, tvMeta] = await Promise.all([
      fetchMany(movieIds, 'movie'),
      fetchMany(tvIds, 'tv'),
    ]);

    const movieMap = new Map(moviesMeta.map((m) => [String(m.id), m]));
    const tvMap = new Map(tvMeta.map((m) => [String(m.id), m]));

    const enriched = rows.map((row) => {
      const key = String(row.content_id);
      const base =
        row.content_type === 'movie' ? movieMap.get(key) : tvMap.get(key);
      const meta = base
        ? {
            id: base.id,
            poster_path: base.poster_path,
            title: base.title,
            name: base.name,
            vote_average: base.vote_average,
          }
        : null;
      return { ...row, meta };
    });

    const payload = { items: enriched };
    // Cache per-user continue watching for 60 seconds
    setCache(cacheKey, payload, 60 * 1000);
    res.json(payload);
  } catch (error) {
    console.error('/api/continue-watching error:', error?.message || error);
    res.status(502).json({ error: 'continue_watching_failed' });
  }
});

app.get('/api/radio/cairo', regularLimiter, async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');

  const candidates = [
    'https://n09.radiojar.com/8s5u5tpdtwzuv?rj-ttl=5&rj-tok=AAABnL1sTdIAdrvVVnc42TdU_Q',
    'https://stream.radiojar.com/8s5u5tpdtwzuv',
    'https://n09.radiojar.com/8s5u5tpdtwzuv?rj-ttl=5'
  ];

  for (const url of candidates) {
    try {
      const upstream = await axios.get(url, {
        responseType: 'stream',
        timeout: 20000,
        maxRedirects: 8,
        headers: {
          'User-Agent': 'Mozilla/5.0',
          Accept: '*/*'
        },
        validateStatus: (status) => status >= 200 && status < 400
      });

      const contentType = upstream.headers?.['content-type'];
      if (contentType) res.setHeader('Content-Type', contentType);

      req.on('close', () => {
        try {
          upstream.data?.destroy();
        } catch {}
      });

      upstream.data.on('error', () => {
        if (!res.headersSent) res.status(502);
        res.end();
      });

      upstream.data.pipe(res);
      return;
    } catch {
      continue;
    }
  }

  res.status(502).json({ error: 'radio_unavailable' });
});

app.get('/api/prayer/timings', regularLimiter, async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');

  const lat = Number(req.query.lat);
  const lon = Number(req.query.lon);

  if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
    return res.status(400).json({ error: 'invalid_coords' });
  }
  if (Math.abs(lat) > 90 || Math.abs(lon) > 180) {
    return res.status(400).json({ error: 'invalid_coords' });
  }

  try {
    const upstream = await axios.get('https://api.aladhan.com/v1/timings', {
      params: {
        latitude: lat,
        longitude: lon,
        method: 5,
        midnightMode: 0,
        tune: '0,0,0,0,0,0,0,0,0'
      },
      timeout: 10000,
      headers: { 'User-Agent': 'CinemaOnline/1.0', Accept: 'application/json' },
      validateStatus: (status) => status >= 200 && status < 400
    });

    return res.json(upstream.data);
  } catch (error) {
    return res.status(502).json({ error: 'upstream_error' });
  }
});

app.get('/api/weather/current', regularLimiter, async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');

  const lat = Number(req.query.lat);
  const lon = Number(req.query.lon);

  if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
    return res.status(400).json({ error: 'invalid_coords' });
  }
  if (Math.abs(lat) > 90 || Math.abs(lon) > 180) {
    return res.status(400).json({ error: 'invalid_coords' });
  }

  try {
    const upstream = await axios.get('https://api.open-meteo.com/v1/forecast', {
      params: {
        latitude: lat,
        longitude: lon,
        current_weather: true,
        timezone: 'Africa/Cairo'
      },
      timeout: 10000,
      headers: { 'User-Agent': 'CinemaOnline/1.0', Accept: 'application/json' },
      validateStatus: (status) => status >= 200 && status < 400
    });

    return res.json(upstream.data);
  } catch {
    return res.status(502).json({ error: 'upstream_error' });
  }
});

app.get('/api/admin/health', sensitiveLimiter, async (req, res) => {
  if (!ensureAdminIpAllowed(req, res)) return;
  if (!ensureAdminToken(req, res)) return;
  res.json({ lastSyncAt, lastSyncStatus });
});

app.get('/api/admin/logs', sensitiveLimiter, async (req, res) => {
  if (!ensureAdminIpAllowed(req, res)) return;
  if (!ensureAdminToken(req, res)) return;
  const logs = (lastSyncLogs || []).slice(-20);
  res.json({ logs });
});

app.get('/api/admin/ops/status', regularLimiter, async (req, res) => {
  if (!(await ensureAdminJwtRole(req, res, ['admin', 'supervisor']))) return;
  const startedAt = new Date().toISOString();
  const websiteDomain = process.env.WEBSITE_DOMAIN || process.env.VITE_DOMAIN || 'https://cinma.online';
  const apiBase = process.env.API_BASE || process.env.VITE_API_BASE || '';
  const githubRepo = process.env.GITHUB_REPO || 'Iaaelsadek/cinma';
  const githubBranch = process.env.GITHUB_BRANCH || 'main';

  const result = {
    ok: true,
    generatedAt: startedAt,
    website: {
      domain: websiteDomain,
      apiBase,
    },
    env: {
      hasSupabaseUrl: Boolean(process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL),
      hasSupabaseAnon: Boolean(process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY),
      hasSupabaseServiceRole: Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY),
      hasTmdb: Boolean(process.env.VITE_TMDB_API_KEY || process.env.TMDB_API_KEY),
      hasCloudflareToken: Boolean(process.env.CLOUDFLARE_API_TOKEN),
      hasKoyebToken: Boolean(process.env.KOYEB_API_TOKEN),
    },
    github: {
      repo: githubRepo,
      branch: githubBranch,
      status: 'unavailable',
    },
    cloudflare: {
      status: 'unavailable',
    },
    koyeb: {
      status: 'unavailable',
    },
    database: {
      status: 'unavailable',
    },
  };

  try {
    if (supabase) {
      const start = Date.now();
      const { error } = await supabase
        .from('profiles')
        .select('id', { head: true, count: 'exact' })
        .limit(1);
      result.database = {
        status: error ? 'error' : 'ok',
        latencyMs: Date.now() - start,
        error: error?.message || null,
      };
    }
  } catch (error) {
    result.database = { status: 'error', error: String(error?.message || error) };
  }

  try {
    const ghHeaders = { Accept: 'application/vnd.github+json' };
    if (process.env.GITHUB_TOKEN) ghHeaders.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
    const { data } = await axios.get(`https://api.github.com/repos/${githubRepo}/commits/${githubBranch}`, {
      headers: ghHeaders,
      timeout: 10000,
    });
    result.github = {
      repo: githubRepo,
      branch: githubBranch,
      status: 'ok',
      commit: data?.sha || null,
      message: data?.commit?.message || null,
      authorDate: data?.commit?.author?.date || null,
      htmlUrl: data?.html_url || null,
    };
  } catch (error) {
    result.github = {
      repo: githubRepo,
      branch: githubBranch,
      status: 'error',
      error: String(error?.response?.data?.message || error?.message || error),
    };
  }

  try {
    const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
    const projectName = process.env.CLOUDFLARE_PAGES_PROJECT;
    const token = process.env.CLOUDFLARE_API_TOKEN;
    if (accountId && projectName && token) {
      const { data } = await axios.get(
        `https://api.cloudflare.com/client/v4/accounts/${accountId}/pages/projects/${projectName}/deployments`,
        {
          params: { per_page: 1 },
          headers: { Authorization: `Bearer ${token}` },
          timeout: 10000,
        }
      );
      const latest = data?.result?.[0] || null;
      result.cloudflare = {
        status: latest ? 'ok' : 'unavailable',
        project: projectName,
        latestDeploymentId: latest?.id || null,
        latestDeploymentCreatedOn: latest?.created_on || null,
        latestDeploymentUrl: latest?.url || null,
        latestDeploymentState: latest?.latest_stage?.status || latest?.deployment_trigger?.type || null,
      };
    }
  } catch (error) {
    result.cloudflare = {
      status: 'error',
      error: String(error?.response?.data?.errors?.[0]?.message || error?.message || error),
    };
  }

  try {
    const token = process.env.KOYEB_API_TOKEN;
    const serviceId = process.env.KOYEB_SERVICE_ID;
    if (token && serviceId) {
      const { data } = await axios.get(`https://app.koyeb.com/v1/services/${serviceId}/deployments`, {
        headers: { Authorization: `Bearer ${token}` },
        params: { limit: 1 },
        timeout: 10000,
      });
      const latest = data?.deployments?.[0] || data?.items?.[0] || null;
      result.koyeb = {
        status: latest ? 'ok' : 'unavailable',
        serviceId,
        latestDeploymentId: latest?.id || null,
        latestDeploymentCreatedAt: latest?.created_at || latest?.createdAt || null,
        latestDeploymentStatus: latest?.status || latest?.state || null,
      };
    }
  } catch (error) {
    result.koyeb = {
      status: 'error',
      error: String(error?.response?.data?.message || error?.message || error),
    };
  }

  res.json(result);
});

app.post('/api/admin/sync', sensitiveLimiter, async (req, res) => {
  if (!ensureAdminIpAllowed(req, res)) return;
  if (!ensureAdminToken(req, res)) return;
  lastSyncStatus = 'running';
  lastSyncAt = new Date().toISOString();
  try {
    const result = await runPythonScript('backend/master_engine.py');
    lastSyncStatus = result.code === 0 ? 'success' : 'error';
    lastSyncLogs = result.logs;
    res.json({ ok: result.code === 0, logs: result.logs });
  } catch (err) {
    lastSyncStatus = 'error';
    res.status(500).json({ ok: false, error: String(err) });
  }
});

app.post('/api/admin/refresh/anime', sensitiveLimiter, async (req, res) => {
  if (!ensureAdminIpAllowed(req, res)) return;
  if (!ensureAdminToken(req, res)) return;
  try {
    const result = await runPythonScript('backend/fetch_anime.py');
    res.json({ ok: result.code === 0, logs: result.logs });
  } catch (err) {
    res.status(500).json({ ok: false, error: String(err) });
  }
});

app.post('/api/admin/refresh/quran', sensitiveLimiter, async (req, res) => {
  if (!ensureAdminIpAllowed(req, res)) return;
  if (!ensureAdminToken(req, res)) return;
  try {
    const result = await runPythonScript('backend/fetch_quran.py');
    res.json({ ok: result.code === 0, logs: result.logs });
  } catch (err) {
    res.status(500).json({ ok: false, error: String(err) });
  }
});

// --- TMDB PROXY ---
// Security: Use server-side API key only. Never accept api_key from client to prevent key abuse.
app.get(/^\/api\/tmdb\/(.*)/, regularLimiter, async (req, res) => {
  const endpoint = req.params[0];
  const query = { ...req.query };
  delete query.api_key; // Strip any client-provided api_key
  const apiKey = process.env.TMDB_API_KEY || process.env.VITE_TMDB_API_KEY;

  if (!apiKey) {
    return res.status(503).json({ error: 'TMDB API not configured' });
  }

  try {
    const response = await axios.get(`https://api.themoviedb.org/3/${endpoint}`, {
      params: { ...query, api_key: apiKey },
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'CinemaOnline/1.0'
      }
    });
    res.json(response.data);
  } catch (error) {
    console.error(`TMDB Proxy Error [${endpoint}]:`, error.message);
    res.status(error.response?.status || 500).json(error.response?.data || { error: error.message });
  }
});

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});

async function refreshHomeViews() {
  if (!supabase) return;
  try {
    await supabase.rpc('refresh_home_materialized_views', { force_refresh: false, min_interval_minutes: 30 });
  } catch (error) {
    console.error('Materialized view refresh error:', error?.message || error);
  }
}

setInterval(() => {
  refreshHomeViews();
}, 30 * 60 * 1000);

refreshHomeViews();
