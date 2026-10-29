# CareBridge AI — Smart Post-Hospital Recovery Platform
## Premium Healthcare Recovery & Clinical Intelligence System

CareBridge AI bridges the critical gap between complex hospital discharge summaries and daily home recovery. It transforms clinical notes into clear, actionable care routines with timed pill schedules, direct outbound email alerts, physician follow-up tracking, and a real-time conversational AI clinical assistant powered by Google's **Gemini 3.8 Flash** model.

---

## 🗂️ Clean Segregated Architecture

```
CareBridge AI/
├── ai/                 # Autonomous AI Module (Google Gemini 3.8 Flash Integration)
│   ├── geminiClient.js # Official Google GenAI client configured with model & key
│   ├── chatBot.js      # Patient-context conversational clinical assistant
│   ├── clinicalParser.js# Medical document extractor & instruction simplifier
│   └── index.js        # Unified AI module export
│
├── database/           # Persistent Storage Layer (SQLite WAL Engine)
│   ├── index.js        # Database connection, migrations, foreign keys
│   ├── schema.sql      # Schema definitions (users, discharge, reminders, appointments, logs)
│   └── carebridge.sqlite # Production SQLite database file
│
├── backend/            # Express REST API Server
│   ├── src/
│   │   ├── config/     # Mailer (Gmail/SMTP), Database bridge, Auth
│   │   ├── controllers/# Auth, Discharge, Reminders, Appointments, Chat, Settings
│   │   ├── routes/     # Mountable modular Express route files
│   │   ├── services/   # AI service wrappers and PDF text extraction
│   │   └── server.js   # Main Express application entrypoint
│   └── tests/          # Automated end-to-end test suites (100% passing)
│
└── frontend/           # Modern React 19 + TypeScript + Vite + Tailwind CSS SPA
    ├── src/
    │   ├── components/ # AppLayout, Sidebar, TopNavigation, FloatingAIChat, Button, Card, Badge, Toast
    │   ├── context/    # AuthContext, ToastContext
    │   ├── pages/      # Landing, Login, Signup, Dashboard, Upload, CarePlan, Appointments, Reminders, AIChat, Caregiver, Settings
    │   ├── services/   # Centralized Axios API service layer
    │   └── types/      # Strict TypeScript contracts for all healthcare entities
    └── dist/           # Production-optimized compiled frontend bundle
```

---

## 🎨 Master Visual Design Palette

Inspired by modern healthcare aesthetic:
- **Primary Purple:** `#665BE8`
- **Deep Indigo:** `#373B8F`
- **Periwinkle:** `#8C91F5`
- **Soft Lavender:** `#F0EEFF`
- **Pale Blue:** `#EAF0FF`
- **Clean Surface:** `#FFFFFF`
- **Background:** `#F7F8FF`
- **Primary Text:** `#24264A`
- **Secondary Text:** `#73758E`
- **Success Green:** `#278567`
- **Warning Amber:** `#C58A30`
- **Emergency Crimson:** `#C94C62`

---

## 🚀 Quick Start Guide

### 🌟 Run Frontend + Backend Combined (Single Command)
Run both the Express API and the React Vite development server concurrently with auto-reload from the root folder:
```bash
npm run dev
```
- **React App**: `http://localhost:3000`
- **Backend API & Swagger**: `http://localhost:5000`

---

### Alternative: Run Individually

#### 1. Start the Backend API (Port 5000)
```bash
npm run dev:backend
```

#### 2. Start the Frontend (Port 3000)
```bash
npm run dev:frontend
```

#### 3. Production Unified Mode (Single Port 5000)
Builds the optimized React bundle and serves both UI & API from a single server:
```bash
npm run serve
```
*Live at `http://localhost:5000`*

#### 4. Run Automated End-to-End Tests
```bash
npm test
```

---

## 🔑 AI & Outbound Email Delivery

### Gemini 3.8 Flash AI Assistant
Configured with active Gemini API key in `backend/.env`. The AI assistant has live access to patient records to provide accurate medical answers without hallucinated medications or contradictory advice.

### Direct Outbound Email Alerts
Configure your Gmail address and 16-character Google App Password in **Settings > Outbound Email Relay**. Reminder emails for Morning, Midday, Evening, and Bedtime medications will be delivered directly to your inbox with transparent audit logs in `database/carebridge.sqlite`.
