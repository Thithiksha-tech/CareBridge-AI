const db = require('../config/db');
const { sendEmail } = require('../config/mailer');

/**
 * List all reminders for current patient with live progress calculation
 */
function listReminders(req, res) {
  try {
    const userId = req.user.id;
    const reminders = db.prepare(`
      SELECT * FROM reminders WHERE user_id = ? ORDER BY is_completed ASC, created_at DESC
    `).all(userId);

    const total = reminders.length;
    const completed = reminders.filter(r => Boolean(r.is_completed)).length;
    const pending = total - completed;
    const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;

    return res.status(200).json({
      success: true,
      reminders,
      progress: {
        total,
        completed,
        pending,
        percentage
      }
    });
  } catch (error) {
    console.error('[CareBridge List Reminders Error]:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch reminders.',
      error: error.message
    });
  }
}

/**
 * Toggle task completion status (calculates live progress)
 */
function toggleReminderStatus(req, res) {
  try {
    const userId = req.user.id;
    const reminderId = req.params.id;

    const reminder = db.prepare('SELECT * FROM reminders WHERE id = ? AND user_id = ?').get(reminderId, userId);
    if (!reminder) {
      return res.status(404).json({ success: false, message: 'Task/Reminder not found.' });
    }

    const nextCompleted = reminder.is_completed ? 0 : 1;
    db.prepare(`
      UPDATE reminders 
      SET is_completed = ?, completed_at = CASE WHEN ? = 1 THEN CURRENT_TIMESTAMP ELSE NULL END
      WHERE id = ?
    `).run(nextCompleted, nextCompleted, reminderId);

    const updated = db.prepare('SELECT * FROM reminders WHERE id = ?').get(reminderId);

    // Compute updated progress
    const allReminders = db.prepare('SELECT is_completed FROM reminders WHERE user_id = ?').all(userId);
    const total = allReminders.length;
    const completed = allReminders.filter(r => Boolean(r.is_completed)).length;
    const pending = total - completed;
    const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;

    return res.status(200).json({
      success: true,
      message: `Task marked as ${nextCompleted ? 'completed' : 'pending'}.`,
      reminder: updated,
      progress: {
        total,
        completed,
        pending,
        percentage
      }
    });
  } catch (error) {
    console.error('[CareBridge Toggle Reminder Error]:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to toggle task status.',
      error: error.message
    });
  }
}

/**
 * Create a new custom reminder with explicit meal & exercise timings
 */
function createReminder(req, res) {
  try {
    const userId = req.user.id;
    const {
      title,
      description,
      category = 'custom',
      frequency = 'daily',
      time_of_day = '08:00 AM',
      meal_timing = 'With Morning Breakfast',
      scheduled_time = '08:00 AM'
    } = req.body;

    if (!title) {
      return res.status(400).json({
        success: false,
        message: 'Reminder title is required.'
      });
    }

    const stmt = db.prepare(`
      INSERT INTO reminders (user_id, title, description, category, frequency, time_of_day, meal_timing, scheduled_time, is_active)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1)
    `);

    const result = stmt.run(userId, title.trim(), description || '', category, frequency, time_of_day, meal_timing, scheduled_time);
    const newReminder = db.prepare('SELECT * FROM reminders WHERE id = ?').get(result.lastInsertRowid);

    return res.status(201).json({
      success: true,
      message: 'Reminder created successfully.',
      reminder: newReminder
    });
  } catch (error) {
    console.error('[CareBridge Create Reminder Error]:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to create reminder.',
      error: error.message
    });
  }
}

/**
 * Trigger an email reminder for a specific task with personalized timing instructions
 */
