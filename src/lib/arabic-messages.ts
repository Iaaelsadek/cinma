import { errorLogger } from '../services/errorLogging';

// Arabic error messages for better user experience
export const ARABIC_ERROR_MESSAGES = {
  // Authentication errors
  'Invalid login credentials': 'بيانات تسجيل الدخول غير صحيحة',
  'Email not confirmed': 'البريد الإلكتروني لم يتم تأكيده',
  'User already registered': 'المستخدم مسجل بالفعل',
  'Password should be at least 6 characters': 'كلمة المرور يجب أن تكون 6 أحرف على الأقل',
  
  // Database errors
  'duplicate key value violates unique constraint': 'هذه القيمة موجودة بالفعل',
  'violates foreign key constraint': 'هناك علاقة مع بيانات أخرى لا يمكن تجاهلها',
  'null value in column': 'قيمة فارغة في حقل مطلوب',
  'value too long for type': 'القيمة طويلة جداً',
  
  // Network errors
  'Network error': 'خطأ في الاتصال بالشبكة',
  'Failed to fetch': 'فشل تحميل البيانات',
  'Timeout': 'انتهت مهلة الاتصال',
  'ECONNREFUSED': 'تم رفض الاتصال بالخادم',
  
  // File upload errors
  'File too large': 'الملف كبير جداً',
  'Invalid file type': 'نوع الملف غير مدعوم',
  'Upload failed': 'فشل رفع الملف',
  
  // Profile errors
  'Username already taken': 'اسم المستخدم مستخدم بالفعل',
  'Invalid username format': 'صيغة اسم المستخدم غير صحيحة',
  'Profile not found': 'لم يتم العثور على الملف الشخصي',
  
  // Content errors
  'Content not found': 'المحتوى غير موجود',
  'Video not available': 'الفيديو غير متاح',
  'Series not found': 'المسلسل غير موجود',
  'Movie not found': 'الفيلم غير موجود',
  
  // Permission errors
  'Permission denied': 'لا يوجد صلاحية',
  'Admin access required': 'يتطلب صلاحيات المدير',
  'User is banned': 'المستخدم محظور',
  
  // Validation errors
  'Required field': 'حقل مطلوب',
  'Invalid email format': 'صيغة البريد الإلكتروني غير صحيحة',
  'Invalid URL format': 'صيغة الرابط غير صحيحة',
  'Number must be positive': 'يجب أن يكون الرقم موجباً',
  
  // Generic errors
  'Something went wrong': 'حدث خطأ ما',
  'An error occurred': 'حدث خطأ',
  'Please try again': 'يرجى المحاولة مرة أخرى',
  'Operation failed': 'فشلت العملية',
  'Service unavailable': 'الخدمة غير متاحة حالياً'
};

// Function to get Arabic error message
export function getArabicErrorMessage(error: string | Error | null): string {
  if (!error) return 'حدث خطأ ما';
  
  const errorMessage = typeof error === 'string' ? error : error.message;
  
  // Check for exact match
  if ((ARABIC_ERROR_MESSAGES as Record<string, string>)[errorMessage]) {
    return (ARABIC_ERROR_MESSAGES as Record<string, string>)[errorMessage];
  }
  
  // Check for partial matches
  for (const [key, value] of Object.entries(ARABIC_ERROR_MESSAGES)) {
    if (errorMessage.toLowerCase().includes(key.toLowerCase())) {
      return value;
    }
  }
  
  // Return generic message if no match found
  return 'حدث خطأ ما، يرجى المحاولة مرة أخرى';
}

// Enhanced error handler with Arabic messages
export function handleError(error: any, context?: string): string {
  errorLogger.logError({
    message: context ? `Error in ${context}` : 'Error occurred',
    severity: 'medium',
    category: 'system',
    context: { error, context }
  });
  
  const arabicMessage = getArabicErrorMessage(error);
  
  // Add context if available
  if (context) {
    return `${arabicMessage} (${context})`;
  }
  
  return arabicMessage;
}

// Success messages in Arabic
export const ARABIC_SUCCESS_MESSAGES = {
  'Profile updated successfully': 'تم تحديث الملف الشخصي بنجاح',
  'Username updated': 'تم تحديث اسم المستخدم',
  'Avatar updated': 'تم تحديث الصورة الشخصية',
  'Login successful': 'تم تسجيل الدخول بنجاح',
  'Logout successful': 'تم تسجيل الخروج بنجاح',
  'Account created': 'تم إنشاء الحساب بنجاح',
  'Password reset email sent': 'تم إرسال بريد إعادة تعيين كلمة المرور',
  'Email confirmed': 'تم تأكيد البريد الإلكتروني',
  'Settings saved': 'تم حفظ الإعدادات',
  'File uploaded': 'تم رفع الملف بنجاح',
  'Content added to watchlist': 'تمت إضافة المحتوى إلى قائمة المشاهدة',
  'Content removed from watchlist': 'تمت إزالة المحتوى من قائمة المشاهدة',
  'Review submitted': 'تم إرسال التقييم',
  'Rating updated': 'تم تحديث التقييم',
  'Request submitted': 'تم إرسال الطلب بنجاح'
};

// Function to get Arabic success message
export function getArabicSuccessMessage(message: string): string {
  return (ARABIC_SUCCESS_MESSAGES as Record<string, string>)[message] || message;
}