import React, { useState, useEffect, useRef, useCallback, startTransition } from 'react';
import { Terminal, Database, FileCode, Play, Server, Save, Folder, File, Activity } from 'lucide-react';
import { toast } from '../../../lib/toast-manager';
import { supabase } from '../../../lib/supabase';

const API_BASE = import.meta.env.VITE_API_BASE || '';

const SystemControl = () => {
  const [activeTab, setActiveTab] = useState('terminal');
  const [token, setToken] = useState('');

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) setToken(session.access_token);
    });
  }, []);

  if (!token) return <div className="p-8 text-center text-zinc-500">Authenticating with System Core...</div>;

  return (
    <div className="min-h-screen bg-black text-white p-6 space-y-6" dir="ltr">
      <div className="flex items-center justify-between border-b border-gray-800 pb-4">
        <h1 className="text-3xl font-bold text-cyan-400 flex items-center gap-2">
          <Server className="w-8 h-8" />
          لوحة التحكم المتقدمة / System Control
        </h1>
        <div className="flex gap-2">
          <TabButton id="terminal" icon={Terminal} label="الطرفية / Terminal" active={activeTab} set={setActiveTab} />
          <TabButton id="files" icon={FileCode} label="الملفات / Files" active={activeTab} set={setActiveTab} />
          <TabButton id="database" icon={Database} label="قاعدة البيانات / DB" active={activeTab} set={setActiveTab} />
          <TabButton id="engines" icon={Play} label="المحركات / Engines" active={activeTab} set={setActiveTab} />
          <TabButton id="ops" icon={Activity} label="الحالة / Status" active={activeTab} set={setActiveTab} />
        </div>
      </div>

      <div className="bg-gray-900/50 rounded-lg border border-gray-800 min-h-[600px] p-4">
        {activeTab === 'terminal' && <TerminalView token={token} />}
        {activeTab === 'files' && <FileManager token={token} />}
        {activeTab === 'database' && <DatabaseManager token={token} />}
        {activeTab === 'engines' && <EngineManager token={token} />}
        {activeTab === 'ops' && <OpsStatusPanel token={token} />}
      </div>
    </div>
  );
};

const TabButton = ({ id, icon: Icon, label, active, set }: any) => (
  <button
    onClick={() => set(id)}
    className={`px-4 py-2 rounded-md flex items-center gap-2 transition-colors ${active === id ? 'bg-cyan-600 text-white' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
      }`}
  >
    <Icon className="w-4 h-4" />
    {label}
  </button>
);

// --- TERMINAL ---
const TerminalView = ({ token }: { token: string }) => {
  const [history, setHistory] = useState<string[]>([]);
  const [cmd, setCmd] = useState('');
  const [cwd, setCwd] = useState('');
  const [loading, setLoading] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const quickActions = [
    { label: '📊 عرض الحالة / Status', command: 'node scripts/check-count.mjs' },
    { label: '🎬 استيراد أفلام عربية', command: 'node scripts/ingestion/02_seed_movies_arabic.js' },
    { label: '🎥 استيراد أفلام أجنبية', command: 'node scripts/ingestion/03_seed_movies_foreign.js' },
    { label: '📺 استيراد مسلسلات', command: 'node scripts/ingestion/04_seed_tv_series.js' },
    { label: '🎌 استيراد أنمي', command: 'node scripts/ingestion/05_seed_anime.js' }
  ];

  const execute = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cmd.trim()) return;
    setLoading(true);
    const command = cmd;
    setCmd('');
    setHistory(h => [...h, `$ ${command}`]);

    try {
      const res = await fetch(`${API_BASE}/api/admin/exec`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-admin-token': token },
        body: JSON.stringify({ command, cwd })
      });
      const data = await res.json();
      if (data.stdout) setHistory(h => [...h, data.stdout]);
      if (data.stderr) setHistory(h => [...h, `ERR: ${data.stderr}`]);
      if (data.error) setHistory(h => [...h, `SYS ERR: ${data.error}`]);
    } catch (err: any) {
      setHistory(h => [...h, `NET ERR: ${err.message}`]);
    }
    setLoading(false);
  };

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [history]);

  return (
    <div className="flex flex-col h-[400px]">
      <div className="flex-1 bg-black p-4 font-mono text-sm overflow-auto rounded border border-gray-700 mb-4">
        {history.map((line, i) => (
          <div key={i} className="whitespace-pre-wrap mb-1">{line}</div>
        ))}
        {loading && <div className="text-cyan-500 animate-pulse">Running...</div>}
        <div ref={endRef} />
      </div>
      <form onSubmit={execute} className="flex gap-2">
        <input
          value={cmd}
          onChange={e => setCmd(e.target.value)}
          ref={inputRef}
          className="flex-1 bg-gray-800 border border-gray-700 p-2 rounded text-white font-mono"
          placeholder="Enter command (e.g. 'ls', 'git status', 'npm run build')..."
          autoFocus
        />
        <button type="submit" disabled={loading} className="bg-cyan-600 px-6 rounded font-bold">
          RUN
        </button>
      </form>
      <div className="mt-3 flex flex-wrap gap-2">
        {quickActions.map((action) => (
          <button
            key={action.label}
            type="button"
            onClick={() => {
              setCmd(action.command);
              inputRef.current?.focus();
            }}
            className="rounded-md border border-gray-700 bg-gray-800 px-3 py-1 text-xs text-gray-200 hover:bg-gray-700"
          >
            {action.label}
          </button>
        ))}
      </div>
      <div className="text-xs text-gray-500 mt-2">
        ⚠️ تحذير: الأوامر تُنفذ على السيرفر بصلاحيات كاملة. كن حذراً / Warning: Commands run with full privileges.
      </div>
    </div>
  );
};

