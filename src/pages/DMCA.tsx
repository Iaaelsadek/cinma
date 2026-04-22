import React from 'react'
import { Helmet } from 'react-helmet-async'
import { useLang } from '../state/useLang'
import { Shield, AlertTriangle, Mail, FileText, Clock, CheckCircle } from 'lucide-react'

export const DMCA = () => {
  const { lang } = useLang()

  return (
    <>
      <Helmet>
        <title>{lang === 'ar' ? 'سياسة DMCA - 4Cima' : 'DMCA Policy - 4Cima'}</title>
      </Helmet>

      <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950">
        {/* Hero Section */}
        <div className="relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/10 to-purple-500/10" />
          <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-10" />
          
          <div className="container mx-auto px-4 py-16 relative">
            <div className="max-w-4xl mx-auto text-center">
              <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-br from-cyan-500 to-purple-600 mb-6">
                <Shield className="w-10 h-10 text-white" />
              </div>
              
              <h1 className="text-4xl md:text-5xl font-black mb-4 bg-gradient-to-r from-cyan-400 to-purple-400 bg-clip-text text-transparent">
                {lang === 'ar' ? 'سياسة DMCA' : 'DMCA Policy'}
              </h1>
              
              <p className="text-xl text-zinc-400">
                {lang === 'ar' 
                  ? 'نحترم حقوق الملكية الفكرية ونلتزم بقانون الألفية الرقمية (DMCA)'
                  : 'We respect intellectual property rights and comply with the Digital Millennium Copyright Act (DMCA)'}
              </p>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="container mx-auto px-4 py-12 max-w-4xl">
          <div className="space-y-8">
            {lang === 'ar' ? (
              <>
                {/* Notice */}
                <div className="bg-gradient-to-br from-amber-500/10 to-orange-500/10 border border-amber-500/20 rounded-2xl p-6">
                  <div className="flex items-start gap-4">
                    <AlertTriangle className="w-6 h-6 text-amber-400 flex-shrink-0 mt-1" />
                    <div>
                      <h3 className="text-xl font-bold text-amber-400 mb-2">إشعار هام</h3>
                      <p className="text-zinc-300 leading-relaxed">
                        4Cima لا يستضيف أي محتوى محمي بحقوق الطبع والنشر على خوادمنا. 
                        نحن نوفر فقط روابط لمحتوى متاح بشكل عام على الإنترنت من مصادر خارجية.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Section 1 */}
                <section className="bg-slate-900/50 border border-slate-800 rounded-2xl p-8">
                  <div className="flex items-center gap-3 mb-4">
                    <FileText className="w-6 h-6 text-cyan-400" />
                    <h2 className="text-2xl font-bold text-white">1. سياستنا</h2>
                  </div>
                  <div className="space-y-4 text-zinc-300 leading-relaxed">
                    <p>
                      نحن نحترم حقوق الملكية الفكرية للآخرين ونتوقع من مستخدمينا أن يفعلوا الشيء نفسه. 
                      وفقاً لقانون الألفية الرقمية (DMCA)، سنستجيب بسرعة لإشعارات انتهاك حقوق الطبع والنشر.
                    </p>
                    <p>
                      إذا كنت تعتقد أن عملك المحمي بحقوق الطبع والنشر قد تم نسخه بطريقة تشكل انتهاكاً لحقوق الطبع والنشر، 
                      يرجى تقديم إشعار DMCA وفقاً للإجراءات الموضحة أدناه.
                    </p>
                  </div>
                </section>

                {/* Section 2 */}
                <section className="bg-slate-900/50 border border-slate-800 rounded-2xl p-8">
                  <div className="flex items-center gap-3 mb-4">
                    <Mail className="w-6 h-6 text-purple-400" />
                    <h2 className="text-2xl font-bold text-white">2. تقديم إشعار DMCA</h2>
                  </div>
                  <div className="space-y-4 text-zinc-300 leading-relaxed">
                    <p>لتقديم إشعار DMCA صالح، يجب أن يتضمن الإشعار المعلومات التالية:</p>
                    
                    <div className="space-y-3 mt-4">
                      <div className="flex items-start gap-3 bg-slate-800/50 p-4 rounded-lg">
                        <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
                        <div>
                          <strong className="text-white">التوقيع الإلكتروني:</strong>
                          <p className="text-sm mt-1">توقيع إلكتروني أو مادي للشخص المخول بالتصرف نيابة عن مالك حقوق الطبع والنشر.</p>
                        </div>
                      </div>

                      <div className="flex items-start gap-3 bg-slate-800/50 p-4 rounded-lg">
                        <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
                        <div>
                          <strong className="text-white">تحديد العمل:</strong>
                          <p className="text-sm mt-1">وصف للعمل المحمي بحقوق الطبع والنشر الذي تدعي أنه تم انتهاكه.</p>
                        </div>
                      </div>

                      <div className="flex items-start gap-3 bg-slate-800/50 p-4 rounded-lg">
                        <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
                        <div>
                          <strong className="text-white">تحديد المحتوى المخالف:</strong>
                          <p className="text-sm mt-1">وصف للمادة التي تدعي أنها تنتهك حقوق الطبع والنشر، مع رابط URL المحدد.</p>
                        </div>
                      </div>

                      <div className="flex items-start gap-3 bg-slate-800/50 p-4 rounded-lg">
                        <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
                        <div>
                          <strong className="text-white">معلومات الاتصال:</strong>
                          <p className="text-sm mt-1">عنوانك، رقم هاتفك، وعنوان بريدك الإلكتروني.</p>
                        </div>
                      </div>

                      <div className="flex items-start gap-3 bg-slate-800/50 p-4 rounded-lg">
                        <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
                        <div>
                          <strong className="text-white">بيان حسن النية:</strong>
                          <p className="text-sm mt-1">بيان بأن لديك اعتقاد بحسن نية أن الاستخدام غير مصرح به.</p>
                        </div>
                      </div>

                      <div className="flex items-start gap-3 bg-slate-800/50 p-4 rounded-lg">
                        <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
                        <div>
                          <strong className="text-white">بيان الدقة:</strong>
                          <p className="text-sm mt-1">بيان بأن المعلومات في الإشعار دقيقة وأنك مخول بالتصرف نيابة عن المالك.</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </section>

                {/* Section 3 */}
                <section className="bg-slate-900/50 border border-slate-800 rounded-2xl p-8">
                  <div className="flex items-center gap-3 mb-4">
                    <Clock className="w-6 h-6 text-cyan-400" />
                    <h2 className="text-2xl font-bold text-white">3. وقت الاستجابة</h2>
                  </div>
                  <div className="space-y-4 text-zinc-300 leading-relaxed">
                    <p>
                      نلتزم بمعالجة جميع إشعارات DMCA الصالحة في غضون <strong className="text-white">24-48 ساعة</strong> من استلامها.
                    </p>
                    <p>
                      سنقوم بإزالة أو تعطيل الوصول إلى المحتوى المخالف فوراً بعد التحقق من صحة الإشعار.
                    </p>
                  </div>
                </section>

                {/* Contact */}
                <section className="bg-gradient-to-br from-cyan-500/10 to-purple-500/10 border border-cyan-500/20 rounded-2xl p-8">
                  <div className="flex items-center gap-3 mb-4">
                    <Mail className="w-6 h-6 text-cyan-400" />
                    <h2 className="text-2xl font-bold text-white">اتصل بنا</h2>
                  </div>
                  <div className="space-y-4 text-zinc-300 leading-relaxed">
                    <p>لتقديم إشعار DMCA، يرجى إرسال بريد إلكتروني إلى:</p>
                    <div className="bg-slate-900/50 p-4 rounded-lg">
                      <a 
                        href="mailto:dmca@4cima.com" 
                        className="text-cyan-400 hover:text-cyan-300 font-mono text-lg transition-colors"
                      >
                        dmca@4cima.com
                      </a>
                    </div>
                    <p className="text-sm text-zinc-400">
                      يرجى التأكد من تضمين جميع المعلومات المطلوبة المذكورة أعلاه لضمان معالجة سريعة لطلبك.
                    </p>
                  </div>
                </section>

                {/* Counter Notice */}
                <section className="bg-slate-900/50 border border-slate-800 rounded-2xl p-8">
                  <h2 className="text-2xl font-bold text-white mb-4">4. الإشعار المضاد</h2>
                  <div className="space-y-4 text-zinc-300 leading-relaxed">
                    <p>
                      إذا كنت تعتقد أن المحتوى الخاص بك تمت إزالته عن طريق الخطأ أو التعريف الخاطئ، 
                      يمكنك تقديم إشعار مضاد وفقاً لقانون DMCA.
                    </p>
                    <p>
                      يجب أن يتضمن الإشعار المضاد معلومات مماثلة للإشعار الأصلي، بالإضافة إلى بيان بأنك توافق على الاختصاص القضائي.
                    </p>
                  </div>
                </section>

                {/* Repeat Infringers */}
                <section className="bg-slate-900/50 border border-slate-800 rounded-2xl p-8">
                  <h2 className="text-2xl font-bold text-white mb-4">5. المنتهكون المتكررون</h2>
                  <div className="space-y-4 text-zinc-300 leading-relaxed">
                    <p>
                      سياستنا هي إنهاء حسابات المستخدمين الذين يتبين أنهم منتهكون متكررون لحقوق الطبع والنشر.
                    </p>
                  </div>
                </section>
              </>
            ) : (
              <>
                {/* Notice */}
                <div className="bg-gradient-to-br from-amber-500/10 to-orange-500/10 border border-amber-500/20 rounded-2xl p-6">
                  <div className="flex items-start gap-4">
                    <AlertTriangle className="w-6 h-6 text-amber-400 flex-shrink-0 mt-1" />
                    <div>
                      <h3 className="text-xl font-bold text-amber-400 mb-2">Important Notice</h3>
                      <p className="text-zinc-300 leading-relaxed">
                        4Cima does not host any copyrighted content on our servers. 
                        We only provide links to publicly available content on the internet from external sources.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Section 1 */}
                <section className="bg-slate-900/50 border border-slate-800 rounded-2xl p-8">
                  <div className="flex items-center gap-3 mb-4">
                    <FileText className="w-6 h-6 text-cyan-400" />
                    <h2 className="text-2xl font-bold text-white">1. Our Policy</h2>
                  </div>
                  <div className="space-y-4 text-zinc-300 leading-relaxed">
                    <p>
                      We respect the intellectual property rights of others and expect our users to do the same. 
                      In accordance with the Digital Millennium Copyright Act (DMCA), we will respond promptly to notices of alleged copyright infringement.
                    </p>
                    <p>
                      If you believe that your copyrighted work has been copied in a way that constitutes copyright infringement, 
                      please provide a DMCA notice in accordance with the procedures outlined below.
                    </p>
                  </div>
                </section>

                {/* Section 2 */}
                <section className="bg-slate-900/50 border border-slate-800 rounded-2xl p-8">
                  <div className="flex items-center gap-3 mb-4">
                    <Mail className="w-6 h-6 text-purple-400" />
                    <h2 className="text-2xl font-bold text-white">2. Filing a DMCA Notice</h2>
                  </div>
                  <div className="space-y-4 text-zinc-300 leading-relaxed">
                    <p>To file a valid DMCA notice, the notice must include the following information:</p>
                    
                    <div className="space-y-3 mt-4">
                      <div className="flex items-start gap-3 bg-slate-800/50 p-4 rounded-lg">
                        <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
                        <div>
                          <strong className="text-white">Electronic Signature:</strong>
                          <p className="text-sm mt-1">An electronic or physical signature of the person authorized to act on behalf of the copyright owner.</p>
                        </div>
                      </div>

                      <div className="flex items-start gap-3 bg-slate-800/50 p-4 rounded-lg">
                        <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
                        <div>
                          <strong className="text-white">Identification of Work:</strong>
                          <p className="text-sm mt-1">Description of the copyrighted work that you claim has been infringed.</p>
                        </div>
                      </div>

                      <div className="flex items-start gap-3 bg-slate-800/50 p-4 rounded-lg">
                        <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
                        <div>
                          <strong className="text-white">Identification of Infringing Material:</strong>
                          <p className="text-sm mt-1">Description of the material that you claim is infringing, with specific URL link.</p>
                        </div>
                      </div>

                      <div className="flex items-start gap-3 bg-slate-800/50 p-4 rounded-lg">
                        <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
                        <div>
                          <strong className="text-white">Contact Information:</strong>
                          <p className="text-sm mt-1">Your address, telephone number, and email address.</p>
                        </div>
                      </div>

                      <div className="flex items-start gap-3 bg-slate-800/50 p-4 rounded-lg">
                        <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
                        <div>
                          <strong className="text-white">Good Faith Statement:</strong>
                          <p className="text-sm mt-1">A statement that you have a good faith belief that the use is not authorized.</p>
                        </div>
                      </div>

                      <div className="flex items-start gap-3 bg-slate-800/50 p-4 rounded-lg">
                        <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
                        <div>
                          <strong className="text-white">Accuracy Statement:</strong>
                          <p className="text-sm mt-1">A statement that the information in the notice is accurate and you are authorized to act on behalf of the owner.</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </section>

                {/* Section 3 */}
                <section className="bg-slate-900/50 border border-slate-800 rounded-2xl p-8">
                  <div className="flex items-center gap-3 mb-4">
                    <Clock className="w-6 h-6 text-cyan-400" />
                    <h2 className="text-2xl font-bold text-white">3. Response Time</h2>
                  </div>
                  <div className="space-y-4 text-zinc-300 leading-relaxed">
                    <p>
                      We are committed to processing all valid DMCA notices within <strong className="text-white">24-48 hours</strong> of receipt.
                    </p>
                    <p>
                      We will remove or disable access to the infringing content immediately after verifying the validity of the notice.
                    </p>
                  </div>
                </section>

                {/* Contact */}
                <section className="bg-gradient-to-br from-cyan-500/10 to-purple-500/10 border border-cyan-500/20 rounded-2xl p-8">
                  <div className="flex items-center gap-3 mb-4">
                    <Mail className="w-6 h-6 text-cyan-400" />
                    <h2 className="text-2xl font-bold text-white">Contact Us</h2>
                  </div>
                  <div className="space-y-4 text-zinc-300 leading-relaxed">
                    <p>To file a DMCA notice, please send an email to:</p>
                    <div className="bg-slate-900/50 p-4 rounded-lg">
                      <a 
                        href="mailto:dmca@4cima.com" 
                        className="text-cyan-400 hover:text-cyan-300 font-mono text-lg transition-colors"
                      >
                        dmca@4cima.com
                      </a>
                    </div>
                    <p className="text-sm text-zinc-400">
                      Please ensure you include all required information mentioned above to ensure prompt processing of your request.
                    </p>
                  </div>
                </section>

                {/* Counter Notice */}
                <section className="bg-slate-900/50 border border-slate-800 rounded-2xl p-8">
                  <h2 className="text-2xl font-bold text-white mb-4">4. Counter Notice</h2>
                  <div className="space-y-4 text-zinc-300 leading-relaxed">
                    <p>
                      If you believe that your content was removed by mistake or misidentification, 
                      you may file a counter notice in accordance with the DMCA.
                    </p>
                    <p>
                      The counter notice must include similar information to the original notice, plus a statement that you consent to jurisdiction.
                    </p>
                  </div>
                </section>

                {/* Repeat Infringers */}
                <section className="bg-slate-900/50 border border-slate-800 rounded-2xl p-8">
                  <h2 className="text-2xl font-bold text-white mb-4">5. Repeat Infringers</h2>
                  <div className="space-y-4 text-zinc-300 leading-relaxed">
                    <p>
                      It is our policy to terminate the accounts of users who are found to be repeat infringers of copyright.
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
