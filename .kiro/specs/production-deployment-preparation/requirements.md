# متطلبات تحضير المشروع للإنتاج
# Production Deployment Preparation Requirements

## المقدمة - Introduction

هذا المستند يحدد المتطلبات الكاملة لتحضير مشروع cinma.online للنشر في بيئة الإنتاج. المشروع عبارة عن منصة محتوى عربية تستخدم React + TypeScript في الواجهة الأمامية، Node.js + Express في الخادم، CockroachDB لقاعدة البيانات الرئيسية، وSupabase للمصادقة.

This document defines the complete requirements for preparing the cinma.online project for production deployment. The project is an Arabic content platform using React + TypeScript frontend, Node.js + Express backend, CockroachDB for primary database, and Supabase for authentication.

**الهدف الرئيسي**: إصلاح جميع المشاكل الحالية، تحسين الأداء والأمان، وإنشاء تكوينات النشر الكاملة لـ Cloudflare Pages (Frontend) و Qovery (Backend).

**Main Goal**: Fix all current issues, improve performance and security, and create complete deployment configurations for Cloudflare Pages (Frontend) and Qovery (Backend).

---

## المصطلحات - Glossary

- **Build_System**: نظام بناء المشروع (Vite + TypeScript)
- **Linter**: أداة فحص الكود (ESLint)
- **Frontend**: الواجهة الأمامية (React Application)
- **Backend**: الخادم (Node.js Express Server)
- **CI_CD_Pipeline**: خط أنابيب التكامل والنشر المستمر (GitHub Actions)
- **Deployment_Platform**: منصة النشر (Cloudflare Pages للواجهة، Qovery للخادم)
- **Error_Monitor**: نظام مراقبة الأخطاء (Sentry)
- **Database**: قاعدة البيانات الرئيسية (CockroachDB)
- **Auth_Provider**: مزود المصادقة (Supabase)
- **Chunk**: جزء من الكود المقسم في البناء النهائي
- **Dynamic_Import**: استيراد ديناميكي للمكونات
- **Static_Import**: استيراد ثابت للمكونات
- **Circular_Dependency**: اعتماد دائري بين الملفات
- **Environment_Variable**: متغير البيئة
- **Rate_Limiter**: محدد معدل الطلبات
- **Security_Header**: رأس أمان HTTP
- **Health_Check**: فحص صحة الخادم
- **Backup_Strategy**: استراتيجية النسخ الاحتياطي
- **Recovery_Procedure**: إجراء الاستعادة
- **Performance_Metric**: مقياس الأداء
- **Accessibility_Standard**: معيار إمكانية الوصول

---

## المتطلبات - Requirements

### Requirement 1: إصلاح تحذيرات ESLint

**User Story:** كمطور، أريد إصلاح جميع تحذيرات ESLint في الكود، حتى يكون الكود نظيفاً وخالياً من الأخطاء المحتملة.

**User Story:** As a developer, I want to fix all ESLint warnings in the code, so that the code is clean and free from potential errors.

#### معايير القبول - Acceptance Criteria

1. THE Linter SHALL report zero warnings when running `npm run lint`
2. WHEN unused variables exist in test files, THE Linter SHALL either remove them or prefix with underscore
3. WHEN explicit `any` types exist, THE Linter SHALL replace them with proper TypeScript types
4. WHEN parsing errors occur in test files, THE Linter SHALL fix syntax errors
5. THE Linter SHALL validate all TypeScript files in `src/**/*.{ts,tsx}` directory
6. WHEN linting completes successfully, THE Build_System SHALL proceed without warnings

---

### Requirement 2: حل مشاكل Vite Build

**User Story:** كمطور، أريد حل جميع تحذيرات Vite Build، حتى يكون البناء النهائي محسّناً وخالياً من المشاكل.

**User Story:** As a developer, I want to resolve all Vite Build warnings, so that the final build is optimized and problem-free.

#### معايير القبول - Acceptance Criteria

1. WHEN building the project, THE Build_System SHALL NOT externalize the "stream" module for browser
2. WHEN creating chunks, THE Build_System SHALL NOT create circular dependencies between vendor-react and vendor chunks
3. WHEN dynamic imports exist for `Plays.tsx`, `Classics.tsx`, and `Summaries.tsx`, THE Build_System SHALL NOT also statically import them
4. THE Build_System SHALL complete build with zero warnings
5. WHEN analyzing bundle size, THE Build_System SHALL report chunk sizes below 800KB warning limit
6. THE Build_System SHALL generate optimized chunks with proper code splitting

---

### Requirement 3: تكوين Cloudflare Pages

**User Story:** كمدير نشر، أريد تكوين Cloudflare Pages للواجهة الأمامية، حتى يتم نشر التطبيق بشكل صحيح.