// --- FILE MANAGER ---
const FileManager = ({ token }: { token: string }) => {
  const [path, setPath] = useState('.');
  const [files, setFiles] = useState<any[]>([]);
  const [currentFile, setCurrentFile] = useState<string | null>(null);
  const [content, setContent] = useState('');

  const loadPath = useCallback(async (p: string) => {
    try {
      const res = await fetch(`${API_BASE}/api/admin/fs?path=${encodeURIComponent(p)}`, {
        headers: { 'x-admin-token': token }
      });
      const data = await res.json();
      if (data.type === 'dir') {
        setFiles(data.content);
        setPath(data.path);
        setCurrentFile(null);
      } else {
        setCurrentFile(data.path);
        setContent(data.content);
      }
    } catch (err: any) {
      toast.error('Failed to load path');
    }
  }, [token]);

  const saveFile = async () => {
    if (!currentFile) return;
    try {
      await fetch(`${API_BASE}/api/admin/fs`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-admin-token': token },
        body: JSON.stringify({ path: currentFile, content })
      });
      toast.success('File saved');
    } catch (err: any) {
      toast.error('Failed to save');
    }
  };

  useEffect(() => {
    let mounted = true;
    startTransition(() => {
      loadPath('.').catch(() => { });
    });
    return () => { mounted = false; };
  }, [loadPath]);

  return (
    <div className="flex h-[600px] gap-4">
      <div className="w-1/3 bg-black border border-gray-800 rounded flex flex-col">
        <div className="p-2 border-b border-gray-800 bg-gray-900 font-mono text-xs break-all">
          {path}
        </div>
        <div className="flex-1 overflow-auto p-2">
          {path !== '.' && (
            <div
              onClick={() => loadPath(`${path}/..`)}
              className="cursor-pointer p-1 hover:bg-gray-800 text-yellow-500 flex items-center gap-2"
            >
              <Folder className="w-4 h-4" /> ..
            </div>
          )}
          {files.sort((a, b) => (a.type === 'dir' ? -1 : 1)).map(f => (
            <div
              key={f.name}
              onClick={() => loadPath(`${path}/${f.name}`)}
              className={`cursor-pointer p-1 hover:bg-gray-800 flex items-center gap-2 ${f.type === 'dir' ? 'text-yellow-500' : 'text-blue-400'}`}
            >
              {f.type === 'dir' ? <Folder className="w-4 h-4" /> : <File className="w-4 h-4" />}
              <span className="truncate">{f.name}</span>
            </div>
          ))}
        </div>
      </div>
      <div className="w-2/3 flex flex-col bg-black border border-gray-800 rounded">
        {currentFile ? (
          <>
            <div className="p-2 border-b border-gray-800 bg-gray-900 flex justify-between items-center">
              <span className="font-mono text-xs">{currentFile}</span>
              <button onClick={saveFile} className="bg-green-600 px-3 py-1 rounded text-xs flex items-center gap-1">
                <Save className="w-3 h-3" /> Save
              </button>
            </div>
            <textarea
              value={content}
              onChange={e => setContent(e.target.value)}
              className="flex-1 bg-gray-900 text-gray-300 font-mono text-sm p-2 outline-none resize-none"
              spellCheck={false}
            />
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-gray-600">
            Select a file to edit
          </div>
        )}
      </div>
    </div>
  );
};

