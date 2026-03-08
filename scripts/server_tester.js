import axios from 'axios';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { performance } from 'perf_hooks';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const reportPath = path.resolve(__dirname, '../servers_health_report.md');

const DELAY_MS = Number(process.env.SERVER_TEST_DELAY_MS || 1200);
const JITTER_MS = Number(process.env.SERVER_TEST_JITTER_MS || 600);
const REQUEST_TIMEOUT_MS = Number(process.env.SERVER_TEST_TIMEOUT_MS || 12000);
const ENABLE_PUPPETEER_FALLBACK = process.env.SERVER_TEST_USE_PUPPETEER === '1';
const FAILURE_PATTERN = /(404|not found|deleted|no video|error|unavailable|forbidden|removed|cannot\s*be\s*found)/i;
const TMDB_API_KEY = process.env.VITE_TMDB_API_KEY || process.env.TMDB_API_KEY || '';
const SERVER_PATTERNS_FILE = path.resolve(__dirname, '../src/pages/admin/ServerTester.tsx');
const USE_SERVERS_FILE = path.resolve(__dirname, '../src/hooks/useServers.ts');
const SERVER_SOURCE = (process.env.SERVER_TEST_SOURCE || 'admin').toLowerCase();
const SERVER_NAME_FILTER = (process.env.SERVER_TEST_SERVER_NAMES || '')
  .split(',')
  .map((name) => name.trim().toLowerCase())
  .filter(Boolean);

const SAMPLE_SIZE = Math.max(1, Number(process.env.SERVER_TEST_SAMPLE_SIZE || 12));
const moviePool = [
  { id: 550, type: 'movie', title: 'Fight Club' },
  { id: 680, type: 'movie', title: 'Pulp Fiction' },
  { id: 13, type: 'movie', title: 'Forrest Gump' },
  { id: 278, type: 'movie', title: 'The Shawshank Redemption' },
  { id: 603, type: 'movie', title: 'The Matrix' },
  { id: 155, type: 'movie', title: 'The Dark Knight' },
  { id: 157336, type: 'movie', title: 'Interstellar' },
  { id: 872585, type: 'movie', title: 'Oppenheimer' },
  { id: 299536, type: 'movie', title: 'Avengers: Infinity War' },
  { id: 299534, type: 'movie', title: 'Avengers: Endgame' },
  { id: 24428, type: 'movie', title: 'The Avengers' },
  { id: 99861, type: 'movie', title: 'Avengers: Age of Ultron' },
  { id: 271110, type: 'movie', title: 'Captain America: Civil War' },
  { id: 284054, type: 'movie', title: 'Black Panther' },
  { id: 118340, type: 'movie', title: 'Guardians of the Galaxy' },
  { id: 315635, type: 'movie', title: 'Spider-Man: Homecoming' },
  { id: 634649, type: 'movie', title: 'Spider-Man: No Way Home' },
  { id: 27205, type: 'movie', title: 'Inception' },
  { id: 49026, type: 'movie', title: 'The Dark Knight Rises' },
  { id: 240, type: 'movie', title: 'The Godfather Part II' },
  { id: 238, type: 'movie', title: 'The Godfather' },
  { id: 424, type: 'movie', title: 'Schindlers List' },
  { id: 389, type: 'movie', title: '12 Angry Men' },
  { id: 497, type: 'movie', title: 'The Green Mile' },
  { id: 122, type: 'movie', title: 'The Lord of the Rings: The Return of the King' },
  { id: 121, type: 'movie', title: 'The Lord of the Rings: The Two Towers' },
  { id: 120, type: 'movie', title: 'The Lord of the Rings: The Fellowship of the Ring' },
  { id: 11, type: 'movie', title: 'Star Wars' },
  { id: 1891, type: 'movie', title: 'The Empire Strikes Back' },
  { id: 1892, type: 'movie', title: 'Return of the Jedi' },
  { id: 597, type: 'movie', title: 'Titanic' },
  { id: 19995, type: 'movie', title: 'Avatar' },
  { id: 76600, type: 'movie', title: 'Avatar: The Way of Water' },
  { id: 106646, type: 'movie', title: 'The Wolf of Wall Street' },
  { id: 19404, type: 'movie', title: 'Dilwale Dulhania Le Jayenge' },
  { id: 346698, type: 'movie', title: 'Barbie' },
  { id: 569094, type: 'movie', title: 'Spider-Man: Across the Spider-Verse' },
  { id: 346364, type: 'movie', title: 'It' },
  { id: 361743, type: 'movie', title: 'Top Gun: Maverick' },
  { id: 502356, type: 'movie', title: 'The Super Mario Bros Movie' },
  { id: 920, type: 'movie', title: 'Cars' },
  { id: 10195, type: 'movie', title: 'Thor' },
  { id: 118, type: 'movie', title: 'Charlie and the Chocolate Factory' },
  { id: 109445, type: 'movie', title: 'Frozen' },
  { id: 862, type: 'movie', title: 'Toy Story' },
  { id: 9806, type: 'movie', title: 'The Incredibles' },
  { id: 14160, type: 'movie', title: 'Up' },
  { id: 10193, type: 'movie', title: 'Toy Story 3' },
  { id: 585, type: 'movie', title: 'Monsters, Inc.' },
  { id: 12, type: 'movie', title: 'Finding Nemo' }
];