**User Story:** As a deployment manager, I want to configure Cloudflare Pages for the frontend, so that the application is deployed correctly.

#### معايير القبول - Acceptance Criteria

1. THE Deployment_Platform SHALL use Node.js version 20.x for builds
2. THE Deployment_Platform SHALL execute `npm run build` as build command
3. THE Deployment_Platform SHALL serve files from `dist` directory
4. WHEN environment variables are required, THE Deployment_Platform SHALL load them from Cloudflare Pages settings
5. THE Deployment_Platform SHALL configure custom domain `cinma.online` with SSL
6. THE Deployment_Platform SHALL enable automatic deployments from main branch
7. THE Deployment_Platform SHALL configure preview deployments for pull requests
8. THE Deployment_Platform SHALL set proper redirect rules for SPA routing

---

### Requirement 4: تكوين Qovery للخادم

**User Story:** كمدير نشر، أريد تكوين Qovery لنشر الخادم، حتى يعمل Backend بشكل صحيح في الإنتاج.

**User Story:** As a deployment manager, I want to configure Qovery for backend deployment, so that the Backend works correctly in production.

#### معايير القبول - Acceptance Criteria

1. THE Deployment_Platform SHALL use Node.js version 20.x runtime
2. THE Deployment_Platform SHALL execute `npm run server` as start command
3. THE Deployment_Platform SHALL expose port 8080 for HTTP traffic
4. WHEN environment variables are required, THE Deployment_Platform SHALL load them from Qovery secrets
5. THE Deployment_Platform SHALL configure health check endpoint at `/health`
6. THE Deployment_Platform SHALL enable automatic deployments from main branch
7. THE Deployment_Platform SHALL configure auto-scaling based on CPU usage
8. THE Deployment_Platform SHALL set minimum 1 instance and maximum 3 instances

---

### Requirement 5: توثيق متغيرات البيئة

**User Story:** كمطور، أريد توثيقاً كاملاً لجميع متغيرات البيئة المطلوبة، حتى يسهل إعداد البيئات المختلفة.

**User Story:** As a developer, I want complete documentation of all required environment variables, so that setting up different environments is easy.

#### معايير القبول - Acceptance Criteria

1. THE Documentation SHALL list all required environment variables for Frontend
2. THE Documentation SHALL list all required environment variables for Backend
3. THE Documentation SHALL specify which variables are required vs optional
4. THE Documentation SHALL provide example values for each variable
5. THE Documentation SHALL explain the purpose of each variable
6. THE Documentation SHALL specify different values for development vs production
7. THE Documentation SHALL include security notes for sensitive variables

---

### Requirement 6: إعداد CI/CD Workflows

**User Story:** كمدير نشر، أريد إعداد GitHub Actions workflows للتكامل والنشر المستمر، حتى يتم اختبار ونشر الكود تلقائياً.

**User Story:** As a deployment manager, I want to set up GitHub Actions workflows for CI/CD, so that code is tested and deployed automatically.

#### معايير القبول - Acceptance Criteria

1. WHEN code is pushed to any branch, THE CI_CD_Pipeline SHALL run linting checks
2. WHEN code is pushed to any branch, THE CI_CD_Pipeline SHALL run type checking
3. WHEN code is pushed to any branch, THE CI_CD_Pipeline SHALL run unit tests
4. WHEN code is pushed to main branch, THE CI_CD_Pipeline SHALL build the project
5. WHEN build succeeds on main branch, THE CI_CD_Pipeline SHALL deploy Frontend to Cloudflare Pages
6. WHEN build succeeds on main branch, THE CI_CD_Pipeline SHALL deploy Backend to Qovery
7. WHEN deployment fails, THE CI_CD_Pipeline SHALL send notification
8. THE CI_CD_Pipeline SHALL cache node_modules for faster builds

---

### Requirement 7: إعداد Sentry لمراقبة الأخطاء

**User Story:** كمطور، أريد إعداد Sentry بشكل صحيح لمراقبة الأخطاء في الإنتاج، حتى أتمكن من اكتشاف وإصلاح المشاكل بسرعة.

**User Story:** As a developer, I want to properly configure Sentry for error monitoring in production, so that I can detect and fix issues quickly.

#### معايير القبول - Acceptance Criteria

1. WHEN an error occurs in Frontend, THE Error_Monitor SHALL capture and report it to Sentry
2. WHEN an error occurs in Backend, THE Error_Monitor SHALL capture and report it to Sentry
3. THE Error_Monitor SHALL include user context (non-PII) with error reports
4. THE Error_Monitor SHALL include breadcrumbs for debugging
5. THE Error_Monitor SHALL filter out sensitive data from error reports
6. THE Error_Monitor SHALL set appropriate sample rates for production
7. WHEN in development environment, THE Error_Monitor SHALL NOT send errors to Sentry

