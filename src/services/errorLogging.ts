import { createClient } from '@supabase/supabase-js'
import { toast } from 'sonner';
import { CONFIG } from '../lib/constants';

// Define process for browser environment
declare const process: { env: { NODE_ENV?: string } } | undefined;

// Configuration
// Using public anon key for client-side logging. RLS must allow inserts.
const SUPABASE_URL = CONFIG.SUPABASE_URL;
const SUPABASE_KEY = CONFIG.SUPABASE_ANON_KEY;

// Error severity levels
export type ErrorSeverity = 'low' | 'medium' | 'high' | 'critical';

// Error categories
export type ErrorCategory = 
  | 'auth' 
  | 'database' 
  | 'network' 
  | 'validation' 
  | 'system' 
  | 'user_action' 
  | 'admin' 
  | 'api' 
  | 'media'
  | 'ads'
  | 'unknown';

// Error interface
export interface AppError {
  id?: string;
  user_id?: string;
  message: string;
  stack?: string;
  severity: ErrorSeverity;
  category: ErrorCategory;
  context?: Record<string, any>;
  url?: string;
  user_agent?: string;
  timestamp?: string;
  resolved?: boolean;
}

class ErrorLoggingService {
  private supabase;
  private isEnabled: boolean = false; // DISABLED BY DEFAULT
  private queue: AppError[] = [];
  private isProcessing: boolean = false;
  private batchSize: number = 10;
  private flushInterval: number = 5000; // 5 seconds
  private flushTimer?: ReturnType<typeof setTimeout>;
  private readonly STORAGE_KEY = 'error_logs_queue';
  private lastToast: { message: string, time: number } | null = null;

  constructor() {
    this.supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });
    
    // LOGGING DISABLED - No queue loading, no flushing, no listeners
    // this.loadQueue();
    // this.startPeriodicFlush();
    
    // Handle window errors - DISABLED
    /*
    if (typeof window !== 'undefined') {
      this.setupGlobalErrorHandlers();
      // Save queue before unload
      window.addEventListener('beforeunload', () => this.saveQueue());
      // Flush queue when coming back online
      window.addEventListener('online', () => this.processQueue());
    }
    */
  }

  private loadQueue() {
    // DISABLED
    return;
  }

  private saveQueue() {
    // DISABLED
    if (typeof localStorage === 'undefined') return;
    localStorage.removeItem(this.STORAGE_KEY);
  }

  private setupGlobalErrorHandlers() {
    // DISABLED
    return;
  }

  private startPeriodicFlush() {
    // DISABLED
    return;
  }

  private async processQueue() {
    // DISABLED - Just clear queue to be safe
    this.queue = [];
    return;
  }

  public logError(error: AppError) {
    // DISABLED
    return;
  }

  public captureException(error: any, context?: Record<string, any>) {
    // DISABLED
    return;
  }
  
  private generateErrorId(): string {
    return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
  }
}

export const errorLogger = new ErrorLoggingService();

// Added back exported helper function to satisfy build
export const logAuthError = (...args: any[]) => {
  // DISABLED
  return;
};
