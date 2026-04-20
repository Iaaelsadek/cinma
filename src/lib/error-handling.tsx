import { useEffect } from 'react'
import { AlertCircle } from 'lucide-react'

/**
 * أنواع الأخطاء
 * Error Types
 */
export enum ErrorType {
  NETWORK_ERROR = 'NETWORK_ERROR',
  API_ERROR = 'API_ERROR',
  NOT_FOUND = 'NOT_FOUND',
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  UNKNOWN_ERROR = 'UNKNOWN_ERROR'
}

/**
 * واجهة الخطأ الموحدة
 * App Error Interface
 */
export interface AppError {
  type: ErrorType
  message: string
  details?: any
  timestamp: Date
  retryable: boolean
}

/**
 * معالج الأخطاء الرئيسي
 * Main Error Handler
 */
export class ErrorHandler {
  /**
   * معالجة خطأ API
   * Handle API Error
   */
  static handleAPIError(error: any): AppError {
    // خطأ الشبكة
    if (!navigator.onLine) {
      return {
        type: ErrorType.NETWORK_ERROR,
        message: 'لا يوجد اتصال بالإنترنت',
        timestamp: new Date(),
        retryable: true
      }
    }
    
    // خطأ 404
    if (error.status === 404) {
      return {
        type: ErrorType.NOT_FOUND,
        message: 'المحتوى غير موجود',
        timestamp: new Date(),
        retryable: false
      }
    }
    
    // خطأ 500
    if (error.status >= 500) {
      return {
        type: ErrorType.API_ERROR,
        message: 'حدث خطأ في الخادم',
        details: error,
        timestamp: new Date(),
        retryable: true
      }
    }
    
    // خطأ غير معروف
    return {
      type: ErrorType.UNKNOWN_ERROR,
      message: 'حدث خطأ غير متوقع',
      details: error,
      timestamp: new Date(),
      retryable: true
    }
  }
  
  /**
   * تسجيل الخطأ
   * Log Error
   */
  static logError(error: AppError): void {
    // تسجيل في console
    console.error('[Error]', error)
    
    // إرسال إلى خدمة تسجيل الأخطاء (مثل Sentry)
    if (typeof window !== 'undefined' && (window as any).Sentry) {
      (window as any).Sentry.captureException(error)
    }
  }
  
  /**
   * الحصول على رسالة خطأ محلية
   * Get Localized Error Message
   */
  static getLocalizedMessage(error: AppError, lang: 'ar' | 'en'): string {
    const messages = {
      [ErrorType.NETWORK_ERROR]: {
        ar: 'لا يوجد اتصال بالإنترنت. يرجى التحقق من اتصالك والمحاولة مرة أخرى.',
        en: 'No internet connection. Please check your connection and try again.'
      },
      [ErrorType.API_ERROR]: {
        ar: 'حدث خطأ في الخادم. يرجى المحاولة مرة أخرى لاحقاً.',
        en: 'A server error occurred. Please try again later.'
      },
      [ErrorType.NOT_FOUND]: {
        ar: 'المحتوى المطلوب غير موجود.',
        en: 'The requested content was not found.'
      },
      [ErrorType.VALIDATION_ERROR]: {
        ar: 'البيانات المدخلة غير صحيحة.',
        en: 'The input data is invalid.'
      },
      [ErrorType.UNKNOWN_ERROR]: {
        ar: 'حدث خطأ غير متوقع. يرجى المحاولة مرة أخرى.',
        en: 'An unexpected error occurred. Please try again.'
      }
    }
    
    return messages[error.type][lang]
  }
}

/**
 * مكون عرض الأخطاء
 * Error Message Component
 */
export const ErrorMessage: React.FC<{
  error: any
  onRetry?: () => void
  lang?: 'ar' | 'en'
}> = ({ error, onRetry, lang = 'ar' }) => {
  const appError = ErrorHandler.handleAPIError(error)
  const message = ErrorHandler.getLocalizedMessage(appError, lang)
  
  // تسجيل الخطأ
  useEffect(() => {
    ErrorHandler.logError(appError)
  }, [appError])
  
  return (
    <div className="flex flex-col items-center justify-center py-20 px-4">
      <div className="text-center max-w-md">
        <div className="mb-4 text-red-500 flex justify-center">
          <AlertCircle size={48} />
        </div>
        <h3 className="text-xl font-bold text-lumen-cream mb-2">
          {lang === 'ar' ? 'حدث خطأ' : 'An Error Occurred'}
        </h3>
        <p className="text-lumen-silver mb-6">
          {message}
        </p>
        {appError.retryable && onRetry && (
          <button
            onClick={onRetry}
            className="px-6 py-3 rounded-lg bg-lumen-gold text-lumen-void font-semibold hover:brightness-110 transition-all"
          >
            {lang === 'ar' ? 'إعادة المحاولة' : 'Retry'}
          </button>
        )}
      </div>
    </div>
  )
}
