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
  private isEnabled: boolean = true;
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
    
    // Load offline queue
    this.loadQueue();
    
    // Start periodic flush
    this.startPeriodicFlush();
    
    // Handle window errors
    if (typeof window !== 'undefined') {
      this.setupGlobalErrorHandlers();
      // Save queue before unload
      window.addEventListener('beforeunload', () => this.saveQueue());
      // Flush queue when coming back online
      window.addEventListener('online', () => this.processQueue());
    }
  }

  private loadQueue() {
    if (typeof localStorage === 'undefined') return;
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          // Merge stored queue with current queue, avoiding duplicates by ID
          const currentIds = new Set(this.queue.map(e => e.id));
          const newItems = parsed.filter((e: AppError) => e.id && !currentIds.has(e.id));
          this.queue.push(...newItems);
        }
      }
    } catch (e) {
      console.warn('Failed to load error queue', e);
    }
  }

  private saveQueue() {
    if (typeof localStorage === 'undefined') return;
    try {
      if (this.queue.length > 0) {
        // Keep only last 50 errors to avoid quota issues
        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.queue.slice(-50)));
      } else {
        localStorage.removeItem(this.STORAGE_KEY);
      }
    } catch (e) {
      // Ignore storage errors
    }
  }

  private setupGlobalErrorHandlers() {
    // Global error handler
    window.addEventListener('error', (event) => {
      this.logError({
        message: event.error?.message || event.message || 'Unknown error',
        stack: event.error?.stack,
        severity: 'high',
        category: 'system',
        context: {
          filename: event.filename,
          lineno: event.lineno,
          colno: event.colno,
          error_type: event.error?.name
        }
      });
    });

    // Unhandled promise rejections
    window.addEventListener('unhandledrejection', (event) => {
      this.logError({
        message: event.reason?.message || 'Unhandled promise rejection',
        stack: event.reason?.stack,
        severity: 'medium',
        category: 'system',
        context: {
          reason: event.reason
        }
      });
    });
  }

  private startPeriodicFlush() {
    this.flushTimer = setInterval(() => {
      if (this.queue.length > 0) {
        this.processQueue();
      }
    }, this.flushInterval);
  }

  private async processQueue() {
    // Check network connectivity first
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      return;
    }

    if (this.isProcessing || this.queue.length === 0) return;
    
    this.isProcessing = true;
    const batch = this.queue.splice(0, this.batchSize);
    
    try {
      const { error } = await this.supabase
        .from('app_diagnostics')
        .insert(batch.map(error => ({
          ...error,
          timestamp: error.timestamp || new Date().toISOString()
        })));
      
      if (error) {
        console.error('Failed to log errors to database:', error);
        // Re-add failed items to queue
        this.queue.unshift(...batch);
        this.saveQueue();
      } else {
        this.saveQueue();
      }
    } catch (error) {
      console.error('Error processing error queue:', error);
      // Re-add failed items to queue
      this.queue.unshift(...batch);
      this.saveQueue();
    } finally {
      this.isProcessing = false;
    }
  }

  public logError(error: AppError) {
    if (!this.isEnabled) return;

    const enrichedError: AppError = {
      ...error,
      id: error.id || this.generateErrorId(),
      timestamp: error.timestamp || new Date().toISOString(),
      url: error.url || (typeof window !== 'undefined' ? window.location.href : undefined),
      user_agent: error.user_agent || (typeof window !== 'undefined' ? navigator.userAgent : undefined)
    };

    // Add to queue
    this.queue.push(enrichedError);
    this.saveQueue();

    // Show user-friendly message based on severity
    if (typeof window !== 'undefined') {
      this.showUserNotification(enrichedError);
    }

    // Process queue if it reaches batch size
    if (this.queue.length >= this.batchSize) {
      this.processQueue();
    }

    // Log to console in development
    if (typeof process !== 'undefined' && process?.env?.NODE_ENV === 'development') {
      console.group(`🚨 Error [${enrichedError.severity}] - ${enrichedError.category}`);
      console.error('Message:', enrichedError.message);
      console.error('Stack:', enrichedError.stack);
      console.error('Context:', enrichedError.context);
      console.groupEnd();
    }
  }

  private showUserNotification(error: AppError) {
    const message = this.getUserFriendlyMessage(error);
    
    // Prevent duplicate toasts
    const now = Date.now();
    if (this.lastToast && this.lastToast.message === message && now - this.lastToast.time < 3000) {
      return;
    }
    this.lastToast = { message, time: now };
    
    switch (error.severity) {
      case 'critical':
        toast.error(message, {
          duration: 10000,
          position: 'top-center'
        });
        break;
      case 'high':
        toast.error(message, {
          duration: 8000,
          position: 'top-center'
        });
        break;
      case 'medium':
        toast.warning(message, {
          duration: 5000,
          position: 'top-center'
        });
        break;
      case 'low':
        // Don't show low severity errors to users
        break;
    }
  }

  private getUserFriendlyMessage(error: AppError): string {
    // Arabic user-friendly messages
    const messages = {
      auth: {
        critical: 'حدث خطأ في المصادقة. يرجى تسجيل الدخول مرة أخرى.',
        high: 'فشلت عملية تسجيل الدخول. حاول مرة أخرى.',
        medium: 'مشكلة في المصادقة تم تسجيلها.',
        low: 'مشكلة بسيطة في المصادقة.'
      },
      database: {
        critical: 'خطأ في قاعدة البيانات. قد تكون بعض الميزات غير متاحة.',
        high: 'فشلت عملية قاعدة البيانات. حاول مرة أخرى.',
        medium: 'مشكلة في قاعدة البيانات تم تسجيلها.',
        low: 'مشكلة بسيطة في قاعدة البيانات.'
      },
      network: {
        critical: 'خطأ في الاتصال بالشبكة. تحقق من اتصالك بالإنترنت.',
        high: 'فشل الاتصال بالشبكة. حاول مرة أخرى.',
        medium: 'مشكلة في الشبكة تم تسجيلها.',
        low: 'مشكلة بسيطة في الشبكة.'
      },
      validation: {
        critical: 'خطأ في التحقق من البيانات. تحقق من المدخلات الخاصة بك.',
        high: 'بيانات غير صالحة. يرجى تصحيح المدخلات.',
        medium: 'مشكلة في التحقق من البيانات.',
        low: 'مشكلة بسيطة في التحقق.'
      },
      system: {
        critical: 'خطأ في النظام. قد تحتاج إلى إعادة تحميل الصفحة.',
        high: 'فشلت عملية النظام. حاول مرة أخرى.',
        medium: 'مشكلة في النظام تم تسجيلها.',
        low: 'مشكلة بسيطة في النظام.'
      },
      user_action: {
        critical: 'فشل الإجراء. حاول مرة أخرى أو اتصل بالدعم.',
        high: 'فشل الإجراء. حاول مرة أخرى.',
        medium: 'مشكلة في الإجراء تم تسجيلها.',
        low: 'مشكلة بسيطة في الإجراء.'
      },
      admin: {
        critical: 'خطأ في لوحة التحكم. اتصل بالمسؤول الفني.',
        high: 'فشلت عملية المسؤول. حاول مرة أخرى.',
        medium: 'مشكلة في لوحة التحكم تم تسجيلها.',
        low: 'مشكلة بسيطة في لوحة التحكم.'
      },
      api: {
        critical: 'خطأ في واجهة البرمجة. قد تكون بعض الميزات غير متاحة.',
        high: 'فشلت واجهة البرمجة. حاول مرة أخرى.',
        medium: 'مشكلة في واجهة البرمجة تم تسجيلها.',
        low: 'مشكلة بسيطة في واجهة البرمجة.'
      },
      media: {
        critical: 'خطأ في تشغيل الوسائط. حاول تحديث الصفحة.',
        high: 'فشل تشغيل الوسائط. حاول مرة أخرى.',
        medium: 'مشكلة في الوسائط تم تسجيلها.',
        low: 'مشكلة بسيطة في الوسائط.'
      },
      ads: {
        critical: 'خطأ في نظام الإعلانات.',
        high: 'فشل تحميل الإعلانات.',
        medium: 'مشكلة في الإعلانات تم تسجيلها.',
        low: 'مشكلة بسيطة في الإعلانات.'
      },
      unknown: {
        critical: 'حدث خطأ غير متوقع. حاول مرة أخرى أو اتصل بالدعم.',
        high: 'فشلت العملية. حاول مرة أخرى.',
        medium: 'مشكلة تم تسجيلها.',
        low: 'مشكلة بسيطة.'
      }
    };

    return messages[error.category]?.[error.severity] || messages.unknown[error.severity];
  }

  private generateErrorId(): string {
    return `err_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  public setEnabled(enabled: boolean) {
    this.isEnabled = enabled;
  }

  public async flush() {
    await this.processQueue();
  }

  public destroy() {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
    }
    return this.flush();
  }
}

// Create singleton instance safely
let instance: ErrorLoggingService;
try {
  instance = new ErrorLoggingService();
} catch (error) {
  console.error('Failed to initialize ErrorLoggingService:', error);
  // Fallback dummy service to prevent app crash
  instance = {
    logError: () => {},
    setEnabled: () => {},
    flush: async () => {},
    destroy: async () => {}
  } as any;
}

export const errorLogger = instance;

// Helper functions for common error scenarios
export const logAuthError = (message: string, error?: any, userId?: string) => {
  errorLogger.logError({
    message,
    stack: error?.stack,
    severity: 'high',
    category: 'auth',
    user_id: userId,
    context: { originalError: error?.message }
  });
};

export const logDatabaseError = (message: string, error?: any, userId?: string) => {
  errorLogger.logError({
    message,
    stack: error?.stack,
    severity: 'high',
    category: 'database',
    user_id: userId,
    context: { originalError: error?.message }
  });
};

export const logNetworkError = (message: string, error?: any, userId?: string) => {
  errorLogger.logError({
    message,
    stack: error?.stack,
    severity: 'medium',
    category: 'network',
    user_id: userId,
    context: { originalError: error?.message }
  });
};

export const logValidationError = (message: string, context?: Record<string, any>, userId?: string) => {
  errorLogger.logError({
    message,
    severity: 'low',
    category: 'validation',
    user_id: userId,
    context
  });
};

export const logAdminError = (message: string, error?: any, userId?: string) => {
  errorLogger.logError({
    message,
    stack: error?.stack,
    severity: 'high',
    category: 'admin',
    user_id: userId,
    context: { originalError: error?.message }
  });
};

export default errorLogger;