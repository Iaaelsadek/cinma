# Deployment Guide: Cloudflare Pages + Render (Free Full-Stack)

This guide walks you through deploying your full-stack application for free using Cloudflare Pages (Frontend) and Render (Backend).

## Part 1: Deploy Backend to Render (API & Python Engine) ⚙️

Since your backend requires both Node.js and Python, we will deploy it as a **Docker container** on Render. This is already set up with the `Dockerfile` we created.

1.  **Push to GitHub**: Ensure your latest code is pushed to your GitHub repository.
2.  **Sign up/Login to Render**: Go to [render.com](https://render.com).
3.  **Create New Web Service**:
    *   Click **New +** -> **Web Service**.
    *   Select **Build and deploy from a Git repository**.
    *   Connect your `cinema-online` repository.
4.  **Configure Service**:
    *   **Name**: `cinema-online-api` (or similar)
    *   **Region**: Frankfurt (or closest to you)
    *   **Runtime**: **Docker** (Important!)
    *   **Instance Type**: Free
5.  **Environment Variables**:
    Scroll down to "Environment Variables" and add these keys (from your `.env` file):
    *   `SUPABASE_URL`: (Your Supabase URL)
    *   `SUPABASE_SERVICE_ROLE_KEY`: (Your Supabase Service Role Key)
    *   `SUPABASE_ANON_KEY`: (Your Supabase Anon Key)
    *   `GEMINI_API_KEY`: (Your Gemini API Key)
    *   `ADMIN_SYNC_TOKEN`: (Create a secret password for admin security, optional but recommended)
6.  **Deploy**: Click **Create Web Service**.
    *   Render will build the Docker image. This might take 3-5 minutes.
    *   Once valid, you will see "Live" and a URL like `https://cinema-online-api.onrender.com`.
    *   **Copy this URL**.

---

## Part 2: Deploy Frontend to Cloudflare Pages 🌐

1.  **Login to Cloudflare Dashboard**.
2.  Go to **Workers & Pages** > **Create Application** > **Pages** > **Connect to Git**.
3.  Select your `cinema-online` repository.
4.  **Build Settings**:
    *   **Framework Preset**: `Vite`
    *   **Build Command**: `npm run build`
    *   **Output Directory**: `dist`
5.  **Environment Variables**:
    *   `VITE_SUPABASE_URL`: (Your Supabase URL)
    *   `VITE_SUPABASE_ANON_KEY`: (Your Supabase Anon Key)
    *   `VITE_API_URL`: Paste the Render URL from Part 1 (e.g., `https://cinema-online-api.onrender.com`).
6.  **Deploy**: Click **Save and Deploy**.

---

## Verification ✅

1.  Open your Cloudflare Pages URL.
2.  The site should load fast.
3.  Go to **Admin Dashboard**.
4.  Try to "Fetch Content" or check "System Status".
5.  If it works, your Cloudflare Frontend is successfully talking to your Render Backend!
