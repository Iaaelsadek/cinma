import express from 'express';
import cors from 'cors';
import axios from 'axios';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { spawn } from 'child_process';

const app = express();
const port = 3001;
const allowedOrigins = (process.env.WEB_ORIGIN || '').split(',').map((s) => s.trim()).filter(Boolean);
const apiLimiter = rateLimit({ windowMs: 60 * 1000, max: 40, standardHeaders: true, legacyHeaders: false });
const linkLimiter = rateLimit({ windowMs: 60 * 1000, max: 120, standardHeaders: true, legacyHeaders: false });
const pythonBin = process.env.PYTHON_BIN || 'python';
const adminToken = process.env.ADMIN_SYNC_TOKEN || '';
let lastSyncAt = null;
let lastSyncStatus = 'idle';
let lastSyncLogs = [];

app.set('trust proxy', 1);
app.use(cors({
  origin: allowedOrigins.length ? allowedOrigins : true,
  methods: ['GET', 'POST'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  maxAge: 86400
}));
app.use(express.json({ limit: '64kb' }));
app.use(helmet());
app.use(rateLimit({ windowMs: 60 * 1000, max: 120 }));

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
  if (!adminToken) return true;
  const token = String(req.headers['x-admin-token'] || '');
  if (token && token === adminToken) return true;
  res.status(401).json({ error: 'unauthorized' });
  return false;
}

function runPythonScript(scriptPath) {
  return new Promise((resolve, reject) => {
    const child = spawn(pythonBin, [scriptPath], { cwd: process.cwd() });
    const logs = [];
    child.stdout.on('data', (data) => {
      logs.push(String(data));
    });
    child.stderr.on('data', (data) => {
      logs.push(String(data));
    });
    child.on('error', (err) => reject(err));
    child.on('close', (code) => {
      resolve({ code, logs });
    });
  });
}

app.post('/api/gemini-summary', apiLimiter, async (req, res) => {
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
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${apiKey}`,
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

app.post('/api/gemini-recommendations', apiLimiter, async (req, res) => {
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
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${apiKey}`,
      { contents: [{ role: 'user', parts: [{ text: prompt }] }] },
      { timeout: 15000 }
    );
    const titles = response?.data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
    return res.json({ titles: String(titles).trim() });
  } catch (error) {
    return res.status(502).json({ error: 'gemini_error' });
  }
});

app.get('/api/check-link', linkLimiter, async (req, res) => {
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

app.get('/api/admin/health', apiLimiter, async (req, res) => {
  if (!ensureAdminToken(req, res)) return;
  res.json({ lastSyncAt, lastSyncStatus });
});

app.get('/api/admin/logs', apiLimiter, async (req, res) => {
  if (!ensureAdminToken(req, res)) return;
  const logs = (lastSyncLogs || []).slice(-20);
  res.json({ logs });
});

app.post('/api/admin/sync', apiLimiter, async (req, res) => {
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

app.post('/api/admin/refresh/anime', apiLimiter, async (req, res) => {
  if (!ensureAdminToken(req, res)) return;
  try {
    const result = await runPythonScript('backend/fetch_anime.py');
    res.json({ ok: result.code === 0, logs: result.logs });
  } catch (err) {
    res.status(500).json({ ok: false, error: String(err) });
  }
});

app.post('/api/admin/refresh/quran', apiLimiter, async (req, res) => {
  if (!ensureAdminToken(req, res)) return;
  try {
    const result = await runPythonScript('backend/fetch_quran.py');
    res.json({ ok: result.code === 0, logs: result.logs });
  } catch (err) {
    res.status(500).json({ ok: false, error: String(err) });
  }
});

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
