import { Helmet } from 'react-helmet-async'
import { useLang } from '../state/useLang'

export const Terms = () => {
  const { lang } = useLang()
  const title = lang === 'ar' ? 'الشروط والأحكام' : 'Terms & Conditions'
  const description = lang === 'ar'
    ? 'الشروط التي تنظّم استخدام منصة سينما أونلاين ومحتواها.'
    : 'The terms that govern your use of Cinema Online and its content.'

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
          <h2 className="text-xl font-bold">{lang === 'ar' ? 'الاستخدام المقبول' : 'Acceptable Use'}</h2>
          <ul className="list-disc space-y-2 pl-5 text-sm text-zinc-300">
            <li>{lang === 'ar' ? 'الالتزام بالقوانين المحلية واحترام حقوق الملكية الفكرية.' : 'Comply with local laws and respect intellectual property rights.'}</li>
            <li>{lang === 'ar' ? 'عدم إساءة استخدام المنصة أو محاولة إيقافها أو التحايل على أنظمتها.' : 'Do not misuse the platform or attempt to disrupt or bypass its systems.'}</li>
            <li>{lang === 'ar' ? 'عدم مشاركة بيانات الدخول أو إساءة استخدام الحسابات.' : 'Do not share credentials or misuse accounts.'}</li>
          </ul>
        </section>

        <section className="space-y-3 rounded-2xl border border-white/10 bg-white/5 p-6">
          <h2 className="text-xl font-bold">{lang === 'ar' ? 'المحتوى والروابط' : 'Content & Links'}</h2>
          <ul className="list-disc space-y-2 pl-5 text-sm text-zinc-300">
            <li>{lang === 'ar' ? 'قد يتم تحديث المحتوى بشكل دوري لضمان الجودة والدقة.' : 'Content may be updated periodically to ensure quality and accuracy.'}</li>
            <li>{lang === 'ar' ? 'قد تتضمن الصفحات روابط خارجية تخضع لسياساتها الخاصة.' : 'External links are governed by their own policies.'}</li>
          </ul>
        </section>

        <section className="space-y-3 rounded-2xl border border-white/10 bg-white/5 p-6">
          <h2 className="text-xl font-bold">{lang === 'ar' ? 'التغييرات' : 'Changes'}</h2>
          <p className="text-sm text-zinc-300">
            {lang === 'ar'
              ? 'قد نقوم بتحديث هذه الشروط عند الحاجة، وسيتم نشر النسخة الأحدث على هذه الصفحة.'
              : 'We may update these terms when needed, and the latest version will be posted on this page.'}
          </p>
        </section>
      </div>
    </div>
  )
}
