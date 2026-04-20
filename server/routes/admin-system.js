// server/routes/admin-system.js - System Control Admin Routes
import express from 'express';
import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs/promises';
import path from 'path';
import pool from '../../src/db/pool.js';

const execAsync = promisify(exec);
const router = express.Router();

// Admin authentication middleware
const requireAdminToken = (req, res, next) => {
    const token = req.headers['x-admin-token'];
    if (!token) {
        return res.status(401).json({ error: 'Missing admin token' });
    }
    // TODO: Validate token with Supabase
    next();
};

// Execute shell command
router.post('/exec', requireAdminToken, async (req, res) => {
    try {
        const { command, cwd } = req.body;

        if (!command) {
            return res.status(400).json({ error: 'Command is required' });
        }

        console.log(`[ADMIN EXEC] Running: ${command}`);

        const options = {
            cwd: cwd || process.cwd(),
            timeout: 300000, // 5 minutes
            maxBuffer: 10 * 1024 * 1024 // 10MB
        };

        const { stdout, stderr } = await execAsync(command, options);

        res.json({
            success: true,
            stdout: stdout || '',
            stderr: stderr || ''
        });
    } catch (error) {
        console.error('[ADMIN EXEC] Error:', error);
        res.json({
            success: false,
            error: error.message,
            stdout: error.stdout || '',
            stderr: error.stderr || ''
        });
    }
});

// File system operations
router.get('/fs', requireAdminToken, async (req, res) => {
    try {
        const { path: requestedPath } = req.query;
        const fullPath = path.resolve(process.cwd(), requestedPath || '.');

        const stats = await fs.stat(fullPath);

        if (stats.isDirectory()) {
            const files = await fs.readdir(fullPath, { withFileTypes: true });
            const fileList = files.map(file => ({
                name: file.name,
                type: file.isDirectory() ? 'dir' : 'file'
            }));

            res.json({
                type: 'dir',
                path: requestedPath || '.',
                content: fileList
            });
        } else {
            const content = await fs.readFile(fullPath, 'utf-8');
            res.json({
                type: 'file',
                path: requestedPath,
                content
            });
        }
    } catch (error) {
        console.error('[ADMIN FS] Error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Save file
router.post('/fs', requireAdminToken, async (req, res) => {
    try {
        const { path: requestedPath, content } = req.body;
        const fullPath = path.resolve(process.cwd(), requestedPath);

        await fs.writeFile(fullPath, content, 'utf-8');

        res.json({ success: true });
    } catch (error) {
        console.error('[ADMIN FS WRITE] Error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Execute SQL query
router.post('/sql', requireAdminToken, async (req, res) => {
    try {
        const { query } = req.body;

        if (!query) {
            return res.status(400).json({ error: 'Query is required' });
        }

        console.log(`[ADMIN SQL] Running: ${query.substring(0, 100)}...`);

        const result = await pool.query(query);

        res.json({
            success: true,
            rows: result.rows,
            rowCount: result.rowCount,
            stdout: JSON.stringify(result.rows, null, 2)
        });
    } catch (error) {
        console.error('[ADMIN SQL] Error:', error);
        res.json({
            success: false,
            error: error.message
        });
    }
});

// Operations status
router.get('/ops/status', requireAdminToken, async (req, res) => {
    try {
        // Check database
        let dbStatus = 'error';
        let dbLatency = null;
        let dbError = null;

        try {
            const start = Date.now();
            await pool.query('SELECT 1');
            dbLatency = Date.now() - start;
            dbStatus = 'ok';
        } catch (err) {
            dbError = err.message;
        }

        res.json({
            database: {
                status: dbStatus,
                latencyMs: dbLatency,
                error: dbError
            },
            github: {
                status: 'ok',
                repo: 'cinema-online',
                commit: process.env.GITHUB_SHA || 'unknown'
            },
            cloudflare: {
                status: 'ok',
                project: 'cinema-online'
            },
            koyeb: {
                status: 'ok',
                serviceId: process.env.KOYEB_SERVICE_ID || 'unknown'
            },
            website: {
                domain: process.env.VITE_SITE_URL || 'https://cinma.online',
                apiBase: process.env.VITE_API_BASE || 'http://localhost:3001'
            },
            generatedAt: new Date().toISOString()
        });
    } catch (error) {
        console.error('[ADMIN OPS] Error:', error);
        res.status(500).json({ error: error.message });
    }
});

export default router;
