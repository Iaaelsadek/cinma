import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { tmdb } from '../../lib/tmdb';
import { CheckCircle, Loader2, Search, Film, Tv, Trash2, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { requestsAPI } from '../../lib/api';

interface Request {
  id: string;
  title: string;
  notes: string | null;
  user_id: string;
  created_at: string;
  status: string;
  processed_at: string | null;
  media_type?: 'movie' | 'tv' | null;
  tmdb_id?: number | null;
}

interface TmdbSearchResult {
  id: number;
  title?: string;
  name?: string;
  poster_path: string | null;
  overview: string;
  release_date?: string;
  first_air_date?: string;
  vote_average: number;
}

const ProcessRequests = () => {
  const [requests, setRequests] = useState<Request[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<string | null>(null);
  const [searchResults, setSearchResults] = useState<Record<string, TmdbSearchResult[]>>({});
  const [selectedMediaType, setSelectedMediaType] = useState<Record<string, 'movie' | 'tv'>>({});
  const [selectedTmdbId, setSelectedTmdbId] = useState<Record<string, number | string>>({});
  const [manualQueries, setManualQueries] = useState<Record<string, string>>({});
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const fetchRequests = async () => {
    setLoading(true);
    try {
      // Fetch requests directly from our API which reads from CockroachDB
      const data = await requestsAPI.list('all', 100, 0);
      setRequests(data.requests || []);

      // Auto-populate TMDB IDs and media types if they exist in the DB
      if (data.requests) {
        const types: Record<string, 'movie' | 'tv'> = {};
        const tmdbIds: Record<string, number> = {};

        data.requests.forEach((req: Request) => {
          if (req.media_type) types[req.id] = req.media_type;
          if (req.tmdb_id) tmdbIds[req.id] = req.tmdb_id;
        });

        setSelectedMediaType((prev) => ({ ...prev, ...types }));
        setSelectedTmdbId((prev) => ({ ...prev, ...tmdbIds }));
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'فشل تحميل الطلبات' });
    } finally {
      setLoading(false);
    }
  };

  // Manual Delete Request
  const deleteRequest = async (id: string) => {
    if (!window.confirm('هل أنت متأكد من حذف هذا الطلب؟')) return;

    try {
      await requestsAPI.delete(id);
      setRequests((prev) => prev.filter((req) => req.id !== id));
      setMessage({ type: 'success', text: 'تم حذف الطلب بنجاح' });
    } catch (error) {
      setMessage({ type: 'error', text: 'فشل حذف الطلب' });
    }
  };

  // Update request details (notes, status, etc) without processing it via TMDB
  const updateRequest = async (id: string, updates: Partial<Request>) => {
    try {
      await requestsAPI.update(id, updates);
      // Update local state without refetching everything
      setRequests((prev) => prev.map((req) => (req.id === id ? { ...req, ...updates } : req)));
      toast.success('تم تحديث الطلب');
    } catch (error) {
      toast.error('فشل تحديث الطلب');
    }
  };

  const searchTmdb = async (requestId: string, title: string, mediaType: 'movie' | 'tv') => {
    try {
      const endpoint = mediaType === 'movie' ? '/search/movie' : '/search/tv';
      const response = await tmdb.get(endpoint, {
        params: {
          query: title,
          language: 'ar',
        },
      });

      setSearchResults((prev) => ({
        ...prev,
        [requestId]: response.data.results.slice(0, 5),
      }));
    } catch (error) {
      setMessage({ type: 'error', text: 'فشل البحث في TMDB' });
    }
  };

  const processRequest = async (request: Request) => {
    const mediaType = selectedMediaType[request.id];
    const tmdbId = selectedTmdbId[request.id];

    if (!mediaType) {
      setMessage({ type: 'error', text: 'يرجى اختيار نوع المحتوى (فيلم أو مسلسل)' });
      return;
    }

    setProcessing(request.id);
    setMessage(null);

    try {
      // Get current session token
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session?.access_token) {
        throw new Error('Not authenticated');
      }

      // Get CSRF token
      const csrfResponse = await fetch('/api/csrf-token', {
        credentials: 'include',
      });
      const { csrfToken } = await csrfResponse.json();

      // Call backend API
      const response = await fetch('/api/admin/process-request', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
          'X-CSRF-Token': csrfToken,
        },
        credentials: 'include',
        body: JSON.stringify({
          request_id: request.id,
          media_type: mediaType,
          tmdb_id: tmdbId,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Processing failed');
      }

      const result = await response.json();
      setMessage({
        type: 'success',
        text: `تمت معالجة "${result.title}" بنجاح`,
      });

      // Refresh requests list
      await fetchRequests();
    } catch (error: any) {
      setMessage({
        type: 'error',
        text: error.message || 'فشلت معالجة الطلب',
      });
    } finally {
      setProcessing(null);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, []);

  if (loading) {
    return <div className='p-8 text-center text-zinc-500 animate-pulse'>جاري تحميل الطلبات...</div>;
  }

  return (
    <div className='space-y-6 p-4'>
      <div className='flex items-center justify-between'>
        <div>
          <h1 className='text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-zinc-400'>
            طلبات المحتوى
          </h1>
          <p className='text-xs text-zinc-500'>معالجة طلبات المستخدمين وإضافة المحتوى من TMDB</p>
        </div>
        <button
          onClick={fetchRequests}
          className='text-xs bg-zinc-800 hover:bg-zinc-700 text-white px-3 py-1.5 rounded-lg transition-colors'
        >
          تحديث
        </button>
      </div>

      {message && (
        <div
          className={`p-4 rounded-lg border ${
            message.type === 'success'
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
              : 'bg-rose-500/10 border-rose-500/30 text-rose-400'
          }`}
        >
          {message.text}
        </div>
      )}

      <div className='space-y-4'>
        {requests.length === 0 ? (
          <div className='bg-zinc-900/40 border border-zinc-800/50 rounded-xl p-8 text-center text-zinc-500'>
            لا توجد طلبات
          </div>
        ) : (
          requests.map((request) => {
            const mediaType = selectedMediaType[request.id];
            const results = searchResults[request.id] || [];
            const isProcessed = request.status === 'processed';

            return (
              <div
                key={request.id}
                className={`bg-zinc-900/40 border rounded-xl p-4 backdrop-blur-sm transition-colors ${isProcessed ? 'border-emerald-500/20' : request.status === 'failed' ? 'border-rose-500/20' : 'border-zinc-800/50'}`}
              >
                <div className='flex items-start justify-between mb-4'>
                  <div className='flex-1'>
                    <div className='flex items-center gap-2 mb-1'>
                      <h3 className='text-lg font-semibold text-white'>{request.title}</h3>
                      {request.status === 'failed' && (
                        <span className='text-xs bg-rose-500/10 text-rose-400 px-2 py-0.5 rounded-full border border-rose-500/20'>
                          فشلت المعالجة التلقائية
                        </span>
                      )}
                    </div>

                    <div className='text-sm text-zinc-400 mb-2 flex flex-col gap-1'>
                      {request.notes ? (
                        <p>
                          <span className='text-zinc-500'>ملاحظات:</span> {request.notes}
                        </p>
                      ) : (
                        <p className='text-zinc-600 italic'>بدون ملاحظات إضافية</p>
                      )}

                      <div className='flex items-center gap-4 text-xs mt-2 text-zinc-500'>
                        <span>
                          تاريخ الطلب: {new Date(request.created_at).toLocaleDateString('ar')}
                        </span>
                        {request.tmdb_id && (
                          <span className='text-cyan-400'>TMDB ID: {request.tmdb_id}</span>
                        )}
                        {isProcessed && request.processed_at && (
                          <span className='text-emerald-400'>
                            ✓ تمت المعالجة:{' '}
                            {new Date(request.processed_at).toLocaleDateString('ar')}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Delete button always available */}
                  <button
                    onClick={() => deleteRequest(request.id)}
                    className='p-2 text-zinc-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors'
                    title='حذف الطلب'
                  >
                    <Trash2 size={16} />
                  </button>
                </div>

                <div className='flex items-center justify-between mt-4 pt-4 border-t border-white/5'>
                  {isProcessed ? (
                    <div className='flex items-center gap-4 w-full'>
                      <div className='flex items-center gap-2 text-emerald-400 text-sm bg-emerald-500/10 px-3 py-1.5 rounded-lg border border-emerald-500/20'>
                        <CheckCircle size={16} />
                        <span className='font-bold'>تمت الإضافة بنجاح</span>
                      </div>

                      <div className='flex-1'></div>

                      <button
                        onClick={() => updateRequest(request.id, { status: 'pending' })}
                        className='text-xs flex items-center gap-1 text-zinc-400 hover:text-white px-2 py-1 bg-white/5 hover:bg-white/10 rounded transition-colors'
                      >
                        إعادة المعالجة
                      </button>
                    </div>
                  ) : (
                    <div className='flex flex-col w-full gap-4'>
                      {/* Search Controls */}
                      <div className='flex flex-wrap items-center gap-2 w-full'>
                        <select
                          value={mediaType || ''}
                          onChange={(e) => {
                            const type = e.target.value as 'movie' | 'tv';
                            setSelectedMediaType((prev) => ({ ...prev, [request.id]: type }));
                            setSearchResults((prev) => ({ ...prev, [request.id]: [] }));
                            if (!request.tmdb_id)
                              setSelectedTmdbId((prev) => ({ ...prev, [request.id]: 0 }));
                          }}
                          className='bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-cyan-500'
                        >
                          <option value=''>اختر النوع...</option>
                          <option value='movie'>🎬 فيلم</option>
                          <option value='tv'>📺 مسلسل</option>
                        </select>

                        <div className='flex-1 relative min-w-[200px]'>
                          <input
                            type='text'
                            placeholder='بحث في TMDB...'
                            value={
                              manualQueries[request.id] !== undefined
                                ? manualQueries[request.id]
                                : request.title
                            }
                            onChange={(e) =>
                              setManualQueries((prev) => ({
                                ...prev,
                                [request.id]: e.target.value,
                              }))
                            }
                            className='w-full bg-zinc-800 border border-zinc-700 rounded-lg pl-10 pr-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-cyan-500'
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' && mediaType) {
                                searchTmdb(
                                  request.id,
                                  manualQueries[request.id] || request.title,
                                  mediaType
                                );
                              }
                            }}
                          />
                          <Search
                            size={14}
                            className='absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500'
                          />
                        </div>

                        <button
                          onClick={() => {
                            if (!mediaType) {
                              toast.error('اختر النوع أولاً');
                              return;
                            }
                            searchTmdb(
                              request.id,
                              manualQueries[request.id] || request.title,
                              mediaType
                            );
                          }}
                          disabled={!mediaType}
                          className='bg-zinc-700 hover:bg-zinc-600 disabled:opacity-50 text-white px-4 py-2 rounded-lg transition-colors flex items-center gap-2 text-sm font-medium'
                        >
                          بحث
                        </button>

                        {/* Direct ID Input */}
                        <div className='flex items-center gap-2 border-r border-white/10 pl-2 ml-2'>
                          <input
                            type='number'
                            placeholder='TMDB ID...'
                            value={selectedTmdbId[request.id] || ''}
                            onChange={(e) =>
                              setSelectedTmdbId((prev) => ({
                                ...prev,
                                [request.id]: parseInt(e.target.value) || 0,
                              }))
                            }
                            className='w-24 bg-zinc-900 border border-zinc-700 rounded-lg px-2 py-2 text-sm text-white text-center focus:outline-none focus:ring-2 focus:ring-cyan-500'
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {!isProcessed && results.length > 0 && (
                  <div className='space-y-2 mb-4'>
                    <h4 className='text-sm font-semibold text-zinc-400'>نتائج البحث من TMDB:</h4>
                    <div className='grid gap-2'>
                      {results.map((result) => (
                        <div
                          key={result.id}
                          onClick={() =>
                            setSelectedTmdbId((prev) => ({ ...prev, [request.id]: result.id }))
                          }
                          className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                            selectedTmdbId[request.id] === result.id
                              ? 'bg-cyan-500/10 border-cyan-500/50'
                              : 'bg-zinc-800/50 border-zinc-700/50 hover:border-zinc-600'
                          }`}
                        >
                          {result.poster_path ? (
                            <img
                              src={`https://image.tmdb.org/t/p/w92${result.poster_path}`}
                              alt={result.title || result.name}
                              className='w-12 h-18 object-cover rounded'
                            />
                          ) : (
                            <div className='w-12 h-18 bg-zinc-700 rounded flex items-center justify-center'>
                              {mediaType === 'movie' ? <Film size={16} /> : <Tv size={16} />}
                            </div>
                          )}
                          <div className='flex-1 min-w-0'>
                            <h5 className='text-sm font-semibold text-white truncate'>
                              {result.title || result.name}
                            </h5>
                            <p className='text-xs text-zinc-400 line-clamp-2'>{result.overview}</p>
                            <div className='flex items-center gap-3 mt-1 text-xs text-zinc-500'>
                              <span>{result.release_date || result.first_air_date}</span>
                              <span>⭐ {result.vote_average.toFixed(1)}</span>
                              <span className='text-cyan-400'>TMDB ID: {result.id}</span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {!isProcessed && mediaType && (
                  <div className='flex items-center justify-between bg-black/20 p-3 rounded-lg border border-white/5'>
                    <div className='text-xs text-zinc-500 flex items-center gap-2'>
                      <AlertCircle size={14} />
                      تأكد من اختيار العمل الصحيح قبل المعالجة
                    </div>
                    <button
                      onClick={() => processRequest(request)}
                      disabled={
                        processing === request.id || !selectedTmdbId[request.id] || !mediaType
                      }
                      className='bg-cyan-600 hover:bg-cyan-500 disabled:bg-zinc-800 disabled:text-zinc-600 text-white px-6 py-2 rounded-lg transition-colors flex items-center gap-2 text-sm font-bold shadow-lg shadow-cyan-900/20'
                    >
                      {processing === request.id ? (
                        <>
                          <Loader2 size={16} className='animate-spin' />
                          جاري الإضافة...
                        </>
                      ) : (
                        <>
                          <CheckCircle size={16} />
                          اعتماد وإضافة للموقع
                        </>
                      )}
                    </button>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default ProcessRequests;