// --- DATABASE MANAGER ---
const DatabaseManager = ({ token }: { token: string }) => {
  const [query, setQuery] = useState('SELECT * FROM movies LIMIT 5;');
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const runQuery = async () => {
    setLoading(true);
    setResult(null);
    try {
      const res = await fetch(`${API_BASE}/api/admin/sql`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-admin-token': token },
        body: JSON.stringify({ query })
      });
      const data = await res.json();
      setResult(data);
      if (data.error) toast.error('Query Error');
      else toast.success('Query Executed');
    } catch (err: any) {
      toast.error('Failed to run query');
    }
    setLoading(false);
  };

  return (
    <div className="flex flex-col h-[500px] gap-4">
      <div className="flex flex-col gap-2 h-1/3">
        <textarea
          value={query}
          onChange={e => setQuery(e.target.value)}
          className="flex-1 bg-black border border-gray-700 rounded p-2 font-mono text-green-400 text-sm"
          placeholder="Enter SQL Query..."
        />
        <button onClick={runQuery} disabled={loading} className="bg-cyan-600 py-2 rounded font-bold">
          EXECUTE SQL
        </button>
      </div>
      <div className="flex-1 bg-black border border-gray-800 rounded overflow-auto p-2">
        {result?.error && <div className="text-red-500 font-mono whitespace-pre-wrap">{result.error}</div>}
        {result?.stdout && (
          <div className="font-mono text-xs text-gray-300 whitespace-pre-wrap">
            {result.stdout}
          </div>
        )}
        {result?.stderr && (
          <div className="font-mono text-xs text-yellow-500 whitespace-pre-wrap border-t border-gray-800 mt-2 pt-2">
            {result.stderr}
          </div>
        )}
      </div>
    </div>
  );
};

