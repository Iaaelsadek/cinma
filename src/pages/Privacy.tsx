import { Helmet } from 'react-helmet-async'
import { useLang } from '../state/useLang'

export const Privacy = () => {
  const { lang } = useLang()
  const title = lang === 'ar' ? 'سياسة الخصوصية' : 'Privacy Policy'
  const description = lang === 'ar'
    ? 'كيف نجمع البيانات ونحميها داخل منصة سينما أونلاين.'
    : 'How we collect and protect data on Cinema Online.'

  return (
    <div className="min-h-screen bg-luxury-obsidian px-4 lg:px-12 py-12 text-white">
      <Helmet>
        <title>{`${title} | cinma.online`}</title>
        <meta name="description" content={description} />
        <meta property="og:title" content={title} />
        <meta property="og:description" content={description} />
        <link rel="canonical" href={typeof window !== 'undefined' ? `${location.origin}${location.pathname}` : ''} />
      </Helmet>

      <div className="mx-auto max-w-4xl space-y-8">
        <div>
          <h1 className="text-3xl md:text-4xl font-black tracking-tight">{title}</h1>
          <p className="mt-2 text-sm text-zinc-400">{description}</p>
        </div>

        <section className="space-y-3 rounded-2xl border border-white/10 bg-white/5 p-6">
          <h2 className="text-xl font-bold">{lang === 'ar' ? 'البيانات التي نجمعها' : 'Data We Collect'}</h2>
          <ul className="list-disc space-y-2 pl-5 text-sm text-zinc-300">
            <li>{lang === 'ar' ? 'بيانات الحساب الأساسية مثل البريد الإلكتروني والاسم عند التسجيل.' : 'Basic account details like email and name during registration.'}</li>
            <li>{lang === 'ar' ? 'تفضيلات المشاهدة وسجل التفاعل لتحسين التوصيات.' : 'Viewing preferences and interaction history to improve recommendations.'}</li>
          </ul>
        </section>

        <section className="space-y-3 rounded-2xl border border-white/10 bg-white/5 p-6">
          <h2 className="text-xl font-bold">{lang === 'ar' ? 'كيفية الاستخدام' : 'How We Use Data'}</h2>
          <ul className="list-disc space-y-2 pl-5 text-sm text-zinc-300">
            <li>{lang === 'ar' ? 'تحسين تجربة المستخدم وتخصيص المحتوى.' : 'Improve the user experience and personalize content.'}</li>
            <li>{lang === 'ar' ? 'الحفاظ على أمان المنصة ومنع إساءة الاستخدام.' : 'Maintain platform security and prevent abuse.'}</li>
          </ul>
        </section>

        <section className="space-y-3 rounded-2xl border border-white/10 bg-white/5 p-6">
          <h2 className="text-xl font-bold">{lang === 'ar' ? 'حماية البيانات' : 'Data Protection'}</h2>
          <p className="text-sm text-zinc-300">
            {lang === 'ar'
              ? 'نستخدم آليات حماية مناسبة لضمان سرية البيانات وعدم مشاركتها دون مبرر قانوني.'
              : 'We apply appropriate safeguards to keep data confidential and not share it without legal grounds.'}
          </p>
        </section>
      </div>
    </div>
  )
}