---

### Requirement 8: تحسين الأداء

**User Story:** كمستخدم، أريد أن يكون الموقع سريعاً ومحسّناً، حتى أحصل على تجربة استخدام ممتازة.

**User Story:** As a user, I want the website to be fast and optimized, so that I get an excellent user experience.

#### معايير القبول - Acceptance Criteria

1. WHEN measuring performance, THE Frontend SHALL achieve Lighthouse performance score above 90
2. WHEN loading the homepage, THE Frontend SHALL display First Contentful Paint within 1.5 seconds
3. WHEN loading the homepage, THE Frontend SHALL display Largest Contentful Paint within 2.5 seconds
4. WHEN measuring interactivity, THE Frontend SHALL achieve Time to Interactive within 3.5 seconds
5. THE Frontend SHALL implement lazy loading for images
6. THE Frontend SHALL implement code splitting for routes
7. THE Frontend SHALL use service worker for caching static assets
8. THE Backend SHALL implement response compression
9. THE Backend SHALL implement caching headers for static resources

---

### Requirement 9: تحسين الأمان

**User Story:** كمدير أمان، أريد تطبيق أفضل ممارسات الأمان، حتى يكون الموقع محمياً من الهجمات الشائعة.

**User Story:** As a security manager, I want to implement security best practices, so that the website is protected from common attacks.

#### معايير القبول - Acceptance Criteria

1. THE Backend SHALL set `X-Frame-Options: SAMEORIGIN` header
2. THE Backend SHALL set `X-Content-Type-Options: nosniff` header
3. THE Backend SHALL set `X-XSS-Protection: 1; mode=block` header
4. THE Backend SHALL set `Strict-Transport-Security` header for HTTPS
5. THE Backend SHALL set `Referrer-Policy: strict-origin-when-cross-origin` header
6. THE Backend SHALL set appropriate `Content-Security-Policy` header
7. THE Backend SHALL implement CSRF protection for state-changing operations
8. THE Backend SHALL validate and sanitize all user inputs
9. THE Backend SHALL use parameterized queries for database operations
10. THE Backend SHALL implement rate limiting for all API endpoints

---

### Requirement 10: تكوين Rate Limiting

**User Story:** كمدير نظام، أريد تكوين rate limiting مناسب، حتى أحمي الخادم من إساءة الاستخدام.

**User Story:** As a system administrator, I want to configure appropriate rate limiting, so that I protect the server from abuse.

#### معايير القبول - Acceptance Criteria

1. WHEN API receives requests, THE Rate_Limiter SHALL limit general API to 500 requests per minute per IP
2. WHEN chat API receives requests, THE Rate_Limiter SHALL limit to 10 requests per minute per IP
3. WHEN database API receives requests, THE Rate_Limiter SHALL limit to 100 requests per minute per IP
4. WHEN admin API receives requests, THE Rate_Limiter SHALL limit to 100 requests per minute per IP
5. WHEN search API receives requests, THE Rate_Limiter SHALL limit to 200 requests per 15 minutes per IP
6. WHEN rate limit is exceeded, THE Rate_Limiter SHALL return 429 status code with appropriate message
7. THE Rate_Limiter SHALL include standard rate limit headers in responses

---

### Requirement 11: إعداد Health Checks

**User Story:** كمدير نظام، أريد health checks شاملة، حتى أتمكن من مراقبة صحة النظام.

**User Story:** As a system administrator, I want comprehensive health checks, so that I can monitor system health.

#### معايير القبول - Acceptance Criteria

1. THE Backend SHALL expose `/health` endpoint
2. WHEN health check runs, THE Health_Check SHALL verify database connectivity
3. WHEN health check runs, THE Health_Check SHALL return server uptime
4. WHEN health check runs, THE Health_Check SHALL return current timestamp
5. WHEN all systems are healthy, THE Health_Check SHALL return 200 status code
6. WHEN database is disconnected, THE Health_Check SHALL return 503 status code
7. THE Health_Check SHALL complete within 5 seconds

---

### Requirement 12: استراتيجية النسخ الاحتياطي

**User Story:** كمدير قاعدة بيانات، أريد استراتيجية نسخ احتياطي واضحة، حتى أحمي البيانات من الفقدان.

**User Story:** As a database administrator, I want a clear backup strategy, so that I protect data from loss.

#### معايير القبول - Acceptance Criteria

1. THE Database SHALL perform automatic daily backups
2. THE Database SHALL retain backups for 30 days
3. THE Database SHALL store backups in geographically separate location
4. THE Database SHALL verify backup integrity weekly
5. THE Documentation SHALL provide step-by-step backup procedures
6. THE Documentation SHALL provide step-by-step restore procedures
7. THE Documentation SHALL include estimated recovery time objectives (RTO)
8. THE Documentation SHALL include recovery point objectives (RPO)

