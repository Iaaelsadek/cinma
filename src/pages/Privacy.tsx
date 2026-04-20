import { Helmet } from 'react-helmet-async'
import { useLang } from '../state/useLang'
import { Shield, Lock, Eye, Database, UserCheck, Bell } from 'lucide-react'

export const Privacy = () => {
  const { lang } = useLang()
  const isAr = lang === 'ar'

  return (
    <>
      <Helmet>
        <title>{isAr ? 'سياسة الخصوصية - Cinema.online' : 'Privacy Policy - Cinema.online'}</title>
      </Helmet>
      <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950">
        <div className="relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-purple-500/10 to-pink-500/10" />
          <div className="relative max-w-4xl mx-auto px-4 py-20 text-center">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-purple-500/20 mb-6">
              <Shield className="w-10 h-10 text-purple-400" />
            </div>
            <h1 className="text-4xl font-bold text-white mb-4">
              {isAr ? 'سياسة الخصوصية' : 'Privacy Policy'}
            </h1>
            <p className="text-slate-400 text-lg">
              {isAr ? 'آخر تحديث: أبريل 2026' : 'Last updated: April 2026'}
            </p>
          </div>
        </div>
        <div className="max-w-4xl mx-auto px-4 py-12 space-y-8">
          <div className="bg-slate-800/50 rounded-2xl p-8 border border-slate-700/50">
            <div className="flex items-center gap-3 mb-4">
              <Eye className="w-6 h-6 text-purple-400" />
              <h2 className="text-xl font-bold text-white">
                {isAr ? 'ما البيانات التي نجمعها' : 'What Data We Collect'}
              </h2>
            </div>
            <p className="text-slate-300 leading-relaxed">
              {isAr
                ? 'نجمع البيانات الضرورية فقط: البريد الإلكتروني، تفضيلات المشاهدة، وبيانات الجلسة.'
                : 'We only collect necessary data: email, viewing preferences, and session data.'}
            </p>
          </div>
          <div className="bg-slate-800/50 rounded-2xl p-8 border border-slate-700/50">
            <div className="flex items-center gap-3 mb-4">
              <Database className="w-6 h-6 text-pink-400" />
              <h2 className="text-xl font-bold text-white">
                {isAr ? 'كيف نستخدم بياناتك' : 'How We Use Your Data'}
              </h2>
            </div>
            <p className="text-slate-300 leading-relaxed">
              {isAr
                ? 'نستخدم بياناتك لتخصيص التجربة وتحسين الخدمة. لا نبيع بياناتك أبداً.'
                : 'We use your data to personalize your experience. We never sell your data.'}
            </p>
          </div>
          <div className="bg-slate-800/50 rounded-2xl p-8 border border-slate-700/50">
            <div className="flex items-center gap-3 mb-4">
              <Lock className="w-6 h-6 text-blue-400" />
              <h2 className="text-xl font-bold text-white">
                {isAr ? 'أمان البيانات' : 'Data Security'}
              </h2>
            </div>
            <p className="text-slate-300 leading-relaxed">
              {isAr
                ? 'نستخدم تشفير SSL/TLS لحماية بياناتك.'
                : 'We use SSL/TLS encryption to protect your data.'}
            </p>
          </div>
          <div className="bg-slate-800/50 rounded-2xl p-8 border border-slate-700/50">
            <div className="flex items-center gap-3 mb-4">
              <UserCheck className="w-6 h-6 text-green-400" />
              <h2 className="text-xl font-bold text-white">
                {isAr ? 'حقوقك' : 'Your Rights'}
              </h2>
            </div>
            <p className="text-slate-300 leading-relaxed">
              {isAr
                ? 'يحق لك الاطلاع على بياناتك، تصحيحها، أو حذفها في أي وقت.'
                : 'You have the right to access, correct, or delete your data at any time.'}
            </p>
          </div>
          <div className="bg-slate-800/50 rounded-2xl p-8 border border-slate-700/50">
            <div className="flex items-center gap-3 mb-4">
              <Bell className="w-6 h-6 text-yellow-400" />
              <h2 className="text-xl font-bold text-white">
                {isAr ? 'ملفات تعريف الارتباط' : 'Cookies'}
              </h2>
            </div>
            <p className="text-slate-300 leading-relaxed">
              {isAr
                ? 'نستخدم الكوكيز لحفظ تفضيلاتك. يمكنك التحكم فيها من إعدادات المتصفح.'
                : 'We use cookies to save your preferences. You can control them from browser settings.'}
            </p>
          </div>
          <div className="bg-gradient-to-r from-purple-500/10 to-pink-500/10 rounded-2xl p-8 border border-purple-500/20 text-center">
            <h2 className="text-xl font-bold text-white mb-2">
              {isAr ? 'تواصل معنا' : 'Contact Us'}
            </h2>
            <p className="text-slate-400">
              <a href="mailto:privacy@cinma.online" className="text-purple-400 hover:text-purple-300">
                privacy@cinma.online
              </a>
            </p>
          </div>
        </div>
      </div>
    </>
  )
}

export default Privacy