const tvPool = [
  { id: 1399, type: 'tv', title: 'Game of Thrones', season: 1, episode: 1 },
  { id: 94605, type: 'tv', title: 'Arcane', season: 1, episode: 1 },
  { id: 1396, type: 'tv', title: 'Breaking Bad', season: 1, episode: 1 },
  { id: 60625, type: 'tv', title: 'Rick and Morty', season: 1, episode: 1 },
  { id: 1668, type: 'tv', title: 'Friends', season: 1, episode: 1 },
  { id: 456, type: 'tv', title: 'The Simpsons', season: 1, episode: 1 },
  { id: 1412, type: 'tv', title: 'Arrow', season: 1, episode: 1 },
  { id: 1418, type: 'tv', title: 'The Big Bang Theory', season: 1, episode: 1 },
  { id: 82856, type: 'tv', title: 'The Mandalorian', season: 1, episode: 1 },
  { id: 2316, type: 'tv', title: 'The Office', season: 1, episode: 1 },
  { id: 1434, type: 'tv', title: 'Family Guy', season: 1, episode: 1 },
  { id: 60735, type: 'tv', title: 'The Flash', season: 1, episode: 1 },
  { id: 1402, type: 'tv', title: 'The Walking Dead', season: 1, episode: 1 },
  { id: 44217, type: 'tv', title: 'Vikings', season: 1, episode: 1 },
  { id: 71912, type: 'tv', title: 'The Witcher', season: 1, episode: 1 },
  { id: 4614, type: 'tv', title: 'NCIS', season: 1, episode: 1 },
  { id: 71712, type: 'tv', title: 'The Good Doctor', season: 1, episode: 1 },
  { id: 73586, type: 'tv', title: 'Yellowstone', season: 1, episode: 1 },
  { id: 1421, type: 'tv', title: 'Modern Family', season: 1, episode: 1 },
  { id: 1622, type: 'tv', title: 'Supernatural', season: 1, episode: 1 },
  { id: 60708, type: 'tv', title: 'Gotham', season: 1, episode: 1 },
  { id: 1622, type: 'tv', title: 'Supernatural', season: 5, episode: 1 },
  { id: 2734, type: 'tv', title: 'Law & Order: SVU', season: 1, episode: 1 },
  { id: 1437, type: 'tv', title: 'American Dad', season: 1, episode: 1 },
  { id: 85271, type: 'tv', title: 'WandaVision', season: 1, episode: 1 },
  { id: 95557, type: 'tv', title: 'Invincible', season: 1, episode: 1 },
  { id: 66732, type: 'tv', title: 'Stranger Things', season: 1, episode: 1 },
  { id: 93405, type: 'tv', title: 'Squid Game', season: 1, episode: 1 },
  { id: 85552, type: 'tv', title: 'Euphoria', season: 1, episode: 1 },
  { id: 84958, type: 'tv', title: 'Loki', season: 1, episode: 1 },
  { id: 60718, type: 'tv', title: 'The Last Kingdom', season: 1, episode: 1 },
  { id: 60623, type: 'tv', title: 'Fear the Walking Dead', season: 1, episode: 1 },
  { id: 62560, type: 'tv', title: 'Mr. Robot', season: 1, episode: 1 },
  { id: 1439, type: 'tv', title: 'How I Met Your Mother', season: 1, episode: 1 },
  { id: 2710, type: 'tv', title: 'Its Always Sunny in Philadelphia', season: 1, episode: 1 },
  { id: 1408, type: 'tv', title: 'House', season: 1, episode: 1 },
  { id: 39351, type: 'tv', title: 'Grimm', season: 1, episode: 1 },
  { id: 42009, type: 'tv', title: 'Black Mirror', season: 1, episode: 1 },
  { id: 34307, type: 'tv', title: 'Shameless', season: 1, episode: 1 },
  { id: 87108, type: 'tv', title: 'Cobra Kai', season: 1, episode: 1 },
  { id: 1585, type: 'tv', title: 'Smallville', season: 1, episode: 1 },
  { id: 4607, type: 'tv', title: 'Lost', season: 1, episode: 1 },
  { id: 1438, type: 'tv', title: 'Sons of Anarchy', season: 1, episode: 1 },
  { id: 1403, type: 'tv', title: 'Marvels Agents of S.H.I.E.L.D.', season: 1, episode: 1 },
  { id: 4500, type: 'tv', title: 'Seinfeld', season: 1, episode: 1 },
  { id: 62688, type: 'tv', title: 'Supergirl', season: 1, episode: 1 },
  { id: 46952, type: 'tv', title: 'The Blacklist', season: 1, episode: 1 },
  { id: 8717, type: 'tv', title: 'Trailer Park Boys', season: 1, episode: 1 },
  { id: 4629, type: 'tv', title: 'Stargate SG-1', season: 1, episode: 1 },
  { id: 1433, type: 'tv', title: 'American Horror Story', season: 1, episode: 1 }
];

