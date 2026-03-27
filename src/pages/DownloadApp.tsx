import {useState} from 'react';
import { motion } from 'framer-motion';
import {Download, Smartphone, AlertCircle, Shield, Zap, Star} from 'lucide-react';
import { Helmet } from 'react-helmet-async';
import { useLang } from '../state/useLang';
import { Button } from '../components/ui/Button';

const APK_DOWNLOAD_URL = import.meta.env.VITE_APK_DOWNLOAD_URL || '/downloads/online-cinema-v1.0.0.apk';
const APK_VERSION = '1.0.0';
const APK_SIZE = '25 MB'; // Update this with actual size

export const DownloadApp = () => {
  const { lang } = useLang();
  const [downloading, setDownloading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(0);

  const t = (ar: string, en: string) => (lang === 'ar' ? ar : en);

  const handleDownload = () => {
    setDownloading(true);
    setDownloadProgress(0);

    // Simulate download progress
    const interval = setInterval(() => {
      setDownloadProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          setDownloading(false);
          return 100;
        }
        return prev + 10;
      });
    }, 200);

    // Trigger actual download
    window.location.href = APK_DOWNLOAD_URL;
  };

  const features = [
    {
      icon: <Zap className="w-6 h-6" />,
      title: t('تجربة أسرع', 'Faster Experience'),
      description: t('أداء محسّن وتحميل أسرع للمحتوى', 'Optimized performance and faster content loading')
    },
    {
      icon: <Shield className="w-6 h-6" />,
      title: t('بدون إعلانات', 'Ad-Free'),
      description: t('استمتع بالمشاهدة بدون أي إعلانات مزعجة', 'Enjoy watching without any annoying ads')
    },
    {
      icon: <Star className="w-6 h-6" />,
      title: t('مشغل متقدم', 'Advanced Player'),
      description: t('مشغل فيديو احترافي مع ميزات متقدمة', 'Professional video player with advanced features')
    }
  ];

  const installSteps = [
    t('قم بتحميل ملف APK', 'Download the APK file'),
    t('افتح ملف APK من مجلد التنزيلات', 'Open the APK file from Downloads'),
    t('اسمح بالتثبيت من مصادر غير معروفة', 'Allow installation from unknown sources'),
    t('اضغط على "تثبيت" وانتظر حتى يكتمل', 'Tap "Install" and wait for completion'),
    t('افتح التطبيق واستمتع!', 'Open the app and enjoy!')
  ];

  return (
    <>
      <Helmet>
        <title>{t('تحميل التطبيق', 'Download App')} - Cinema Online</title>
        <meta name="description" content={t('حمّل تطبيق اونلاين سينما للأندرويد واستمتع بتجربة مشاهدة أفضل', 'Download Online Cinema Android app for a better viewing experience')} />
      </Helmet>

      <div className="min-h-screen bg-black text-white">
        {/* Hero Section */}
        <div className="relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-transparent to-transparent" />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary/10 via-transparent to-transparent" />
          
          <div className="relative max-w-7xl mx-auto px-4 py-20">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-center space-y-6"
            >
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 text-primary text-sm font-medium">
                <Smartphone className="w-4 h-4" />
                {t('تطبيق الأندرويد', 'Android App')}
              </div>

              <h1 className="text-4xl md:text-6xl font-bold bg-gradient-to-r from-white via-white to-primary bg-clip-text text-transparent">
                {t('حمّل تطبيق اونلاين سينما', 'Download Online Cinema')}
              </h1>

              <p className="text-lg md:text-xl text-zinc-400 max-w-2xl mx-auto">
                {t('استمتع بتجربة مشاهدة أفضل مع التطبيق المخصص للأندرويد', 'Enjoy a better viewing experience with our dedicated Android app')}
              </p>

              <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
                <Button
                  onClick={handleDownload}
                  size="lg"
                  icon={<Download className="w-5 h-5" />}
                  iconPosition="left"
                  disabled={downloading}
                  className="min-w-[200px]"
                >
                  {downloading ? t('جاري التحميل...', 'Downloading...') : t('تحميل الآن', 'Download Now')}
                </Button>

                <div className="flex items-center gap-4 text-sm text-zinc-500">
                  <span>{t('الإصدار', 'Version')} {APK_VERSION}</span>
                  <span>•</span>
                  <span>{APK_SIZE}</span>
                </div>
              </div>

              {downloading && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="max-w-md mx-auto"
                >
                  <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                    <motion.div
                      className="h-full bg-gradient-to-r from-primary to-purple-500"
                      initial={{ width: 0 }}
                      animate={{ width: `${downloadProgress}%` }}
                      transition={{ duration: 0.3 }}
                    />
                  </div>
                  <p className="text-xs text-zinc-500 mt-2">{downloadProgress}%</p>
                </motion.div>
              )}
            </motion.div>
          </div>
        </div>

        {/* Features Section */}
        <div className="max-w-7xl mx-auto px-4 py-20">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-12"
          >
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              {t('لماذا التطبيق؟', 'Why the App?')}
            </h2>
            <p className="text-zinc-400">
              {t('مميزات حصرية للتطبيق', 'Exclusive app features')}
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {features.map((feature, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                className="p-6 rounded-2xl border border-white/10 bg-white/5 backdrop-blur-sm hover:bg-white/10 transition-all"
              >
                <div className="w-12 h-12 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary mb-4">
                  {feature.icon}
                </div>
                <h3 className="text-xl font-bold mb-2">{feature.title}</h3>
                <p className="text-zinc-400 text-sm">{feature.description}</p>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Installation Steps */}
        <div className="max-w-4xl mx-auto px-4 py-20">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-12"
          >
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              {t('كيفية التثبيت', 'How to Install')}
            </h2>
            <p className="text-zinc-400">
              {t('خطوات بسيطة لتثبيت التطبيق', 'Simple steps to install the app')}
            </p>
          </motion.div>

          <div className="space-y-4">
            {installSteps.map((step, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                className="flex items-start gap-4 p-4 rounded-xl border border-white/10 bg-white/5 backdrop-blur-sm"
              >
                <div className="w-8 h-8 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-primary font-bold flex-shrink-0">
                  {index + 1}
                </div>
                <p className="text-zinc-300 pt-1">{step}</p>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Security Notice */}
        <div className="max-w-4xl mx-auto px-4 pb-20">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="p-6 rounded-2xl border border-yellow-500/20 bg-yellow-500/5 backdrop-blur-sm"
          >
            <div className="flex items-start gap-4">
              <AlertCircle className="w-6 h-6 text-yellow-500 flex-shrink-0 mt-1" />
              <div>
                <h3 className="text-lg font-bold text-yellow-500 mb-2">
                  {t('ملاحظة أمنية', 'Security Notice')}
                </h3>
                <p className="text-zinc-300 text-sm leading-relaxed">
                  {t(
                    'عند تثبيت التطبيق، قد يطلب منك الأندرويد السماح بالتثبيت من مصادر غير معروفة. هذا إجراء أمني طبيعي لأن التطبيق ليس من متجر Google Play. التطبيق آمن تماماً ويمكنك تعطيل هذا الإذن بعد التثبيت.',
                    'When installing the app, Android may ask you to allow installation from unknown sources. This is a normal security measure because the app is not from Google Play Store. The app is completely safe and you can disable this permission after installation.'
                  )}
                </p>
              </div>
            </div>
          </motion.div>
        </div>

        {/* FAQ Section */}
        <div className="max-w-4xl mx-auto px-4 pb-20">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-12"
          >
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              {t('أسئلة شائعة', 'FAQ')}
            </h2>
          </motion.div>

          <div className="space-y-4">
            <details className="group p-6 rounded-2xl border border-white/10 bg-white/5 backdrop-blur-sm">
              <summary className="cursor-pointer font-bold text-lg flex items-center justify-between">
                {t('هل التطبيق مجاني؟', 'Is the app free?')}
                <span className="text-primary group-open:rotate-180 transition-transform">▼</span>
              </summary>
              <p className="mt-4 text-zinc-400 text-sm">
                {t('نعم، التطبيق مجاني بالكامل ولا يحتوي على أي رسوم مخفية.', 'Yes, the app is completely free with no hidden fees.')}
              </p>
            </details>

            <details className="group p-6 rounded-2xl border border-white/10 bg-white/5 backdrop-blur-sm">
              <summary className="cursor-pointer font-bold text-lg flex items-center justify-between">
                {t('ما هي متطلبات التشغيل؟', 'What are the requirements?')}
                <span className="text-primary group-open:rotate-180 transition-transform">▼</span>
              </summary>
              <p className="mt-4 text-zinc-400 text-sm">
                {t('يتطلب التطبيق أندرويد 8.0 أو أحدث.', 'The app requires Android 8.0 or newer.')}
              </p>
            </details>

            <details className="group p-6 rounded-2xl border border-white/10 bg-white/5 backdrop-blur-sm">
              <summary className="cursor-pointer font-bold text-lg flex items-center justify-between">
                {t('هل يمكنني استخدام نفس الحساب؟', 'Can I use the same account?')}
                <span className="text-primary group-open:rotate-180 transition-transform">▼</span>
              </summary>
              <p className="mt-4 text-zinc-400 text-sm">
                {t('نعم، يمكنك تسجيل الدخول بنفس الحساب المستخدم في الموقع.', 'Yes, you can login with the same account used on the website.')}
              </p>
            </details>
          </div>
        </div>
      </div>
    </>
  );
};