// --- ENGINE MANAGER ---
const EngineManager = ({ token }: { token: string }) => {
  const [logs, setLogs] = useState<string[]>([]);
  const [running, setRunning] = useState(false);

  const runScript = async (command: string, label: string) => {
    setRunning(true);
    setLogs(prev => [...prev, `🚀 ${label}...`]);
    try {
      const res = await fetch(`${API_BASE}/api/admin/exec`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-admin-token': token },
        body: JSON.stringify({ command })
      });
      const data = await res.json();
      if (data.stdout) setLogs(prev => [...prev, data.stdout]);
      if (data.stderr) setLogs(prev => [...prev, `⚠️ ${data.stderr}`]);
      if (data.error) {
        setLogs(prev => [...prev, `❌ Error: ${data.error}`]);
        toast.error(`❌ ${label} فشل`);
      } else {
        setLogs(prev => [...prev, `✅ ${label} اكتمل بنجاح`]);
        toast.success(`✅ ${label} اكتمل`);
      }
    } catch (err: any) {
      setLogs(prev => [...prev, `❌ Network Error: ${err.message}`]);
      toast.error(`❌ خطأ في الشبكة`);
    }
    setRunning(false);
  };

  return (
    <div className="grid grid-cols-3 gap-4 h-[500px]">
      <div className="col-span-1 space-y-4 overflow-auto">
        <div className="border-t border-gray-800 pt-4">
          <h3 className="font-bold mb-2 text-purple-400">📥 استيراد المحتوى / Content Ingestion</h3>
          <div className="space-y-2">
            <button
              onClick={() => runScript('node scripts/ingestion/02_seed_movies_arabic.js', 'استيراد أفلام عربية')}
              disabled={running}
              className="w-full bg-purple-600 hover:bg-purple-700 py-2 rounded font-bold text-sm disabled:opacity-50"
            >
              🎬 أفلام عربية
            </button>
            <button
              onClick={() => runScript('node scripts/ingestion/03_seed_movies_foreign.js', 'استيراد أفلام أجنبية')}
              disabled={running}
              className="w-full bg-indigo-600 hover:bg-indigo-700 py-2 rounded font-bold text-sm disabled:opacity-50"
            >
              🎥 أفلام أجنبية
            </button>
            <button
              onClick={() => runScript('node scripts/ingestion/04_seed_tv_series.js', 'استيراد مسلسلات')}
              disabled={running}
              className="w-full bg-blue-600 hover:bg-blue-700 py-2 rounded font-bold text-sm disabled:opacity-50"
            >
              📺 مسلسلات
            </button>
            <button
              onClick={() => runScript('node scripts/ingestion/05_seed_anime.js', 'استيراد أنمي')}
              disabled={running}
              className="w-full bg-pink-600 hover:bg-pink-700 py-2 rounded font-bold text-sm disabled:opacity-50"
            >
              🎌 أنمي
            </button>
          </div>
        </div>

        <div className="border-t border-gray-800 pt-4">
          <h3 className="font-bold mb-2 text-green-400">🔧 التصليحات / Fixes</h3>
          <div className="space-y-2">
            <button
              onClick={() => runScript('node scripts/fix-primary-genre.js', 'تصليح Primary Genre')}
              disabled={running}
              className="w-full bg-green-600 hover:bg-green-700 py-2 rounded font-bold text-sm disabled:opacity-50"
            >
              🔧 Primary Genre
            </button>
            <button
              onClick={() => runScript('node scripts/fix-slugs.js', 'تصليح Slugs')}
              disabled={running}
              className="w-full bg-teal-600 hover:bg-teal-700 py-2 rounded font-bold text-sm disabled:opacity-50"
            >
              🔗 Slugs
            </button>
            <button
              onClick={() => runScript('node scripts/verify-all-fixes.js', 'التحقق من التصليحات')}
              disabled={running}
              className="w-full bg-cyan-600 hover:bg-cyan-700 py-2 rounded font-bold text-sm disabled:opacity-50"
            >
              ✅ التحقق
            </button>
          </div>
        </div>

        <div className="border-t border-gray-800 pt-4">
          <h3 className="font-bold mb-2 text-orange-400">🤖 معالجة AI / AI Processing</h3>
          <div className="space-y-2">
            <button
              onClick={() => runScript('node scripts/moderate-content-batch-200.js', 'معالجة 200 عنصر')}
              disabled={running}
              className="w-full bg-orange-600 hover:bg-orange-700 py-2 rounded font-bold text-sm disabled:opacity-50"
            >
              🤖 معالجة (200)
            </button>
            <button
              onClick={() => runScript('node scripts/check-count.mjs', 'فحص العدد')}
              disabled={running}
              className="w-full bg-yellow-600 hover:bg-yellow-700 py-2 rounded font-bold text-sm disabled:opacity-50"
            >
              📊 فحص العدد
            </button>
          </div>
        </div>

        <div className="border-t border-gray-800 pt-4">
          <h3 className="font-bold mb-2 text-red-400">🧹 الصيانة / Maintenance</h3>
          <div className="space-y-2">
            <button
              onClick={async () => {
                setRunning(true);
                setLogs(p => [...p, '🧹 مسح الكاش / Clearing cache...']);
                try {
                  const res = await fetch(`${API_BASE}/api/admin/cache/clear`, {
                    method: 'POST',
                    headers: {
                      'Content-Type': 'application/json',
                      'x-admin-key': 'cinma-prod-8f2kx9m4-q7wp-2026'
                    }
                  });
                  const d = await res.json();
                  if (d.success) {
                    setLogs(p => [...p, '✅ تم مسح الكاش بنجاح']);
                    toast.success('✅ تم مسح الكاش');
                  } else {
                    setLogs(p => [...p, `❌ فشل: ${d.error || 'Unknown'}`]);
                    toast.error('❌ فشل مسح الكاش');
                  }
                } catch (e: any) {
                  setLogs(p => [...p, `❌ خطأ: ${e.message}`]);
                  toast.error('❌ خطأ في الشبكة');
                }
                setRunning(false);
              }}
              disabled={running}
              className="w-full bg-red-600 hover:bg-red-700 py-2 rounded font-bold text-sm disabled:opacity-50"
            >
              🧹 مسح الكاش
            </button>
            <button
              onClick={() => runScript('npm install', 'تثبيت الحزم')}
              disabled={running}
              className="w-full bg-emerald-600 hover:bg-emerald-700 py-2 rounded font-bold text-sm disabled:opacity-50"
            >
              📦 تثبيت الحزم
            </button>
            <button
              onClick={() => runScript('npm run build', 'بناء المشروع')}
              disabled={running}
              className="w-full bg-sky-600 hover:bg-sky-700 py-2 rounded font-bold text-sm disabled:opacity-50"
            >
              🏗️ بناء المشروع
            </button>
          </div>
        </div>
      </div>
      <div className="col-span-2 bg-black border border-gray-800 rounded p-4 overflow-auto font-mono text-xs">
        {logs.map((l, i) => (
          <div key={i} className="mb-1 text-gray-300">{l}</div>
        ))}
        {logs.length === 0 && <div className="text-gray-600">System logs will appear here...</div>}
      </div>
    </div>
  );
};

