import { supabase } from './supabase';
import { errorLogger } from '../services/errorLogging';

const API_BASE = (import.meta.env.VITE_API_URL || 'http://localhost:3001') + '/api/admin/proxy';

export async function fetchTable(table: string, options: { select?: string, order?: string, orderAsc?: boolean, eq?: Record<string, any>, limit?: number } = {}) {
  try {
    let q = supabase.from(table).select(options.select || '*');
    
    if (options.order) {
      q = q.order(options.order, { ascending: options.orderAsc ?? true });
    }
    if (options.limit) {
      q = q.limit(options.limit);
    }
    if (options.eq) {
      for (const [k, v] of Object.entries(options.eq)) {
        q = q.eq(k, v);
      }
    }
    
    const { data, error } = await q;
    if (error) throw error;
    return data;
  } catch (err) {
    errorLogger.logError({
      message: `Direct fetch for ${table} failed, trying proxy`,
      severity: 'low',
      category: 'database',
      context: { error: err, table }
    })
    try {
      const params = new URLSearchParams();
      if (options.select) params.append('select', options.select);
      if (options.order) params.append('order', options.order);
      if (options.orderAsc !== undefined) params.append('orderAsc', String(options.orderAsc));
      if (options.limit) params.append('limit', String(options.limit));
      if (options.eq) params.append('eq', JSON.stringify(options.eq));
      
      const res = await fetch(`${API_BASE}/${table}?${params.toString()}`);
      if (!res.ok) throw new Error(`Proxy error: ${res.statusText}`);
      return await res.json();
    } catch (proxyErr) {
      errorLogger.logError({
        message: `Proxy fetch for ${table} failed`,
        severity: 'high',
        category: 'network',
        context: { error: proxyErr, table }
      });
      throw err; // Throw original error if proxy also fails
    }
  }
}

export async function insertTable(table: string, data: any) {
  try {
    const { data: res, error } = await supabase.from(table).insert(data).select().single();
    if (error) throw error;
    return res;
  } catch (err) {
    errorLogger.logError({
      message: `Direct insert for ${table} failed, trying proxy`,
      severity: 'low',
      category: 'database',
      context: { error: err, table }
    })
    try {
      const res = await fetch(`${API_BASE}/${table}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      if (!res.ok) throw new Error(`Proxy error: ${res.statusText}`);
      return await res.json();
    } catch (proxyErr) {
      throw err;
    }
  }
}

export async function updateTable(table: string, id: string | number, data: any) {
  try {
    const { data: res, error } = await supabase.from(table).update(data).eq('id', id).select().single();
    if (error) throw error;
    return res;
  } catch (err) {
    errorLogger.logError({
      message: `Direct update for ${table} failed, trying proxy`,
      severity: 'low',
      category: 'database',
      context: { error: err, table, id }
    })
    try {
      const res = await fetch(`${API_BASE}/${table}/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      if (!res.ok) throw new Error(`Proxy error: ${res.statusText}`);
      return await res.json();
    } catch (proxyErr) {
      throw err;
    }
  }
}

export async function deleteTable(table: string, id: string | number) {
  try {
    const { error } = await supabase.from(table).delete().eq('id', id);
    if (error) throw error;
    return true;
  } catch (err) {
    errorLogger.logError({
      message: `Direct delete for ${table} failed, trying proxy`,
      severity: 'low',
      category: 'database',
      context: { error: err, table, id }
    })
    try {
      const res = await fetch(`${API_BASE}/${table}/${id}`, {
        method: 'DELETE'
      });
      if (!res.ok) throw new Error(`Proxy error: ${res.statusText}`);
      return true;
    } catch (proxyErr) {
      throw err;
    }
  }
}
