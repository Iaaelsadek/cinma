import React from 'react'
import { Helmet } from 'react-helmet-async'
import { useLang } from '../state/useLang'
import { Scale, FileText, Shield, AlertCircle, CheckCircle, Users } from 'lucide-react'

export const Terms = () => {
  const { lang } = useLang()

  return (
    <>
      <Helmet>
        <title>{lang === 'ar' ? 'الشروط والأحكام - 4Cima' : 'Terms of Service - 4Cima'}</title>
      </Helmet>

      <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950">
        {/* Hero Section */}
        <div className="relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-blue-500/10 to-cyan-500/10" />
          <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-10" />
          
          <div className="container mx-auto px-4 py-16 relative">
            <div className="max-w-4xl mx-auto text-center">
              <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-br from-blue-500 to-cyan-600 mb-6">
                <Scale className="w-10 h-10 text-white" />
              </div>
              
              <h1 className="text-4xl md:text-5xl font-black mb-4 bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">
                {lang === 'ar' ? 'الشروط والأحكام' : 'Terms of Service'}
              </h1>
              
              <p className="text-xl text-zinc-400">
                {lang === 'ar' 
                  ? 'يرجى قراءة هذه الشروط بعناية قبل استخدام خدماتنا'
                  : 'Please read these terms carefully before using our services'}
              </p>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="container mx-auto px-4 py-12 max-w-4xl">
          <div className="space-y-8">
            {lang === 'ar' ? (
              <>
                {/* Section 1 */}
                <section className="bg-slate-900/50 border border-slate-800 rounded-2xl p-8 hover:border-blue-500/30 transition-colors">
                  <div className="flex items-center gap-3 mb-4">
                    <CheckCircle className="w-6 h-6 text-blue-400" />
                    <h2 className="text-2xl font-bold text-white">1. قبول الشروط</h2>
                  </div>
                  <div className="space-y-4 text-zinc-300 leading-relaxed">
                    <p>
                      باستخدامك لموقع 4Cima، فإنك توافق على الالتزام بهذه الشروط والأحكام وجميع القوانين واللوائح المعمول بها. 
                      إذا كنت لا توافق على أي من هذه الشروط، يرجى عدم استخدام الموقع.
                    </p>
                    <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4">
                      <p className="text-sm text-blue-300">
                        💡 استخدامك المستمر للموقع يعني موافقتك على أي تحديثات أو تعديلات على هذه الشروط.
                      </p>
                    </div>
                  </div>
                </section>

                {/* Section 2 */}
                <section className="bg-slate-900/50 border border-slate-800 rounded-2xl p-8 hover:border-cyan-500/30 transition-colors">
                  <div className="flex items-center gap-3 mb-4">
                    <FileText className="w-6 h-6 text-cyan-400" />
                    <h2 className="text-2xl font-bold text-white">2. استخدام الموقع</h2>
                  </div>
                  <div className="space-y-4 text-zinc-300 leading-relaxed">
                    <p>
                      يوفر 4Cima معلومات عن الأفلام والمسلسلات والألعاب والبرامج. جميع المحتويات المعروضة هي لأغراض إعلامية فقط.
                    </p>
                    <div className="grid md:grid-cols-2 gap-4 mt-4">
                      <div className="bg-slate-800/50 p-4 rounded-lg">
                        <h3 className="font-semibold text-white mb-2 flex items-center gap-2">
                          <CheckCircle className="w-4 h-4 text-green-400" />
                          مسموح
                        </h3>
                        <ul className="text-sm space-y-1 text-zinc-400">
                          <li>• تصفح المحتوى</li>
                          <li>• إنشاء حساب شخصي</li>
                          <li>• مشاركة الروابط</li>
                          <li>• كتابة المراجعات</li>
                        </ul>
                      </div>
                      <div className="bg-slate-800/50 p-4 rounded-lg">
                        <h3 className="font-semibold text-white mb-2 flex items-center gap-2">
                          <AlertCircle className="w-4 h-4 text-red-400" />
                          ممنوع
                        </h3>
                        <ul className="text-sm space-y-1 text-zinc-400">
                          <li>• نسخ المحتوى</li>
                          <li>• الاستخدام التجاري</li>
                          <li>• الهجمات الإلكترونية</li>
                          <li>• المحتوى المسيء</li>
                        </ul>
                      </div>
                    </div>
                  </div>
                </section>

                {/* Section 3 */}
                <section className="bg-slate-900/50 border border-slate-800 rounded-2xl p-8 hover:border-purple-500/30 transition-colors">
                  <div className="flex items-center gap-3 mb-4">
                    <Shield className="w-6 h-6 text-purple-400" />
                    <h2 className="text-2xl font-bold text-white">3. حقوق الملكية الفكرية</h2>
                  </div>
                  <div className="space-y-4 text-zinc-300 leading-relaxed">
                    <p>
                      جميع المحتويات والعلامات التجارية المعروضة على الموقع هي ملك لأصحابها. نحن لا نستضيف أي محتوى محمي بحقوق الطبع والنشر.
                    </p>
                    <p>
                      4Cima يعمل كدليل إعلامي فقط، ويوفر روابط لمحتوى متاح بشكل عام على الإنترنت من مصادر خارجية.
                    </p>
                  </div>
                </section>

                {/* Section 4 */}
                <section className="bg-slate-900/50 border border-slate-800 rounded-2xl p-8 hover:border-amber-500/30 transition-colors">
                  <div className="flex items-center gap-3 mb-4">
                    <FileText className="w-6 h-6 text-amber-400" />
                    <h2 className="text-2xl font-bold text-white">4. DMCA</h2>
                  </div>
                  <div className="space-y-4 text-zinc-300 leading-relaxed">
                    <p>
                      نحن نحترم حقوق الملكية الفكرية. إذا كنت تعتقد أن محتوى ما ينتهك حقوقك، يرجى الاتصال بنا عبر صفحة DMCA.
                    </p>
                    <a 
                      href="/dmca" 
                      className="inline-flex items-center gap-2 px-4 py-2 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 rounded-lg text-amber-400 transition-colors"
                    >
                      <Shield className="w-4 h-4" />
                      اقرأ سياسة DMCA
                    </a>
                  </div>
                </section>

                {/* Section 5 */}
                <section className="bg-slate-900/50 border border-slate-800 rounded-2xl p-8 hover:border-red-500/30 transition-colors">
                  <div className="flex items-center gap-3 mb-4">
                    <AlertCircle className="w-6 h-6 text-red-400" />
                    <h2 className="text-2xl font-bold text-white">5. إخلاء المسؤولية</h2>
                  </div>
                  <div className="space-y-4 text-zinc-300 leading-relaxed">
                    <p>
                      يتم توفير الموقع "كما هو" دون أي ضمانات من أي نوع، صريحة أو ضمنية. نحن لسنا مسؤولين عن:
                    </p>
                    <ul className="space-y-2 text-zinc-400">
                      <li className="flex items-start gap-2">
                        <span className="text-red-400 mt-1">•</span>
                        <span>أي أضرار قد تنتج عن استخدام الموقع</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-red-400 mt-1">•</span>
                        <span>دقة أو اكتمال المعلومات المعروضة</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-red-400 mt-1">•</span>
                        <span>المحتوى الموجود على المواقع الخارجية المرتبطة</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-red-400 mt-1">•</span>
                        <span>أي انقطاع أو أخطاء في الخدمة</span>
                      </li>
                    </ul>
                  </div>
                </section>

                {/* Section 6 */}
                <section className="bg-slate-900/50 border border-slate-800 rounded-2xl p-8 hover:border-green-500/30 transition-colors">
                  <div className="flex items-center gap-3 mb-4">
                    <Users className="w-6 h-6 text-green-400" />
                    <h2 className="text-2xl font-bold text-white">6. حسابات المستخدمين</h2>
                  </div>
                  <div className="space-y-4 text-zinc-300 leading-relaxed">
                    <p>
                      عند إنشاء حساب على 4Cima، أنت مسؤول عن:
                    </p>
                    <div className="bg-slate-800/50 p-4 rounded-lg space-y-2">
                      <p className="text-sm">✓ الحفاظ على سرية كلمة المرور الخاصة بك</p>
                      <p className="text-sm">✓ جميع الأنشطة التي تحدث تحت حسابك</p>
                      <p className="text-sm">✓ إخطارنا فوراً بأي استخدام غير مصرح به</p>
                      <p className="text-sm">✓ تقديم معلومات دقيقة وحديثة</p>
                    </div>
                  </div>
                </section>

                {/* Section 7 */}
                <section className="bg-slate-900/50 border border-slate-800 rounded-2xl p-8 hover:border-blue-500/30 transition-colors">
                  <div className="flex items-center gap-3 mb-4">
                    <FileText className="w-6 h-6 text-blue-400" />
                    <h2 className="text-2xl font-bold text-white">7. التعديلات</h2>
                  </div>
                  <div className="space-y-4 text-zinc-300 leading-relaxed">
                    <p>
                      نحتفظ بالحق في تعديل هذه الشروط في أي وقت. سيتم نشر أي تغييرات على هذه الصفحة مع تحديث تاريخ "آخر تحديث".
                    </p>
                    <p className="text-sm text-zinc-400">
                      يرجى مراجعة هذه الصفحة بانتظام للاطلاع على أي تحديثات. استمرارك في استخدام الموقع بعد نشر التغييرات يعني قبولك لها.
                    </p>
                  </div>
                </section>
              </>
            ) : (
              <>
                {/* English version - similar structure */}
                <section className="bg-slate-900/50 border border-slate-800 rounded-2xl p-8 hover:border-blue-500/30 transition-colors">
                  <div className="flex items-center gap-3 mb-4">
                    <CheckCircle className="w-6 h-6 text-blue-400" />
                    <h2 className="text-2xl font-bold text-white">1. Acceptance of Terms</h2>
                  </div>
                  <div className="space-y-4 text-zinc-300 leading-relaxed">
                    <p>
                      By using 4Cima, you agree to be bound by these Terms of Service and all applicable laws and regulations. 
                      If you do not agree to these terms, please do not use the website.
                    </p>
                    <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4">
                      <p className="text-sm text-blue-300">
                        💡 Your continued use of the website constitutes acceptance of any updates or modifications to these terms.
                      </p>
                    </div>
                  </div>
                </section>

                <section className="bg-slate-900/50 border border-slate-800 rounded-2xl p-8 hover:border-cyan-500/30 transition-colors">
                  <div className="flex items-center gap-3 mb-4">
                    <FileText className="w-6 h-6 text-cyan-400" />
                    <h2 className="text-2xl font-bold text-white">2. Use of Website</h2>
                  </div>
                  <div className="space-y-4 text-zinc-300 leading-relaxed">
                    <p>
                      4Cima provides information about movies, TV series, games, and software. All content displayed is for informational purposes only.
                    </p>
                    <div className="grid md:grid-cols-2 gap-4 mt-4">
                      <div className="bg-slate-800/50 p-4 rounded-lg">
                        <h3 className="font-semibold text-white mb-2 flex items-center gap-2">
                          <CheckCircle className="w-4 h-4 text-green-400" />
                          Allowed
                        </h3>
                        <ul className="text-sm space-y-1 text-zinc-400">
                          <li>• Browse content</li>
                          <li>• Create personal account</li>
                          <li>• Share links</li>
                          <li>• Write reviews</li>
                        </ul>
                      </div>
                      <div className="bg-slate-800/50 p-4 rounded-lg">
                        <h3 className="font-semibold text-white mb-2 flex items-center gap-2">
                          <AlertCircle className="w-4 h-4 text-red-400" />
                          Prohibited
                        </h3>
                        <ul className="text-sm space-y-1 text-zinc-400">
                          <li>• Copy content</li>
                          <li>• Commercial use</li>
                          <li>• Cyber attacks</li>
                          <li>• Abusive content</li>
                        </ul>
                      </div>
                    </div>
                  </div>
                </section>

                <section className="bg-slate-900/50 border border-slate-800 rounded-2xl p-8 hover:border-purple-500/30 transition-colors">
                  <div className="flex items-center gap-3 mb-4">
                    <Shield className="w-6 h-6 text-purple-400" />
                    <h2 className="text-2xl font-bold text-white">3. Intellectual Property</h2>
                  </div>
                  <div className="space-y-4 text-zinc-300 leading-relaxed">
                    <p>
                      All content and trademarks displayed on the website belong to their respective owners. We do not host any copyrighted content.
                    </p>
                    <p>
                      4Cima operates as an informational directory only, providing links to publicly available content on the internet from external sources.
                    </p>
                  </div>
                </section>

                <section className="bg-slate-900/50 border border-slate-800 rounded-2xl p-8 hover:border-amber-500/30 transition-colors">
                  <div className="flex items-center gap-3 mb-4">
                    <FileText className="w-6 h-6 text-amber-400" />
                    <h2 className="text-2xl font-bold text-white">4. DMCA</h2>
                  </div>
                  <div className="space-y-4 text-zinc-300 leading-relaxed">
                    <p>
                      We respect intellectual property rights. If you believe any content infringes your rights, please contact us through our DMCA page.
                    </p>
                    <a 
                      href="/dmca" 
                      className="inline-flex items-center gap-2 px-4 py-2 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 rounded-lg text-amber-400 transition-colors"
                    >
                      <Shield className="w-4 h-4" />
                      Read DMCA Policy
                    </a>
                  </div>
                </section>

                <section className="bg-slate-900/50 border border-slate-800 rounded-2xl p-8 hover:border-red-500/30 transition-colors">
                  <div className="flex items-center gap-3 mb-4">
                    <AlertCircle className="w-6 h-6 text-red-400" />
                    <h2 className="text-2xl font-bold text-white">5. Disclaimer</h2>
                  </div>
                  <div className="space-y-4 text-zinc-300 leading-relaxed">
                    <p>
                      The website is provided "as is" without any warranties of any kind, express or implied. We are not responsible for:
                    </p>
                    <ul className="space-y-2 text-zinc-400">
                      <li className="flex items-start gap-2">
                        <span className="text-red-400 mt-1">•</span>
                        <span>Any damages that may result from using the website</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-red-400 mt-1">•</span>
                        <span>Accuracy or completeness of displayed information</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-red-400 mt-1">•</span>
                        <span>Content on linked external websites</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-red-400 mt-1">•</span>
                        <span>Any service interruptions or errors</span>
                      </li>
                    </ul>
                  </div>
                </section>

                <section className="bg-slate-900/50 border border-slate-800 rounded-2xl p-8 hover:border-green-500/30 transition-colors">
                  <div className="flex items-center gap-3 mb-4">
                    <Users className="w-6 h-6 text-green-400" />
                    <h2 className="text-2xl font-bold text-white">6. User Accounts</h2>
                  </div>
                  <div className="space-y-4 text-zinc-300 leading-relaxed">
                    <p>
                      When creating an account on 4Cima, you are responsible for:
                    </p>
                    <div className="bg-slate-800/50 p-4 rounded-lg space-y-2">
                      <p className="text-sm">✓ Maintaining the confidentiality of your password</p>
                      <p className="text-sm">✓ All activities that occur under your account</p>
                      <p className="text-sm">✓ Notifying us immediately of any unauthorized use</p>
                      <p className="text-sm">✓ Providing accurate and current information</p>
                    </div>
                  </div>
                </section>

                <section className="bg-slate-900/50 border border-slate-800 rounded-2xl p-8 hover:border-blue-500/30 transition-colors">
                  <div className="flex items-center gap-3 mb-4">
                    <FileText className="w-6 h-6 text-blue-400" />
                    <h2 className="text-2xl font-bold text-white">7. Modifications</h2>
                  </div>
                  <div className="space-y-4 text-zinc-300 leading-relaxed">
                    <p>
                      We reserve the right to modify these terms at any time. Any changes will be posted on this page with an updated "Last Updated" date.
                    </p>
                    <p className="text-sm text-zinc-400">
                      Please review this page regularly for any updates. Your continued use of the website after changes are posted constitutes acceptance of those changes.
                    </p>
                  </div>
                </section>
              </>
            )}
          </div>

          {/* Footer Note */}
          <div className="mt-12 pt-8 border-t border-slate-800 text-center text-sm text-zinc-500">
            <p>{lang === 'ar' ? 'آخر تحديث: 6 أبريل 2026' : 'Last Updated: April 6, 2026'}</p>
          </div>
        </div>
      </div>
    </>
  )
}
