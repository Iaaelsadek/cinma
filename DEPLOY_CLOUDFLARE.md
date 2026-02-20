# Deployment Guide: Cloudflare Pages + Backend

Your project consists of two parts:
1.  **Frontend** (React/Vite): Can be hosted on **Cloudflare Pages**.
2.  **Backend** (Node.js + Python): **Cannot** run on Cloudflare Pages. It requires a VPS or a container service (like Render, Railway, or DigitalOcean App Platform).

---

## Part 1: Deploy Frontend to Cloudflare Pages 🌐

### Prerequisites
1.  Push your code to a **GitHub Repository**.

### Steps
1.  Log in to the **Cloudflare Dashboard**.
2.  Go to **Workers & Pages** > **Create Application** > **Pages** > **Connect to Git**.
3.  Select your repository `cinema-online`.
4.  **Build Settings**:
    *   **Framework Preset**: `Vite`
    *   **Build Command**: `npm run build`
    *   **Output Directory**: `dist`
5.  **Environment Variables** (Production):
    Add these variables in the Cloudflare Dashboard (Settings > Environment Variables):
    *   `VITE_SUPABASE_URL`: (Your Supabase URL)
    *   `VITE_SUPABASE_ANON_KEY`: (Your Supabase Anon Key)
    *   `VITE_API_URL`: The URL of your deployed backend (see Part 2). *For now, you can leave this empty, but admin proxy features will fail until the backend is deployed.*

6.  Click **Save and Deploy**.

---

## Part 2: Deploy Backend (Node.js + Python) ⚙️

Since your backend runs a Python engine (`master_engine.py`) and an Express server, you need a server that supports both Node.js and Python.

### Recommended Option: Render / Railway / VPS
1.  **Render.com** (Easiest for mixed Node/Python):
    *   Create a **Web Service**.
    *   Connect your GitHub repo.
    *   **Build Command**: `npm install && pip install -r requirements.txt` (You may need to ensure Python is available in the build environment).
    *   **Start Command**: `npm run server`
    *   Add Environment Variables:
        *   `SUPABASE_URL`: ...
        *   `SUPABASE_SERVICE_ROLE_KEY`: ...
        *   `PYTHON_BIN`: `python` (or `python3`)

### Important Note
Once your backend is deployed (e.g., `https://my-api.onrender.com`), go back to your **Cloudflare Pages** settings and update the `VITE_API_URL` variable:
`VITE_API_URL` = `https://my-api.onrender.com`

---

## Verification
*   Visit your Cloudflare Pages URL (e.g., `https://cinema-online.pages.dev`).
*   The site should load.
*   **Note**: Admin features that rely on the proxy/Python engine will only work after Part 2 is completed and connected.
