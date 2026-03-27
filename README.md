# 🎬 أونلاين سينما - Online Cinema

[![Build Status](https://img.shields.io/badge/build-passing-brightgreen)](https://github.com)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.8-blue)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-19.0-61dafb)](https://reactjs.org/)
[![License](https://img.shields.io/badge/license-MIT-green)](LICENSE)

منصة عربية شاملة لمشاهدة الأفلام والمسلسلات مع مساعد ذكي AI.

## ✨ المميزات

- 🎥 مكتبة ضخمة من الأفلام والمسلسلات العربية والأجنبية
- 🤖 مساعد ذكي AI للبحث والاقتراحات (Gemini + Groq + Mistral)
- 📱 تطبيق PWA يعمل على جميع الأجهزة
- 🔒 حماية متعددة الطبقات للفيديو
- ⚡ أداء عالي مع Code Splitting & Lazy Loading
- 🌙 وضع ليلي مريح للعين
- 🎭 واجهة عصرية وسهلة الاستخدام
- 📊 لوحة تحكم إدارية شاملة
- 🔍 بحث متقدم مع فلاتر ذكية
- 🎬 مشغل فيديو متطور مع دعم الترجمات

## 🚀 التقنيات المستخدمة

### Frontend
- **React 19** + **TypeScript 5.8**
- **Cloudflare** (Frontend Hosting)
- **Vite 7** (Build Tool)
- **TailwindCSS 3** (Styling)
- **Zustand** (State Management)
- **React Router 7** (Routing)
- **Framer Motion** (Animations)
- **Lottie** (Vector Animations)
- **React Query** (Data Fetching)

### Backend
- **Node.js** + **Express 5**
- **Koyeb** (Backend Hosting)
- **CockroachDB** (Primary Database for Media & App Data)
- **Supabase** (User Auth & Registration ONLY)
- **Google Gemini AI** (Primary)
- **Groq AI** (Fallback 1)
- **Mistral AI** (Fallback 2)

### Security & Performance
- ✅ CSRF Protection
- ✅ Rate Limiting (3 levels: Global, User, IP)
- ✅ Input Sanitization (DOMPurify)
- ✅ SQL Injection Protection
- ✅ Content Security Policy
- ✅ Error Logging & Monitoring (Sentry)
- ✅ Code Splitting & Tree Shaking
- ✅ Image Optimization & Lazy Loading

## 📦 التثبيت

```bash
# Clone the repository
git clone https://github.com/yourusername/cinma.online.git
cd cinma.online

# Install dependencies
npm install

# Setup environment variables
cp .env.example .env.local
# Edit .env.local with your API keys

# Run development server
npm run dev

# Run backend server
npm run server
```

## 🔧 Environment Variables

```env
# Database
COCKROACHDB_URL=your_cockroachdb_url

# AI Services
GEMINI_API_KEY=your_gemini_key
GROQ_API_KEY=your_groq_key
MISTRAL_API_KEY=your_mistral_key

# TMDB
TMDB_API_KEY=your_tmdb_key

# App
VITE_APP_URL=http://localhost:5173
PORT=3001
```

## 🗄️ Database Setup

```bash
# Run indexes script
psql $COCKROACHDB_URL -f scripts/add_indexes.sql

# Run constraints script
psql $COCKROACHDB_URL -f scripts/add_constraints.sql
```

## 📝 Scripts

```bash
# Development
npm run dev          # Start frontend dev server
npm run server       # Start backend server

# Build
npm run build        # Build for production
npm run preview      # Preview production build

# Linting
npm run lint         # Run ESLint
npm run lint:fix     # Fix ESLint errors

# Testing
npm run test         # Run tests (coming soon)
```

## 🏗️ Project Structure

```
cinma.online/
├── src/
│   ├── components/      # React components
│   ├── pages/          # Page components
│   ├── lib/            # Utilities & helpers
│   ├── hooks/          # Custom React hooks
│   ├── routes/         # Route definitions
│   └── state/          # State management
├── server/
│   ├── api/            # API endpoints
│   ├── lib/            # Server utilities
│   └── middleware/     # Express middleware
├── scripts/
│   ├── add_indexes.sql     # Database indexes
│   └── add_constraints.sql # Database constraints
└── public/             # Static assets
```

## 🔒 Security Features

1. **CSRF Protection** - Token-based protection
2. **Rate Limiting** - 3 levels (API, DB, Chat)
3. **Input Sanitization** - DOMPurify for XSS prevention
4. **SQL Injection Protection** - Parameterized queries
5. **Error Logging** - Centralized error tracking
6. **Content Security Policy** - Strict CSP headers
7. **Database Connection Pooling** - Optimized connections

## 🎯 Performance Optimizations

- ✅ React.memo for components
- ✅ Lazy loading for routes
- ✅ Lazy loading for images
- ✅ Database indexes
- ✅ Connection pooling
- ✅ Code splitting
- ✅ Asset optimization

## 📱 PWA Features

- Offline support
- Install prompt
- App-like experience
- Push notifications (coming soon)

## 🤝 Contributing

Contributions are welcome! Please read our contributing guidelines first.

## 📄 License

This project is licensed under the MIT License.

## 👥 Team

- **Frontend** - React + TypeScript
- **Backend** - Node.js + Express
- **AI** - Multi-provider fallback system
- **Database** - CockroachDB

## 📞 Support

For support, email support@cinma.online or join our Discord server.

---

Made with ❤️ in Egypt 🇪🇬
