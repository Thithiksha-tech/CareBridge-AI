# 🔐 CareBridge AI — Environment Configuration Guide

This directory manages environment configurations for **CareBridge AI**.

> [!WARNING]
> **NEVER commit `.env` or any file containing live API keys, secrets, or passwords to GitHub.**
> `.gitignore` is configured at the repository root to automatically ignore all active `.env` and `*.local` files.

---

## 📁 Environment Directory Contents

| File | Purpose | Version Controlled? |
|---|---|---|
| [`env/.env.example`](./.env.example) | Master configuration template with all parameters documented | ✅ Yes |
| [`env/.env.development`](./.env.development) | Pre-configured baseline for local development | ✅ Yes |
| [`env/.env.production`](./.env.production) | Production deployment template | ✅ Yes |
| `env/.env.local` | Your personal secret overrides | ❌ Ignored by Git |

---

## 🚀 Quick Setup Instructions

### 1. Initialize Your Local Environment
From the repository root, copy the template to `.env`:

```bash
# On Windows PowerShell:
Copy-Item env/.env.example .env

# On macOS/Linux:
cp env/.env.example .env
```

Alternatively, copy into `backend/.env`:
```bash
Copy-Item env/.env.example backend/.env
```

---

## 🔑 Key Configuration Parameters

### 1. Google Gemini AI Key (`GEMINI_API_KEY`)
- Get a free key at **[Google AI Studio](https://aistudio.google.com/app/apikey)**.
- Paste it into your `.env`:
  ```env
  GEMINI_API_KEY=your_gemini_api_key_here
  GEMINI_MODEL=gemini-3.8-flash
  ```
- *Optional Backup Key:* Add `GEMINI_BACKUP_API_KEY` for automatic fallback if rate limits occur.
- You can also update the key directly from the application UI in **Settings > AI Engine Configuration**.

### 2. JWT Authentication (`JWT_SECRET`)
- In production, set a cryptographically secure random string (minimum 32 characters):
  ```bash
  # Generate on Linux/macOS/Git Bash:
  openssl rand -base64 32
  ```

### 3. Outbound Email Alerts (`EMAIL_*`)
- **Local Testing:** Leave `EMAIL_USER` and `EMAIL_PASS` blank. The backend will automatically generate Ethereal preview links in the console for medication reminders.
- **Live Gmail Relay:**
  1. Turn on 2-Step Verification in your Google Account.
  2. Generate a 16-character **App Password** (under Security > App Passwords).
  3. Set:
     ```env
     EMAIL_HOST=smtp.gmail.com
     EMAIL_PORT=465
     EMAIL_SECURE=true
     EMAIL_USER=your_email@gmail.com
     EMAIL_PASS=your_16_char_app_password
     ```

---

## ☁️ Deployment Environment Variables (GitHub / Cloud)

When deploying to platforms such as **Render, Railway, Fly.io, Vercel, or AWS**:
Set these environment variables directly in your host dashboard:

```env
PORT=5000
NODE_ENV=production
JWT_SECRET=your_production_secret
DATABASE_PATH=./database/carebridge.sqlite
GEMINI_API_KEY=your_live_gemini_key
GEMINI_MODEL=gemini-3.8-flash
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=465
EMAIL_SECURE=true
EMAIL_USER=your_email@gmail.com
EMAIL_PASS=your_app_password
EMAIL_FROM="CareBridge AI <noreply@carebridge.ai>"
```