function buildBatch(size) {
  const safeSize = Math.min(size, moviePool.length + tvPool.length);
  const moviesTarget = Math.min(Math.ceil(safeSize * 0.5), moviePool.length);
  const tvTarget = Math.min(safeSize - moviesTarget, tvPool.length);
  const extra = safeSize - (moviesTarget + tvTarget);
  const batch = [
    ...moviePool.slice(0, moviesTarget + Math.max(0, extra)),
    ...tvPool.slice(0, tvTarget)
  ];
  return batch.slice(0, safeSize);
}

function buildFallbackBatch(size) {
  const base = buildBatch(Math.min(size, moviePool.length + tvPool.length));
  if (base.length >= size) return base.slice(0, size);
  const extra = [];
  let i = 0;
  while (base.length + extra.length < size) {
    const tv = tvPool[i % tvPool.length];
    extra.push({
      ...tv,
      season: ((i % 5) + 1),
      episode: ((i % 8) + 1),
      title: `${tv.title} S${((i % 5) + 1)}E${((i % 8) + 1)}`
    });
    i += 1;
  }
  return [...base, ...extra].slice(0, size);
}

async function buildDynamicBatch(size) {
  if (!TMDB_API_KEY) return buildFallbackBatch(size);
  const endpoints = [
    { type: 'movie', path: '/trending/movie/week', pages: 5 },
    { type: 'movie', path: '/movie/top_rated', pages: 5 },
    { type: 'movie', path: '/movie/popular', pages: 5 },
    { type: 'tv', path: '/trending/tv/week', pages: 5 },
    { type: 'tv', path: '/tv/top_rated', pages: 5 },
    { type: 'tv', path: '/tv/popular', pages: 5 }
  ];
  const rows = [];
  for (const endpoint of endpoints) {
    for (let page = 1; page <= endpoint.pages; page += 1) {
      try {
        const { data } = await axios.get(`https://api.themoviedb.org/3${endpoint.path}`, {
          params: {
            api_key: TMDB_API_KEY,
            page,
            language: 'en-US'
          },
          timeout: 10000
        });
        for (const item of data?.results || []) {
          rows.push({
            id: Number(item.id),
            type: endpoint.type,
            title: item.title || item.name || `${endpoint.type}-${item.id}`,
            season: endpoint.type === 'tv' ? 1 : undefined,
            episode: endpoint.type === 'tv' ? 1 : undefined
          });
        }
      } catch {
      }
    }
  }
  const unique = [];
  const seen = new Set();
  for (const item of rows) {
    const key = `${item.type}:${item.id}`;
    if (seen.has(key)) continue;
    seen.add(key);
    unique.push(item);
    if (unique.length >= size) break;
  }
  if (unique.length >= size) return unique.slice(0, size);
  const fallback = buildFallbackBatch(size);
  const withFallback = [...unique];
  for (const item of fallback) {
    const key = `${item.type}:${item.id}:${item.season || 0}:${item.episode || 0}`;
    if (seen.has(key)) continue;
    withFallback.push(item);
    if (withFallback.length >= size) break;
  }
  return withFallback.slice(0, size);
}

