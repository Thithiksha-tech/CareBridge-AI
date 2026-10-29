# CareBridge AI — Backend System

The backend foundation for **CareBridge AI**, powering secure patient authentication, care reminder delivery bridges, discharge data ingestion, and timeline tracking.

---

## 🚀 Key Features Implemented

1. **Patient Authentication & Security**
   - **Patient Username & Password**: Password securely hashed using `bcryptjs` (salt rounds: 10).
   - **Email as Core Care Bridge**: Verified patient email used as the destination for automated care reminders (medication, hydration, exercise, and doctor appointments).
   - **JWT Session Tokens**: Secure stateless Bearer authentication with configurable expiration.

2. **Database & Persistence (SQLite)**
   - Schema configured in `better-sqlite3` with foreign key enforcement and WAL mode:
     - `users`: Patient accounts, credentials, contact info, reminder preferences.
     - `discharge_records`: Storage for uploaded discharge summaries and AI extraction results.
     - `reminders`: Scheduled care tasks (category, frequency, target time).
     - `reminder_logs`: Audit logs for every reminder dispatched to the patient's email.

3. **Email Reminder Dispatcher**
   - Configured via Nodemailer.
   - Automatically supports real SMTP providers or zero-setup development test mailers (Ethereal).

---

## 📡 API Endpoints

### 1. Authentication & Patient Account
- `POST /api/auth/register` — Register patient & caregiver, initialize email reminder bridge.
- `POST /api/auth/login` — Login with username OR email + password.
- `GET /api/auth/me` — Get current logged-in profile.
- `PUT /api/auth/profile` — Update patient profile / email reminder settings.
- `POST /api/auth/test-email` — Send test care alert to patient email.

### 2. Discharge Document Upload & AI Analysis
- `POST /api/discharge/upload` — Upload PDF/text file (`multipart/form-data` with `file`), extract text, run AI analysis and simplification.
- `POST /api/discharge/analyze-text` — Submit raw discharge text directly (`{ "text": "...", "title": "..." }`).
- `GET /api/discharge` — List all patient discharge records and review progress.
- `GET /api/discharge/:id` — Retrieve full analysis with **Original Clinical Text** paired with **Simplified Patient Text**, plus live review statuses for every single instruction.

### 3. Patient / Attender Instruction Review System
- `PUT /api/discharge/:id/review` — Review a specific instruction:
  ```json
  {
    "instruction_id": "med-1",
    "status": "confirmed", // "pending_review" | "confirmed" | "edited" | "rejected"
    "edited_text": "Optional adjusted wording",
    "user_notes": "Take with breakfast as advised"
  }
  ```
- `PUT /api/discharge/:id/review-bulk` — Bulk confirm or update instructions (`{ "action": "confirm_all" }`).
- `POST /api/discharge/:id/sync-reminders` — Automatically converts all confirmed/approved care tasks into active reminders.

### 4. Self-Tracking & Reminder System
- `GET /api/reminders` — List active reminders.
- `POST /api/reminders` — Create custom reminder (water, medication, exercise, appointment).
- `POST /api/reminders/:id/send` — Immediately dispatch care reminder email to the patient's registered email bridge.
- `PATCH /api/reminders/:id` — Toggle active status or update schedule.
- `DELETE /api/reminders/:id` — Remove reminder.

---

## 🛠 Running the Backend

```bash
# Start server in dev watch mode
npm run dev

# Start server
npm start

# Run automated auth & email bridge verification tests
npm run test:auth
```
