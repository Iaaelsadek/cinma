// ✅ API Client - Centralized API calls with error handling
import axios, { AxiosError } from 'axios'

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001'

export const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Request interceptor - Add CSRF token if available
api.interceptors.request.use(
  (config) => {
    // Get CSRF token from cookie or localStorage
    const csrfToken = getCsrfToken()
    if (csrfToken) {
      config.headers['X-CSRF-Token'] = csrfToken
    }
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

// Response interceptor - Handle errors globally
api.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    if (error.response) {
      // Server responded with error
      const status = error.response.status
      
      if (status === 401) {
        // Unauthorized - redirect to login
        window.location.href = '/login'
      } else if (status === 403) {
        // Forbidden - show error
      } else if (status === 429) {
        // Rate limited
      } else if (status >= 500) {
        // Server error
      }
    } else if (error.request) {
      // Request made but no response
    }
    
    return Promise.reject(error)
  }
)

// Helper to get CSRF token
function getCsrfToken(): string | null {
  // Try to get from cookie
  const cookies = document.cookie.split(';')
  for (const cookie of cookies) {
    const [name, value] = cookie.trim().split('=')
    if (name === '_csrf') {
      return value
    }
  }
  
  // Try to get from localStorage
  return localStorage.getItem('csrf_token')
}

// Helper to fetch and store CSRF token
export async function fetchCsrfToken(): Promise<string> {
  try {
    const response = await axios.get(`${API_BASE_URL}/api/csrf-token`)
    const token = response.data.csrfToken
    
    if (token) {
      localStorage.setItem('csrf_token', token)
      return token
    }
    
    throw new Error('No CSRF token received')
  } catch (error) {
    throw error
  }
}

// API Methods
export const chatAPI = {
  sendMessage: async (message: string, conversationHistory: any[]) => {
    const response = await api.post('/api/chat', {
      message,
      conversationHistory,
    })
    return response.data
  },
}

export const requestsAPI = {
  list: async (status: string = 'all', limit: number = 50, offset: number = 0) => {
    const response = await api.get('/api/admin/requests', {
      params: { status, limit, offset },
      headers: {
        Authorization: `Bearer ${(await import('@supabase/supabase-js')).createClient(
          import.meta.env.VITE_SUPABASE_URL,
          import.meta.env.VITE_SUPABASE_ANON_KEY
        ).auth.getSession().then(({ data }) => data.session?.access_token || '')}`
      }
    })
    return response.data
  },
  
  update: async (id: string, data: any) => {
    const response = await api.put('/api/admin/requests', data, {
      params: { id },
      headers: {
        Authorization: `Bearer ${(await import('@supabase/supabase-js')).createClient(
          import.meta.env.VITE_SUPABASE_URL,
          import.meta.env.VITE_SUPABASE_ANON_KEY
        ).auth.getSession().then(({ data }) => data.session?.access_token || '')}`
      }
    })
    return response.data
  },
  
  delete: async (id: string) => {
    const response = await api.delete('/api/admin/requests', {
      params: { id },
      headers: {
        Authorization: `Bearer ${(await import('@supabase/supabase-js')).createClient(
          import.meta.env.VITE_SUPABASE_URL,
          import.meta.env.VITE_SUPABASE_ANON_KEY
        ).auth.getSession().then(({ data }) => data.session?.access_token || '')}`
      }
    })
    return response.data
  }
}

export const tmdbAPI = {
  search: async (query: string, type: 'movie' | 'tv' = 'movie') => {
    const response = await api.get(`/api/tmdb/search/${type}`, {
      params: { query },
    })
    return response.data
  },
  
  getDetails: async (id: number, type: 'movie' | 'tv' = 'movie') => {
    const response = await api.get(`/api/tmdb/${type}/${id}`)
    return response.data
  },
}