async function loadServerPatternsFromAdminTester() {
  const fallback = [
    { name: 'VidSrc.cc', pattern: 'https://vidsrc.cc/v2/embed/movie/{id}' },
    { name: 'VidSrc.vip', pattern: 'https://vidsrc.vip/embed/movie/{id}' },
    { name: 'AutoEmbed Co', pattern: 'https://autoembed.co/movie/tmdb/{id}' }
  ];
  try {
    const src = await fs.readFile(SERVER_PATTERNS_FILE, 'utf8');
    const blockMatch = src.match(/const SERVER_PATTERNS = \[([\s\S]*?)\n\]/);
    if (!blockMatch) return fallback;
    const block = blockMatch[1];
    const matches = [...block.matchAll(/\{\s*name:\s*'([^']+)'\s*,\s*pattern:\s*'([^']+)'\s*\}/g)];
    const mapped = matches.map((m) => ({ name: m[1], pattern: m[2] }));
    return mapped.length ? mapped : fallback;
  } catch {
    return fallback;
  }
}

function patternFromUseServerProvider(provider) {
  if (provider.id === 'autoembed_co') {
    return 'https://autoembed.co/movie/tmdb/{id}';
  }
  if (provider.id === 'database_gdrive') {
    return 'https://databasegdriveplayer.co/player.php?tmdb={id}';
  }
  if (provider.id === 'smashystream') {
    return 'https://player.smashy.stream/movie/{id}';
  }
  if (provider.id === 'moviebox') {
    return 'https://moviebox.xyz/embed/movie/{id}';
  }
  if (provider.id === 'streamwish') {
    return 'https://streamwish.to/e/{id}';
  }
  if (provider.id === 'multiembed') {
    return 'https://multiembed.mov/?video_id={id}&tmdb=1';
  }
  if (provider.id === '111movies' || provider.id === 'vidlink') {
    return `${provider.base}/movie/{id}`;
  }
  if (provider.id.startsWith('2embed')) {
    return `${provider.base}/{id}`;
  }
  if (provider.id.startsWith('vidsrc_')) {
    if (provider.id === 'vidsrc_cc' || provider.id === 'vidsrc_to' || provider.id === 'vidsrc_io') {
      return `${provider.base}/movie/{id}`;
    }
    return `${provider.base}/movie/{id}`;
  }
  return `${provider.base}/movie/{id}`;
}

async function loadServerPatternsFromUseServers() {
  try {
    const src = await fs.readFile(USE_SERVERS_FILE, 'utf8');
    const blockMatch = src.match(/const PROVIDERS = \[([\s\S]*?)\n\]/);
    if (!blockMatch) return [];
    const block = blockMatch[1];
    const matches = [...block.matchAll(/\{\s*id:\s*'([^']+)'\s*,\s*name:\s*'([^']+)'\s*,\s*base:\s*'([^']+)'\s*\}/g)];
    return matches.map((m) => {
      const provider = { id: m[1], name: m[2], base: m[3] };
      return { name: provider.name, pattern: patternFromUseServerProvider(provider) };
    });
  } catch {
    return [];
  }
}

function buildUrlFromPattern(pattern, item) {
  const s = item.season || 1;
  const e = item.episode || 1;
  return pattern
    .replaceAll('{id}', String(item.id))
    .replaceAll('{imdb}', '')
    .replaceAll('{season}', String(s))
    .replaceAll('{episode}', String(e));
}

const ansi = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
  gray: '\x1b[90m'
};

