const db = require('../config/db');
const { getEmailStatus, sendEmail } = require('../config/mailer');
const { getApiKey } = require('../../../ai/geminiClient');

function getSettingsStatus(req, res) {
  try {
    const emailStatus = getEmailStatus();
    const currentApiKey = getApiKey();
    const hasApiKey = Boolean(currentApiKey && currentApiKey.length > 10);

    return res.status(200).json({
      success: true,
      email: emailStatus,
      ai: {
        isConfigured: hasApiKey,
        provider: 'Google Gemini 3.8 Flash',
        model: process.env.GEMINI_MODEL || 'gemini-3.8-flash',
        maskedKey: hasApiKey ? currentApiKey.substring(0, 6) + '...' + currentApiKey.substring(currentApiKey.length - 4) : null
      }
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
}

function updateEmailSettings(req, res) {
  try {
    const smtp_user = (req.body.smtp_user || req.body.smtpUser || '').trim();
    const smtp_pass = (req.body.smtp_pass || req.body.smtpPass || '').trim();
    const smtp_service = (req.body.smtp_service || req.body.smtpService || (smtp_user.includes('@gmail.com') ? 'gmail' : 'smtp')).trim();
    const smtp_host = (req.body.smtp_host || req.body.smtpHost || (smtp_user.includes('@gmail.com') ? 'smtp.gmail.com' : 'smtp.gmail.com')).trim();
    const smtp_port = req.body.smtp_port || req.body.smtpPort || 587;
    const from_email = (req.body.from_email || req.body.fromEmail || `CareBridge AI <${smtp_user || 'reminders@carebridge.ai'}>`).trim();

    const upsert = db.prepare(`
      INSERT INTO system_settings (key, value, updated_at)
      VALUES (?, ?, CURRENT_TIMESTAMP)
      ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = CURRENT_TIMESTAMP
    `);

    if (smtp_user) upsert.run('smtp_user', smtp_user);
    if (smtp_pass && !smtp_pass.includes('••••')) upsert.run('smtp_pass', smtp_pass);
    if (smtp_service) upsert.run('smtp_service', smtp_service);
    if (smtp_host) upsert.run('smtp_host', smtp_host);
    if (smtp_port) upsert.run('smtp_port', String(smtp_port));
    if (from_email) upsert.run('from_email', from_email);

    return res.status(200).json({
      success: true,
      message: 'Email configuration saved. Live inbox delivery is now active!',
      status: getEmailStatus()
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
}

function updateAiSettings(req, res) {
  try {
    const { gemini_api_key } = req.body;
    if (!gemini_api_key) {
      return res.status(400).json({ success: false, message: 'gemini_api_key is required.' });
    }

    const upsert = db.prepare(`
      INSERT INTO system_settings (key, value, updated_at)
      VALUES (?, ?, CURRENT_TIMESTAMP)
      ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = CURRENT_TIMESTAMP
    `);

    upsert.run('gemini_api_key', gemini_api_key.trim());
    process.env.GEMINI_API_KEY = gemini_api_key.trim();

    return res.status(200).json({
      success: true,
      message: 'Gemini API key updated successfully.'
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
}

function getEmailSettings(req, res) {
  try {
    const emailStatus = getEmailStatus();
    let dbConfig = {};
    try {
      const rows = db.prepare("SELECT key, value FROM system_settings WHERE key LIKE 'smtp_%'").all();
      rows.forEach(r => { dbConfig[r.key] = r.value; });
    } catch (e) {}

    return res.status(200).json({
      smtpHost: dbConfig['smtp_host'] || process.env.EMAIL_HOST || 'smtp.ethereal.email',
      smtpPort: Number(dbConfig['smtp_port'] || process.env.EMAIL_PORT || 587),
      smtpUser: dbConfig['smtp_user'] || process.env.EMAIL_USER || '',
      smtpPass: dbConfig['smtp_pass'] ? '••••••••' : (process.env.EMAIL_PASS ? '••••••••' : ''),
      fromEmail: process.env.EMAIL_FROM || 'CareBridge AI <reminders@carebridge.ai>',
      isConfigured: emailStatus.isConfigured,
      provider: emailStatus.provider
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
}

async function testSmtp(req, res) {
  try {
    const targetEmail = (req.body.testEmail || req.user.email).trim();
    const result = await sendEmail({
      to: targetEmail,
      subject: '✅ [CareBridge AI] Test Care Reminder Bridge Verified',
      html: `
        <div style="font-family: Arial, sans-serif; padding: 20px; max-width: 500px; border: 1px solid #ECEAFC; border-radius: 12px;">
          <h2 style="color: #665BE8; margin-top: 0;">CareBridge AI — Verification Notice</h2>
          <p>Your email address <strong>${targetEmail}</strong> is confirmed and ready to receive scheduled recovery alerts.</p>
        </div>
      `
    });

    return res.status(200).json({
      success: true,
      message: `Test email successfully dispatched to ${targetEmail}!`,
      delivery: result
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
}

function getAiSettings(req, res) {
  try {
    const currentApiKey = getApiKey();
    const hasApiKey = Boolean(currentApiKey && currentApiKey.length > 10);
    return res.status(200).json({
      model: process.env.GEMINI_MODEL || 'gemini-3.8-flash',
      configured: hasApiKey
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
}

function getEmailLogs(req, res) {
  try {
    const userId = req.user.id;
    const logs = db.prepare(`
      SELECT id, recipient_email, subject, status, sent_at
      FROM reminder_logs
      WHERE user_id = ?
      ORDER BY sent_at DESC
      LIMIT 50
    `).all(userId);

    return res.status(200).json({
      success: true,
      logs
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
}

module.exports = {
  getSettingsStatus,
  getEmailSettings,
  updateEmailSettings,
  testSmtp,
  getAiSettings,
  updateAiSettings,
  getEmailLogs
};