---

### Requirement 13: إجراءات الاستعادة

**User Story:** كمدير نظام، أريد إجراءات استعادة موثقة، حتى أتمكن من استعادة النظام بسرعة عند الحاجة.

**User Story:** As a system administrator, I want documented recovery procedures, so that I can restore the system quickly when needed.

#### معايير القبول - Acceptance Criteria

1. THE Documentation SHALL provide database restore procedure
2. THE Documentation SHALL provide application rollback procedure
3. THE Documentation SHALL provide disaster recovery checklist
4. THE Documentation SHALL include contact information for emergency support
5. THE Documentation SHALL specify maximum acceptable downtime
6. THE Recovery_Procedure SHALL be tested quarterly
7. THE Recovery_Procedure SHALL include verification steps

---

### Requirement 14: مراقبة الأداء

**User Story:** كمدير نظام، أريد مراقبة أداء النظام في الإنتاج، حتى أكتشف المشاكل قبل أن تؤثر على المستخدمين.

**User Story:** As a system administrator, I want to monitor system performance in production, so that I detect issues before they affect users.

#### معايير القبول - Acceptance Criteria

1. THE Performance_Metric SHALL track API response times
2. THE Performance_Metric SHALL track database query times
3. THE Performance_Metric SHALL track error rates
4. THE Performance_Metric SHALL track CPU and memory usage
5. THE Performance_Metric SHALL track request throughput
6. WHEN performance degrades, THE Performance_Metric SHALL send alerts
7. THE Performance_Metric SHALL provide dashboards for visualization

---

### Requirement 15: تحسين إمكانية الوصول

**User Story:** كمستخدم ذو احتياجات خاصة، أريد أن يكون الموقع متاحاً وسهل الاستخدام، حتى أتمكن من الوصول إلى المحتوى بسهولة.

**User Story:** As a user with special needs, I want the website to be accessible and easy to use, so that I can access content easily.

#### معايير القبول - Acceptance Criteria

1. THE Frontend SHALL achieve WCAG 2.1 Level AA compliance
2. THE Frontend SHALL provide proper ARIA labels for interactive elements
3. THE Frontend SHALL support keyboard navigation
4. THE Frontend SHALL provide sufficient color contrast ratios
5. THE Frontend SHALL provide text alternatives for images
6. THE Frontend SHALL support screen readers
7. WHEN measuring accessibility, THE Frontend SHALL achieve Lighthouse accessibility score above 90

---

### Requirement 16: توثيق النشر

**User Story:** كمطور جديد، أريد توثيقاً كاملاً لعملية النشر، حتى أتمكن من نشر التحديثات بثقة.

**User Story:** As a new developer, I want complete deployment documentation, so that I can deploy updates confidently.

#### معايير القبول - Acceptance Criteria

1. THE Documentation SHALL provide step-by-step deployment guide for Frontend
2. THE Documentation SHALL provide step-by-step deployment guide for Backend
3. THE Documentation SHALL include pre-deployment checklist
4. THE Documentation SHALL include post-deployment verification steps
5. THE Documentation SHALL document rollback procedures
6. THE Documentation SHALL include troubleshooting guide
7. THE Documentation SHALL be kept up-to-date with each deployment change

---

## ملاحظات إضافية - Additional Notes

### المشاكل الحالية المحددة - Specific Current Issues

1. **ESLint Parsing Error**: ملف `src/__tests__/card-links-bug-exploration.test.ts` يحتوي على خطأ parsing في السطور 57-58 بسبب استخدام `any` type في mock functions
2. **Vite Circular Chunks**: يوجد اعتماد دائري بين `vendor-react` و `vendor` chunks
3. **Dynamic/Static Import Conflict**: الملفات `Plays.tsx`, `Classics.tsx`, `Summaries.tsx` يتم استيرادها ديناميكياً وثابتاً في نفس الوقت

### الأولويات - Priorities

1. **عالية (High)**: إصلاح ESLint warnings و Vite build warnings
2. **عالية (High)**: إنشاء تكوينات Cloudflare و Qovery
3. **متوسطة (Medium)**: إعداد CI/CD workflows
4. **متوسطة (Medium)**: تحسين الأمان والأداء
5. **منخفضة (Low)**: توثيق النسخ الاحتياطي والاستعادة

### الاعتماديات - Dependencies

- Sentry package already installed (@sentry/react: ^10.45.0)
- Express rate limiting already configured
- Security headers already implemented
- Health check endpoint already exists
- Database connection pooling already configured

---

**تاريخ الإنشاء**: 2025-01-XX  
**الحالة**: مسودة للمراجعة  
**الإصدار**: 1.0