function colorize(text, color) {
  return `${ansi[color] || ''}${text}${ansi.reset}`;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function randomDelay() {
  return DELAY_MS + Math.floor(Math.random() * JITTER_MS);
}

function bodyToText(body) {
  if (typeof body === 'string') return body;
  if (body == null) return '';
  try {
    return JSON.stringify(body);
  } catch {
    return String(body);
  }
}

async function puppeteerFetch(url) {
  try {
    const mod = await import('puppeteer');
    const browser = await mod.default.launch({ headless: true, args: ['--no-sandbox', '--disable-setuid-sandbox'] });
    const page = await browser.newPage();
    page.setDefaultNavigationTimeout(REQUEST_TIMEOUT_MS);
    const start = performance.now();
    const response = await page.goto(url, { waitUntil: 'domcontentloaded' });
    const html = await page.content();
    const latencyMs = Math.round(performance.now() - start);
    await browser.close();
    return {
      status: response?.status() || 0,
      body: html,
      latencyMs,
      usedPuppeteer: true
    };
  } catch {
    return null;
  }
}

async function fetchEmbed(url) {
  const startedAt = performance.now();
  const response = await axios.get(url, {
    timeout: REQUEST_TIMEOUT_MS,
    maxRedirects: 5,
    validateStatus: () => true,
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
      Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.9,ar;q=0.8'
    }
  });
  const latencyMs = Math.round(performance.now() - startedAt);
  const body = bodyToText(response.data);
  const blocked = response.status === 403 || response.status === 503 || /cloudflare|attention required|captcha/i.test(body);

  if (blocked && ENABLE_PUPPETEER_FALLBACK) {
    const fallback = await puppeteerFetch(url);
    if (fallback) return fallback;
  }

  return { status: response.status, body, latencyMs, usedPuppeteer: false };
}

function evaluate(status, body) {
  const bodyFailed = FAILURE_PATTERN.test(body);
  const statusOk = status >= 200 && status < 400;
  const passed = statusOk && !bodyFailed;
  return { passed, bodyFailed, statusOk };
}

function healthBadge(successRate) {
  if (successRate >= 80) return '🟢 ممتاز';
  if (successRate >= 45) return '🟡 متذبذب';
  return '🔴 ميت';
}

function avg(values) {
  if (!values.length) return 0;
  return Math.round(values.reduce((a, b) => a + b, 0) / values.length);
}

function formatPercent(v) {
  return `${v.toFixed(1)}%`;
}

