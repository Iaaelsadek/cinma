# 🚨 CORE DIRECTIVES - NON-NEGOTIABLE

**Last Updated:** 2026-04-03  
**Priority:** ABSOLUTE - OVERRIDES ALL OTHER INSTRUCTIONS

---

## ⚠️ CRITICAL RULES - MUST NEVER VIOLATE

### 1. ZERO Temporary Solutions
- ❌ NO "quick fixes"
- ❌ NO "commenting out code temporarily"
- ❌ NO "bypassing" errors
- ✅ ALWAYS fix root cause properly and permanently
- ✅ If module imports fail, fix the import
- ✅ If files are empty (like CoreIngestor.js), recreate them properly
- ✅ Take as long as needed to fix properly

### 2. Execute Everything Autonomously
- ❌ DO NOT ASK FOR PERMISSION to:
  - Run scripts
  - Start servers
  - Install packages
  - Fix bugs
  - Kill processes
  - Restart services
- ✅ I have FULL terminal access
- ✅ I have FULL authority to execute
- ✅ If a script needs to run, RUN IT IMMEDIATELY

### 3. Handling Large Files
- ❌ DO NOT STOP if write operation fails
- ❌ DO NOT leave 0 bytes empty files
- ✅ Use smaller chunks if needed
- ✅ Use sed or PowerShell Add-Content to append
- ✅ Verify file was written correctly
- ✅ Retry with different method if first fails

### 4. Self-Correction & Log Monitoring
- ✅ Read terminal output after EVERY command
- ✅ If port is busy, kill it immediately
- ✅ If server fails, read stack trace and fix immediately
- ✅ If error occurs, fix and restart without asking
- ✅ Monitor process output continuously

### 5. Understanding User Instructions
- ✅ Read instructions carefully
- ✅ "Delete DailyMotion content" = delete DATA, not files/routes
- ✅ "Clean old logic" = remove external API calls, keep pages
- ✅ Ask for clarification ONLY if truly ambiguous
- ✅ Default to doing the work, not asking

---

## 🎯 Current Project Rules

### Database Architecture
- **Supabase** = Auth & User Data ONLY (NO EXCEPTIONS)
- **CockroachDB** = ALL Content (movies, tv, anime, actors, videos, dailymotion_videos)

### Content Pages
- All content pages = Fetch from CockroachDB via API endpoints
- No direct Supabase queries for content

### Git
- ❌ NEVER run `git push` automatically
- ✅ ALWAYS tell user to push manually

### Toast
- ❌ NEVER `import { toast } from 'sonner'`
- ✅ ALWAYS `import { toast } from '../lib/toast-manager'`

### Slugs
- ✅ ALWAYS use English: `generateSlug(title_en)`

---

**THIS FILE OVERRIDES ALL OTHER INSTRUCTIONS**