async function sendReminderEmail(req, res) {
  try {
    const userId = req.user.id;
    const reminderId = req.params.id;

    const reminder = db.prepare('SELECT * FROM reminders WHERE id = ? AND user_id = ?').get(reminderId, userId);
    if (!reminder) {
      return res.status(404).json({ success: false, message: 'Reminder not found.' });
    }

    const user = req.user;
    const isMed = reminder.category === 'medication';
    const isExercise = reminder.category === 'exercise';
    const isDiet = reminder.category === 'diet' || reminder.category === 'water';

    // Tailored subject and urgency based on user audio prompt
    let alertAction = `It's time for you to complete your care task: ${reminder.title}`;
    let subjectLine = `[CareBridge Care Alert] Time for: ${reminder.title}`;

    if (isMed) {
      alertAction = `It's time for you to eat this tablet: ${reminder.title}`;
      subjectLine = `💊 [CareBridge Alert] It's time for you to eat this tablet: ${reminder.title}`;
    } else if (isExercise) {
      alertAction = `It's time for you to do your exercise: ${reminder.title}`;
      subjectLine = `🏃 [CareBridge Alert] It's time for you to do your exercise: ${reminder.title}`;
    } else if (isDiet) {
      alertAction = `It's time for your nutrition & hydration: ${reminder.title}`;
      subjectLine = `🥗 [CareBridge Alert] It's time for your hydration / meal: ${reminder.title}`;
    }

    const timingDetails = reminder.meal_timing || (isMed ? 'Take with a glass of water after food' : isExercise ? 'Perform in a safe, quiet space with assistance if needed' : 'Follow daily post-hospital hydration guide');
    const scheduledTime = reminder.scheduled_time || reminder.time_of_day || 'As scheduled today';

    const emailResult = await sendEmail({
      to: user.email,
      subject: subjectLine,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 8px;">
          <div style="background-color: ${isMed ? '#0284c7' : isExercise ? '#7c3aed' : '#16a34a'}; color: white; padding: 16px; border-radius: 6px; text-align: center;">
            <h2 style="margin: 0; font-size: 20px;">CareBridge Patient Care Alert</h2>
          </div>
          <div style="padding: 20px 0;">
            <p>Dear <strong>${user.full_name || user.username}</strong>,</p>
            <p style="font-size: 16px; font-weight: bold; color: #0f172a;">🔔 ${alertAction}</p>
            
            <div style="background: #f8fafc; border-left: 4px solid #0284c7; padding: 14px 18px; margin: 16px 0; border-radius: 4px;">
              <h3 style="margin: 0 0 6px 0; color: #0369a1; font-size: 16px;">${reminder.title}</h3>
              <p style="margin: 0; color: #334155; font-size: 14px;">${reminder.description || 'Follow instructions provided by your clinical discharge care plan.'}</p>
              
              <div style="margin-top: 12px; padding-top: 10px; border-top: 1px solid #e2e8f0; font-size: 13px; color: #475569;">
                <p style="margin: 3px 0;">⏰ <strong>Scheduled Time:</strong> ${scheduledTime}</p>
                <p style="margin: 3px 0;">🍽️ <strong>Food & Timing Guidance:</strong> ${timingDetails}</p>
                <p style="margin: 3px 0;">🏷️ <strong>Category:</strong> ${reminder.category.toUpperCase()} (${reminder.frequency})</p>
              </div>
            </div>

            <p style="color: #64748b; font-size: 13px;">Delivered to your registered care bridge email: <strong>${user.email}</strong></p>
          </div>
        </div>
      `
    });

    // Update last_sent_at
    db.prepare('UPDATE reminders SET last_sent_at = CURRENT_TIMESTAMP WHERE id = ?').run(reminderId);

    // Log email
    db.prepare(`
      INSERT INTO reminder_logs (reminder_id, user_id, recipient_email, subject, status)
      VALUES (?, ?, ?, ?, ?)
    `).run(reminderId, userId, user.email, subjectLine, emailResult.success ? 'sent' : 'failed');

    return res.status(200).json({
      success: true,
      message: `Reminder sent to ${user.email} with scheduled timing details.`,
      delivery: emailResult
    });

  } catch (error) {
    console.error('[CareBridge Send Reminder Error]:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to send reminder email.',
      error: error.message
    });
  }
}

/**
 * Toggle active status or update reminder
 */
function updateReminder(req, res) {
  try {
    const userId = req.user.id;
    const reminderId = req.params.id;
    const { is_active, title, description, time_of_day } = req.body;

    const existing = db.prepare('SELECT id FROM reminders WHERE id = ? AND user_id = ?').get(reminderId, userId);
    if (!existing) {
      return res.status(404).json({ success: false, message: 'Reminder not found.' });
    }

    const updates = [];
    const values = [];

    if (is_active !== undefined) {
      updates.push('is_active = ?');
      values.push(is_active ? 1 : 0);
    }
    if (title !== undefined) {
      updates.push('title = ?');
      values.push(title.trim());
    }
    if (description !== undefined) {
      updates.push('description = ?');
      values.push(description.trim());
    }
    if (time_of_day !== undefined) {
      updates.push('time_of_day = ?');
      values.push(time_of_day.trim());
    }

    if (updates.length > 0) {
      values.push(reminderId);
      db.prepare(`UPDATE reminders SET ${updates.join(', ')} WHERE id = ?`).run(...values);
    }

    const updated = db.prepare('SELECT * FROM reminders WHERE id = ?').get(reminderId);
    return res.status(200).json({ success: true, reminder: updated });

  } catch (error) {
    console.error('[CareBridge Update Reminder Error]:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to update reminder.',
      error: error.message
    });
  }
}

/**
 * Delete reminder
 */
function deleteReminder(req, res) {
  try {
    const userId = req.user.id;
    const reminderId = req.params.id;

    const result = db.prepare('DELETE FROM reminders WHERE id = ? AND user_id = ?').run(reminderId, userId);
    if (result.changes === 0) {
      return res.status(404).json({ success: false, message: 'Reminder not found.' });
    }

    return res.status(200).json({ success: true, message: 'Reminder deleted.' });
  } catch (error) {
    console.error('[CareBridge Delete Reminder Error]:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to delete reminder.',
      error: error.message
    });
  }
}

/**
 * Get grouped reminders by time slot with statistics
 */
function getGroupedReminders(req, res) {
  try {
    let targetUserId = req.user.id;
    // If caretaker viewing their assigned patient
    if (req.user.role === 'caretaker' && req.user.assigned_patient_id) {
      targetUserId = req.user.assigned_patient_id;
    } else if (req.query.patient_id) {
      targetUserId = parseInt(req.query.patient_id);
    }

    const reminders = db.prepare(`
      SELECT * FROM reminders WHERE user_id = ? ORDER BY is_completed ASC, created_at ASC
    `).all(targetUserId);

    const grouped = {
      Morning: [],
      Midday: [],
      Evening: [],
      Bedtime: []
    };

    reminders.forEach((r) => {
      const slot = r.time_of_day || 'Morning';
      const normalizedSlot = grouped[slot] ? slot : 'Morning';
      grouped[normalizedSlot].push({
        id: r.id,
        user_id: r.user_id,
        title: r.title,
        reminder_type: r.category || 'medication',
        time_slot: normalizedSlot,
        frequency: r.frequency || 'daily',
        status: r.is_completed ? 'completed' : 'pending',
        food_timing: r.meal_timing || 'Take with water after food',
        instructions: r.description,
        created_at: r.created_at
      });
    });

    const total = reminders.length;
    const completed = reminders.filter(r => Boolean(r.is_completed)).length;
    const pending = total - completed;

    return res.status(200).json({
      success: true,
      grouped,
      stats: { total, completed, pending }
    });
  } catch (error) {
    console.error('[CareBridge Grouped Reminders Error]:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
}

/**
 * Send full daily care plan or specific reminder email alert
 */
async function sendEmailAlert(req, res) {
  try {
    const { reminderId, recipientEmail } = req.body;
    let targetUserId = req.user.id;
    if (req.user.role === 'caretaker' && req.user.assigned_patient_id) {
      targetUserId = req.user.assigned_patient_id;
    }

    const patient = db.prepare('SELECT * FROM users WHERE id = ?').get(targetUserId);
    const targetEmail = (recipientEmail || (patient ? patient.email : req.user.email) || '').trim();

    if (!targetEmail) {
      return res.status(400).json({ success: false, message: 'Recipient email is required.' });
    }

    // Check if single reminder or full day care schedule
    let emailSubject = `📋 [CareBridge Recovery Alert] Today's Personalized Recovery Timetable for ${patient ? patient.full_name : 'Patient'}`;
    let taskHtmlList = '';

    if (reminderId) {
      const item = db.prepare('SELECT * FROM reminders WHERE id = ?').get(reminderId);
      if (item) {
        emailSubject = `💊 [CareBridge Care Alert] Time for: ${item.title}`;
        taskHtmlList = `
          <div style="background: #F7F8FF; border-left: 4px solid #665BE8; padding: 16px; border-radius: 8px; margin: 16px 0;">
            <h3 style="margin: 0 0 6px 0; color: #24264A; font-size: 16px;">${item.title}</h3>
            <p style="margin: 0; color: #475569; font-size: 14px;">${item.description || 'Follow instructions provided by clinical care plan.'}</p>
            <p style="margin: 8px 0 0 0; color: #665BE8; font-weight: bold; font-size: 13px;">⏰ Timing: ${item.time_of_day || 'Scheduled today'} • ${item.meal_timing || 'Take with water'}</p>
          </div>
        `;
      }
    } else {
      const allReminders = db.prepare('SELECT * FROM reminders WHERE user_id = ? ORDER BY id ASC').all(targetUserId);
      taskHtmlList = allReminders.map(r => `
        <div style="background: #F7F8FF; border-left: 4px solid ${r.is_completed ? '#278567' : '#665BE8'}; padding: 12px 16px; border-radius: 8px; margin-bottom: 10px;">
          <div style="display: flex; justify-content: space-between; align-items: center;">
            <strong style="color: #24264A; font-size: 14px;">${r.title}</strong>
            <span style="font-size: 11px; padding: 2px 8px; border-radius: 12px; background: ${r.is_completed ? '#E6F4EA' : '#F0EEFF'}; color: ${r.is_completed ? '#278567' : '#665BE8'}; font-weight: bold;">
              ${r.is_completed ? 'Completed' : 'Pending Intake'}
            </span>
          </div>
          <p style="margin: 4px 0 0 0; color: #64748B; font-size: 12px;">${r.description || ''}</p>
          <p style="margin: 4px 0 0 0; color: #373B8F; font-size: 11px;">⏰ Slot: <strong>${r.time_of_day || 'General'}</strong> | Guidance: ${r.meal_timing || 'Follow discharge precautions'}</p>
        </div>
      `).join('');
    }

    const emailResult = await sendEmail({
      to: targetEmail,
      subject: emailSubject,
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #E2E8F0; border-radius: 16px; background-color: #FFFFFF;">
          <div style="background: linear-gradient(135deg, #665BE8 0%, #373B8F 100%); padding: 20px; border-radius: 12px; text-align: center; color: #FFFFFF;">
            <h2 style="margin: 0; font-size: 20px; font-weight: 800;">CareBridge AI Care Regimen</h2>
            <p style="margin: 4px 0 0 0; font-size: 12px; opacity: 0.9;">Post-Hospital Recovery Alert Dispatched</p>
          </div>
          <div style="padding: 20px 0;">
            <p style="color: #24264A; font-size: 15px;">Hello <strong>${patient ? patient.full_name : 'Patient / Caregiver'}</strong>,</p>
            <p style="color: #64748B; font-size: 13px; line-height: 1.5;">
              Here is your verified daily care timetable. Please confirm each tablet and recovery activity as instructed:
            </p>
            ${taskHtmlList}
          </div>
          <div style="border-top: 1px solid #ECEAFC; padding-top: 14px; text-align: center; font-size: 11px; color: #94A3B8;">
            Sent by CareBridge AI Post-Discharge System • Direct Care Bridge Active
          </div>
        </div>
      `
    });

    // Log to reminder_logs
    db.prepare(`
      INSERT INTO reminder_logs (reminder_id, user_id, recipient_email, subject, status)
      VALUES (?, ?, ?, ?, ?)
    `).run(reminderId || null, targetUserId, targetEmail, emailSubject, emailResult.success ? 'sent' : 'simulated');

    return res.status(200).json({
      success: true,
      message: `Outbound recovery timetable sent to ${targetEmail}`,
      delivery: emailResult
    });
  } catch (error) {
    console.error('[CareBridge Send Email Alert Error]:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
}

/**
 * Instant test email endpoint
 */
async function testEmail(req, res) {
  try {
    const email = (req.body.email || req.user.email).trim();
    const result = await sendEmail({
      to: email,
      subject: '✅ [CareBridge AI] Test Care Reminder Bridge Verified',
      html: `
        <div style="font-family: Arial, sans-serif; padding: 20px; max-width: 500px; border: 1px solid #ECEAFC; border-radius: 12px;">
          <h2 style="color: #665BE8; margin-top: 0;">CareBridge AI — Verification Notice</h2>
          <p>Your email address <strong>${email}</strong> is confirmed and ready to receive scheduled recovery alerts.</p>
        </div>
      `
    });

    return res.status(200).json({
      success: true,
      message: `Test care reminder dispatched to ${email}!`,
      delivery: result
    });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
}

/**
 * Update reminder status (pending, completed, skipped)
 */
function updateReminderStatus(req, res) {
  try {
    const reminderId = req.params.id;
    const { status } = req.body;
    const isCompleted = status === 'completed' ? 1 : 0;

    db.prepare(`
      UPDATE reminders
      SET is_completed = ?, completed_at = CASE WHEN ? = 1 THEN CURRENT_TIMESTAMP ELSE NULL END
      WHERE id = ?
    `).run(isCompleted, isCompleted, reminderId);

    const updated = db.prepare('SELECT * FROM reminders WHERE id = ?').get(reminderId);
    return res.status(200).json({ success: true, reminder: updated });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
}

module.exports = {
  listReminders,
  getGroupedReminders,
  createReminder,
  sendReminderEmail,
  sendEmailAlert,
  testEmail,
  updateReminder,
  updateReminderStatus,
  deleteReminder,
  toggleReminderStatus
};