async function run() {
  const startedAt = new Date();
  const details = [];
  const testBatch = await buildDynamicBatch(SAMPLE_SIZE);
  const serverPatterns = SERVER_SOURCE === 'useservers'
    ? await loadServerPatternsFromUseServers()
    : await loadServerPatternsFromAdminTester();
  const allServers = serverPatterns.map((provider) => ({
    name: provider.name,
    buildUrl: (item) => buildUrlFromPattern(provider.pattern, item)
  }));
  const filteredServers = SERVER_NAME_FILTER.length
    ? allServers.filter((server) => SERVER_NAME_FILTER.includes(server.name.toLowerCase()))
    : allServers;
  const uniqueByName = new Map();
  for (const server of filteredServers) {
    const key = server.name.toLowerCase();
    if (!uniqueByName.has(key)) uniqueByName.set(key, server);
  }
  const servers = Array.from(uniqueByName.values());

  console.log(colorize('\n=== Automated Embed Servers Checker ===', 'cyan'));
  console.log(colorize(`Servers: ${servers.length} | Test IDs: ${testBatch.length}\n`, 'gray'));

  for (let idx = 0; idx < testBatch.length; idx += 1) {
    const item = testBatch[idx];
    const round = await Promise.all(
      servers.map(async (server) => {
        const url = server.buildUrl(item);
        const begin = Date.now();
        let result;
        try {
          result = await fetchEmbed(url);
        } catch (error) {
          result = {
            status: 0,
            body: String(error?.message || 'request_failed'),
            latencyMs: Date.now() - begin,
            usedPuppeteer: false
          };
        }
        const verdict = evaluate(result.status, result.body);
        return {
          server: server.name,
          id: item.id,
          type: item.type,
          title: item.title,
          status: result.status,
          latencyMs: result.latencyMs,
          passed: verdict.passed,
          reason: verdict.passed ? 'ok' : (verdict.statusOk ? 'body_failure_keyword' : 'bad_status'),
          usedPuppeteer: result.usedPuppeteer,
          url
        };
      })
    );
    details.push(...round);
    if ((idx + 1) % 10 === 0 || idx === testBatch.length - 1) {
      console.log(colorize(`Progress: ${idx + 1}/${testBatch.length}`, 'gray'));
    }
    await sleep(randomDelay());
  }

  const summary = servers.map((server) => {
    const rows = details.filter((d) => d.server === server.name);
    const passedCount = rows.filter((r) => r.passed).length;
    const successRate = rows.length ? (passedCount / rows.length) * 100 : 0;
    const avgLatency = avg(rows.map((r) => r.latencyMs));
    const throttled = rows.filter((r) => r.status === 429).length;
    const blocked = rows.filter((r) => r.status === 403 || r.status === 503).length;
    return {
      server: server.name,
      successRate,
      avgLatency,
      status: healthBadge(successRate),
      total: rows.length,
      passed: passedCount,
      throttled,
      blocked
    };
  });

  const line = '-'.repeat(94);
  console.log(colorize(line, 'gray'));
  console.log(
    colorize('Server'.padEnd(20), 'cyan') +
    colorize('Success'.padEnd(14), 'cyan') +
    colorize('Avg Latency'.padEnd(14), 'cyan') +
    colorize('Passed/Total'.padEnd(14), 'cyan') +
    colorize('429'.padEnd(8), 'cyan') +
    colorize('Blocked'.padEnd(10), 'cyan') +
    colorize('Health', 'cyan')
  );
  console.log(colorize(line, 'gray'));

  for (const row of summary) {
    const healthColor = row.successRate >= 80 ? 'green' : row.successRate >= 45 ? 'yellow' : 'red';
    const successText = formatPercent(row.successRate).padEnd(14);
    const latencyText = `${row.avgLatency} ms`.padEnd(14);
    const passedText = `${row.passed}/${row.total}`.padEnd(14);
    const throttledText = String(row.throttled).padEnd(8);
    const blockedText = String(row.blocked).padEnd(10);
    console.log(
      row.server.padEnd(20) +
      colorize(successText, healthColor) +
      latencyText +
      passedText +
      throttledText +
      blockedText +
      colorize(row.status, healthColor)
    );
  }
  console.log(colorize(line, 'gray'));

  const topFailures = details.filter((d) => !d.passed).slice(0, 30);
  const markdown = [
    '# Embed Servers Health Report',
    '',
    `- Generated at: ${startedAt.toISOString()}`,
    `- Servers tested: ${servers.length}`,
    `- Test sample size per server: ${testBatch.length}`,
    `- Delay config: ${DELAY_MS}ms + jitter up to ${JITTER_MS}ms`,
    '',
    '## Summary',
    '',
    '| Server | Success % | Avg Latency (ms) | Passed/Total | 429 Hits | Blocked (403/503) | Health |',
    '|---|---:|---:|---:|---:|---:|---|',
    ...summary.map((row) =>
      `| ${row.server} | ${row.successRate.toFixed(1)}% | ${row.avgLatency} | ${row.passed}/${row.total} | ${row.throttled} | ${row.blocked} | ${row.status} |`
    ),
    '',
    '## Failure Samples',
    '',
    '| Server | Type | TMDB ID | Status | Reason | URL |',
    '|---|---|---:|---:|---|---|',
    ...topFailures.map((f) =>
      `| ${f.server} | ${f.type} | ${f.id} | ${f.status} | ${f.reason} | ${f.url.replace(/\|/g, '%7C')} |`
    ),
    ''
  ].join('\n');

  await fs.writeFile(reportPath, markdown, 'utf8');
  console.log(colorize(`\nReport exported: ${reportPath}\n`, 'green'));
}

run().catch((error) => {
  console.error(colorize(`Fatal error: ${error?.message || error}`, 'red'));
  process.exit(1);
});
