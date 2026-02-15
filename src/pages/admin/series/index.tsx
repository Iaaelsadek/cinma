import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { supabase } from '../../../lib/supabase'

type SeriesRow = { id: number; name: string; poster_path: string | null; rating_color: 'green' | 'yellow' | 'red' | null }

async function getSeries() {
  const { data, error } = await supabase.from('tv_series').select('id,name,poster_path,rating_color').order('first_air_date', { ascending: false }).limit(100)
  if (error) throw error
  return data as SeriesRow[]
}

const AdminSeriesList = () => {
  const q = useQuery({ queryKey: ['admin-series'], queryFn: getSeries })
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">المسلسلات</h1>
      </div>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-5">
        {(q.data || []).map((s) => {
          const poster = s.poster_path ? `https://image.tmdb.org/t/p/w300${s.poster_path}` : ''
          return (
            <Link key={s.id} to={`/admin/series/${s.id}`} className="rounded-lg border border-zinc-800 p-3">
              <div className="aspect-[2/3] w-full overflow-hidden rounded-md bg-zinc-800">
                {poster && <img src={poster} alt={s.name} className="h-full w-full object-cover" />}
              </div>
              <div className="mt-2 truncate text-sm">{s.name}</div>
              <div className="text-xs text-zinc-400">{s.rating_color || '—'}</div>
            </Link>
          )
        })}
        {q.isLoading && Array.from({ length: 10 }).map((_, i) => (
          <div key={i} className="rounded-lg border border-zinc-800 p-3">
            <div className="aspect-[2/3] w-full animate-pulse rounded-md bg-zinc-800" />
            <div className="mt-2 h-4 w-2/3 animate-pulse rounded bg-zinc-800" />
          </div>
        ))}
      </div>
    </div>
  )
}

export default AdminSeriesList