const OpsStatusPanel = ({ token }: { token: string }) => {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/api/admin/ops/status`, {
        headers: {
          Authorization: `Bearer ${token}`,
          'x-admin-token': token
        }
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body?.error || 'Failed to load ops status');
      setData(body);
    } catch (err: any) {
      setError(err?.message || 'Failed to load ops status');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    startTransition(() => {
      load().catch(() => { });
    });
  }, []);

  const statusClass = (s: string) => {
    if (s === 'ok') return 'text-emerald-400';
    if (s === 'error') return 'text-red-400';
    return 'text-zinc-400';
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-cyan-300">Operations Status</h2>
        <button
          onClick={load}
          disabled={loading}
          className="rounded border border-cyan-600/40 bg-cyan-700/20 px-3 py-1.5 text-xs font-bold text-cyan-300 hover:bg-cyan-700/30 disabled:opacity-50"
        >
          {loading ? 'Refreshing...' : 'Refresh'}
        </button>
      </div>

      {error && (
        <div className="rounded border border-red-700/40 bg-red-900/20 p-3 text-sm text-red-300">{error}</div>
      )}

      {data && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="rounded border border-gray-700 bg-black/40 p-3">
            <div className="text-xs text-zinc-400 mb-1">GitHub</div>
            <div className={`text-sm font-bold ${statusClass(data.github?.status)}`}>{data.github?.status || 'unavailable'}</div>
            <div className="text-xs text-zinc-300 break-all mt-1">{data.github?.repo || '—'}</div>
            <div className="text-xs text-zinc-500 break-all">{data.github?.commit || '—'}</div>
          </div>

          <div className="rounded border border-gray-700 bg-black/40 p-3">
            <div className="text-xs text-zinc-400 mb-1">Cloudflare</div>
            <div className={`text-sm font-bold ${statusClass(data.cloudflare?.status)}`}>{data.cloudflare?.status || 'unavailable'}</div>
            <div className="text-xs text-zinc-300 break-all mt-1">{data.cloudflare?.project || '—'}</div>
            <div className="text-xs text-zinc-500 break-all">{data.cloudflare?.latestDeploymentId || '—'}</div>
          </div>

          <div className="rounded border border-gray-700 bg-black/40 p-3">
            <div className="text-xs text-zinc-400 mb-1">Koyeb</div>
            <div className={`text-sm font-bold ${statusClass(data.koyeb?.status)}`}>{data.koyeb?.status || 'unavailable'}</div>
            <div className="text-xs text-zinc-300 break-all mt-1">{data.koyeb?.serviceId || '—'}</div>
            <div className="text-xs text-zinc-500 break-all">{data.koyeb?.latestDeploymentId || '—'}</div>
          </div>

          <div className="rounded border border-gray-700 bg-black/40 p-3">
            <div className="text-xs text-zinc-400 mb-1">Database</div>
            <div className={`text-sm font-bold ${statusClass(data.database?.status)}`}>{data.database?.status || 'unavailable'}</div>
            <div className="text-xs text-zinc-300 mt-1">Latency: {data.database?.latencyMs ?? '—'} ms</div>
            <div className="text-xs text-zinc-500 break-all">{data.database?.error || '—'}</div>
          </div>

          <div className="rounded border border-gray-700 bg-black/40 p-3 md:col-span-2">
            <div className="text-xs text-zinc-400 mb-1">Website</div>
            <div className="text-xs text-zinc-300 break-all">Domain: {data.website?.domain || '—'}</div>
            <div className="text-xs text-zinc-300 break-all">API Base: {data.website?.apiBase || '—'}</div>
            <div className="text-xs text-zinc-500 break-all mt-1">Generated At: {data.generatedAt || '—'}</div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SystemControl;
