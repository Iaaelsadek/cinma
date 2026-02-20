import React, { useState, useEffect, useRef } from 'react';
import { Terminal, Database, FileCode, Play, Server, Save, RefreshCw, HardDrive, Command, Folder, File, ChevronRight, ChevronDown, Trash, Upload } from 'lucide-react';
import { toast } from 'sonner';
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
          GOD MODE CONTROL
        </h1>
        <div className="flex gap-2">
          <TabButton id="terminal" icon={Terminal} label="Terminal" active={activeTab} set={setActiveTab} />
          <TabButton id="files" icon={FileCode} label="Files" active={activeTab} set={setActiveTab} />
          <TabButton id="database" icon={Database} label="Database" active={activeTab} set={setActiveTab} />
          <TabButton id="engines" icon={Play} label="Engines" active={activeTab} set={setActiveTab} />
        </div>
      </div>

      <div className="bg-gray-900/50 rounded-lg border border-gray-800 min-h-[600px] p-4">
        {activeTab === 'terminal' && <TerminalView token={token} />}
        {activeTab === 'files' && <FileManager token={token} />}
        {activeTab === 'database' && <DatabaseManager token={token} />}
        {activeTab === 'engines' && <EngineManager token={token} />}
      </div>
    </div>
  );
};

const TabButton = ({ id, icon: Icon, label, active, set }: any) => (
  <button
    onClick={() => set(id)}
    className={`px-4 py-2 rounded-md flex items-center gap-2 transition-colors ${
      active === id ? 'bg-cyan-600 text-white' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
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
    { label: '🔄 Restart Server', command: 'pm2 restart all' },
    { label: '🚀 Deploy', command: 'git pull && npm run build && pm2 restart all' },
    { label: '🧹 Clear Cache', command: 'npm run cache:clear' },
    { label: '📥 Auto-Import Content', command: 'npm run import:content' }
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
        Warning: Commands run on the server with full privileges. Be careful.
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
  
  const loadPath = async (p: string) => {
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
    } catch (err) {
      toast.error('Failed to load path');
    }
  };

  const saveFile = async () => {
    if (!currentFile) return;
    try {
      await fetch(`${API_BASE}/api/admin/fs`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-admin-token': token },
        body: JSON.stringify({ path: currentFile, content })
      });
      toast.success('File saved');
    } catch (err) {
      toast.error('Failed to save');
    }
  };

  useEffect(() => { loadPath('.'); }, []);

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
          {files.sort((a,b) => (a.type === 'dir' ? -1 : 1)).map(f => (
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
    } catch (err) {
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

  const runEngine = async (type: string) => {
    setRunning(true);
    setLogs(prev => [...prev, `Starting ${type}...`]);
    try {
      let endpoint = '/api/admin/sync'; // default
      if (type === 'anime') endpoint = '/api/admin/refresh/anime';
      if (type === 'quran') endpoint = '/api/admin/refresh/quran';
      
      const res = await fetch(`${API_BASE}${endpoint}`, {
        method: 'POST',
        headers: { 'x-admin-token': token }
      });
      const data = await res.json();
      if (data.logs) {
         setLogs(prev => [...prev, ...data.logs]);
      }
      setLogs(prev => [...prev, `Status: ${data.ok ? 'SUCCESS' : 'FAILED'}`]);
    } catch (err: any) {
      setLogs(prev => [...prev, `Error: ${err.message}`]);
    }
    setRunning(false);
  };

  return (
    <div className="grid grid-cols-3 gap-4 h-[500px]">
      <div className="col-span-1 space-y-4">
        <EngineCard title="Master Engine" desc="Movies & Series (TMDB)" onClick={() => runEngine('master')} running={running} />
        <EngineCard title="Anime Engine" desc="Fetch Anime Data" onClick={() => runEngine('anime')} running={running} />
        <EngineCard title="Quran Engine" desc="Update Quran Data" onClick={() => runEngine('quran')} running={running} />
        
        <div className="mt-8 border-t border-gray-800 pt-4">
          <h3 className="font-bold mb-2">Deploy / System</h3>
          <div className="grid grid-cols-2 gap-2 mb-2">
            <button 
               onClick={async () => {
                  setRunning(true);
                  setLogs(p => [...p, 'Installing dependencies...']);
                  try {
                    const res = await fetch(`${API_BASE}/api/admin/exec`, {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json', 'x-admin-token': '' },
                      body: JSON.stringify({ command: 'pip install -r backend/requirements.txt' })
                    });
                    const d = await res.json();
                    setLogs(p => [...p, d.stdout, d.stderr]);
                  } catch(e: any) { setLogs(p => [...p, e.message]); }
                  setRunning(false);
               }}
               className="bg-green-600 hover:bg-green-700 py-2 rounded font-bold text-sm"
            >
               📦 INSTALL DEPS
            </button>
            <button 
               onClick={async () => {
                  setRunning(true);
                  setLogs(p => [...p, 'Restarting Server (via PM2)...']);
                  try {
                    const res = await fetch(`${API_BASE}/api/admin/exec`, {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json', 'x-admin-token': '' },
                      body: JSON.stringify({ command: 'pm2 restart all' })
                    });
                    const d = await res.json();
                    setLogs(p => [...p, d.stdout, d.stderr]);
                  } catch(e: any) { setLogs(p => [...p, e.message]); }
                  setRunning(false);
               }}
               className="bg-yellow-600 hover:bg-yellow-700 py-2 rounded font-bold text-sm"
            >
               🔄 RESTART SERVER
            </button>
          </div>
          <button 
             onClick={async () => {
                setRunning(true);
                setLogs(p => [...p, 'Deploying...']);
                try {
                  const res = await fetch(`${API_BASE}/api/admin/exec`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ command: 'npm run build && git add . && git commit -m "Admin Deploy" && git push' })
                  });
                  const d = await res.json();
                  setLogs(p => [...p, d.stdout, d.stderr]);
                } catch(e: any) { setLogs(p => [...p, e.message]); }
                setRunning(false);
             }}
             className="w-full bg-purple-600 hover:bg-purple-700 py-3 rounded font-bold"
          >
             🚀 DEPLOY TO PRODUCTION
          </button>
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

const EngineCard = ({ title, desc, onClick, running }: any) => (
  <button 
    onClick={onClick}
    disabled={running}
    className="w-full bg-gray-800 hover:bg-gray-700 p-4 rounded text-left border border-gray-700 transition-all active:scale-95"
  >
    <div className="font-bold text-lg text-cyan-400">{title}</div>
    <div className="text-sm text-gray-400">{desc}</div>
  </button>
);

export default SystemControl;
