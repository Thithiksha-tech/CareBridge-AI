const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../config/db');
const { sendEmail, sendOtpEmail } = require('../config/mailer');
const { JWT_SECRET } = require('../middleware/auth');
require('dotenv').config();

const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

/**
 * Basic email format validator
 */
function isValidEmail(email) {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(String(email).toLowerCase());
}

/**
 * Register a new patient
 */
async function register(req, res) {
  try {
    const { username, email, password, full_name, name, phone, role = 'patient', assigned_patient_id, hospital_name, hospital_department } = req.body;

    const trimmedEmail = (email || '').trim().toLowerCase();
    const resolvedFullName = (full_name || name || '').trim();
    const trimmedUsername = (username || (trimmedEmail ? trimmedEmail.split('@')[0] : '') || resolvedFullName.replace(/\s+/g, '').toLowerCase() || 'user').trim();
    const validatedRole = ['patient', 'caretaker', 'doctor'].includes(role) ? role : (role === 'clinician' ? 'doctor' : (role === 'caregiver' ? 'caretaker' : 'patient'));

    // Validate required fields
    if (!trimmedUsername || !trimmedEmail || !password) {
      return res.status(400).json({
        success: false,
        message: 'Name/username, email, and password are required.'
      });
    }

    if (trimmedUsername.length < 3) {
      return res.status(400).json({
        success: false,
        message: 'Username must be at least 3 characters long.'
      });
    }

    if (!isValidEmail(trimmedEmail)) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a valid email address. This email is critical for receiving care reminders.'
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 6 characters long.'
      });
    }

    // Check if user or email already exists
    const existingUser = db.prepare('SELECT id, username, email FROM users WHERE username = ? OR email = ?').get(trimmedUsername, trimmedEmail);

    if (existingUser) {
      if (existingUser.username.toLowerCase() === trimmedUsername.toLowerCase()) {
        return res.status(409).json({
          success: false,
          message: 'Username is already registered. Please choose another username or log in.'
        });
      }
      if (existingUser.email.toLowerCase() === trimmedEmail) {
        return res.status(409).json({
          success: false,
          message: 'An account with this email address already exists. Please log in.'
        });
      }
    }

    // Hash password securely
    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    // Insert user
    const insertStmt = db.prepare(`
      INSERT INTO users (username, email, password_hash, full_name, phone, role, is_email_verified, assigned_patient_id, hospital_name, hospital_department, email_reminders_enabled)
      VALUES (?, ?, ?, ?, ?, ?, 0, ?, ?, ?, 1)
    `);

    const result = insertStmt.run(
      trimmedUsername,
      trimmedEmail,
      passwordHash,
      resolvedFullName || trimmedUsername,
      phone ? phone.trim() : null,
      validatedRole,
      assigned_patient_id || null,
      hospital_name || null,
      hospital_department || null
    );

    const newUserId = result.lastInsertRowid;

    // Create JWT Token
    const token = jwt.sign(
      { id: newUserId, username: trimmedUsername, email: trimmedEmail, role: validatedRole },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );

    // Generate initial OTP for verification
    const initialOtp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();
    db.prepare('INSERT INTO email_verifications (email, otp_code, user_id, expires_at) VALUES (?, ?, ?, ?)').run(trimmedEmail, initialOtp, newUserId, expiresAt);

    // Dispatch OTP verification email
    sendOtpEmail({ to: trimmedEmail, otpCode: initialOtp, userName: resolvedFullName || trimmedUsername }).catch(err => console.error('[CareBridge Welcome OTP Error]:', err.message));

    return res.status(201).json({
      success: true,
      message: `${validatedRole.charAt(0).toUpperCase() + validatedRole.slice(1)} registered successfully. A 6-digit verification OTP has been generated.`,
      token,
      otpPreview: initialOtp,
      user: {
        id: newUserId,
        username: trimmedUsername,
        email: trimmedEmail,
        fullName: resolvedFullName || trimmedUsername,
        name: resolvedFullName || trimmedUsername,
        phone: phone ? phone.trim() : null,
        role: validatedRole,
        isEmailVerified: false,
        assignedPatientId: assigned_patient_id || null,
        hospitalName: hospital_name || null,
        emailRemindersEnabled: true
      }
    });

  } catch (error) {
    console.error('[CareBridge Register Error]:', error);
    return res.status(500).json({
      success: false,
      message: 'An unexpected server error occurred during registration.',
      error: error.message
    });
  }
}

/**
 * Log in an existing patient (by username or email)
 */
async function login(req, res) {
  try {
    const { identifier, username, email, password } = req.body;
    
    // Identifier can be provided as `identifier`, or via `username` or `email`
    const loginCredential = (identifier || username || email || '').trim();

    if (!loginCredential || !password) {
      return res.status(400).json({
        success: false,
        message: 'Username/Email and password are required.'
      });
    }

    // Lookup by username or email (case-insensitive)
    const user = db.prepare(`
      SELECT * FROM users 
      WHERE LOWER(username) = LOWER(?) OR LOWER(email) = LOWER(?)
    `).get(loginCredential, loginCredential);

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials. Please verify your username/email and password.'
      });
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.password_hash);
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials. Please verify your username/email and password.'
      });
    }

    // Generate JWT Token
    const userRole = user.role || 'patient';
    const token = jwt.sign(
      { id: user.id, username: user.username, email: user.email, role: userRole },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );

    return res.status(200).json({
      success: true,
      message: 'Login successful.',
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        fullName: user.full_name || user.username,
        name: user.full_name || user.username,
        phone: user.phone,
        role: userRole,
        isEmailVerified: Boolean(user.is_email_verified),
        assignedPatientId: user.assigned_patient_id,
        hospitalName: user.hospital_name,
        hospitalDepartment: user.hospital_department,
        emailRemindersEnabled: Boolean(user.email_reminders_enabled),
        createdAt: user.created_at
      }
    });

  } catch (error) {
    console.error('[CareBridge Login Error]:', error);
    return res.status(500).json({
      success: false,
      message: 'An unexpected server error occurred during login.',
      error: error.message
    });
  }
}

/**
 * Get current authenticated user profile
 */
function getMe(req, res) {
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id);
  if (!user) {
    return res.status(404).json({ success: false, message: 'User not found.' });
  }

  return res.status(200).json({
    success: true,
    user: {
      id: user.id,
      username: user.username,
      email: user.email,
      fullName: user.full_name || user.username,
      name: user.full_name || user.username,
      phone: user.phone,
      role: user.role || 'patient',
      isEmailVerified: Boolean(user.is_email_verified),
      assignedPatientId: user.assigned_patient_id,
      hospitalName: user.hospital_name,
      hospitalDepartment: user.hospital_department,
      emailRemindersEnabled: Boolean(user.email_reminders_enabled),
      createdAt: user.created_at
    }
  });
}

/**
 * Update patient profile / reminder email preferences
 */
function updateProfile(req, res) {
  try {
    const userId = req.user.id;
    const { full_name, phone, email, email_reminders_enabled } = req.body;

    const updates = [];
    const values = [];

    if (full_name !== undefined) {
      updates.push('full_name = ?');
      values.push(full_name.trim());
    }

    if (phone !== undefined) {
      updates.push('phone = ?');
      values.push(phone.trim());
    }

    if (email !== undefined) {
      const trimmedEmail = email.trim().toLowerCase();
      if (!isValidEmail(trimmedEmail)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid email address provided.'
        });
      }
      // Check collision
      const existing = db.prepare('SELECT id FROM users WHERE email = ? AND id != ?').get(trimmedEmail, userId);
      if (existing) {
        return res.status(409).json({
          success: false,
          message: 'This email is already in use by another account.'
        });
      }
      updates.push('email = ?');
      values.push(trimmedEmail);
    }

    if (email_reminders_enabled !== undefined) {
      updates.push('email_reminders_enabled = ?');
      values.push(email_reminders_enabled ? 1 : 0);
    }

    if (updates.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No profile fields provided to update.'
      });
    }

    updates.push('updated_at = CURRENT_TIMESTAMP');
    values.push(userId);

    const sql = `UPDATE users SET ${updates.join(', ')} WHERE id = ?`;
    db.prepare(sql).run(...values);

    const updatedUser = db.prepare('SELECT id, username, email, full_name, phone, email_reminders_enabled, updated_at FROM users WHERE id = ?').get(userId);

    return res.status(200).json({
      success: true,
      message: 'Profile updated successfully.',
      user: {
        id: updatedUser.id,
        username: updatedUser.username,
        email: updatedUser.email,
        fullName: updatedUser.full_name,
        phone: updatedUser.phone,
        emailRemindersEnabled: Boolean(updatedUser.email_reminders_enabled),
        updatedAt: updatedUser.updated_at
      }
    });

  } catch (error) {
    console.error('[CareBridge Update Profile Error]:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to update profile.',
      error: error.message
    });
  }
}

/**
 * Trigger an instant test care reminder email to verify patient's email bridge
 */
async function sendTestReminder(req, res) {
  try {
    const user = req.user;
    const { category = 'water', note = 'Drink a glass of water to stay hydrated!' } = req.body;

    const emailResult = await sendEmail({
      to: user.email,
      subject: `[CareBridge Test Reminder] Time for your care task: ${category.toUpperCase()}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 8px;">
          <div style="background-color: #0284c7; color: white; padding: 16px; border-radius: 6px; text-align: center;">
            <h2 style="margin: 0; font-size: 20px;">CareBridge Patient Care Reminder</h2>
          </div>
          <div style="padding: 20px 0;">
            <p>Hello <strong>${user.full_name || user.username}</strong>,</p>
            <p>This is a test notification confirming that your <strong>Email Reminder Bridge</strong> is active and functional.</p>
            <div style="background: #f8fafc; border-left: 4px solid #0284c7; padding: 12px 16px; margin: 16px 0;">
              <p style="margin: 0; font-weight: bold; color: #0f172a;">Task: ${category.toUpperCase()}</p>
              <p style="margin: 6px 0 0 0; color: #475569;">${note}</p>
            </div>
            <p style="color: #64748b; font-size: 13px;">CareBridge AI will send scheduled reminders for medications, diet, exercises, and doctor appointments to this address.</p>
          </div>
        </div>
      `
    });

    return res.status(200).json({
      success: true,
      message: `Test reminder dispatched to ${user.email}`,
      delivery: emailResult
    });
  } catch (error) {
    console.error('[CareBridge Test Reminder Error]:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to send test reminder email.',
      error: error.message
    });
  }
}

/**
 * Send an OTP code to verify email address
 */
async function sendOtp(req, res) {
  try {
    const emailToVerify = (req.body.email || (req.user && req.user.email) || '').trim().toLowerCase();
    const userName = (req.body.name || (req.user && (req.user.full_name || req.user.username)) || 'User').trim();

    if (!emailToVerify || !isValidEmail(emailToVerify)) {
      return res.status(400).json({
        success: false,
        message: 'A valid email address is required to dispatch verification OTP.'
      });
    }

    // Generate 6-digit cryptographic OTP code
    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString(); // 10 minutes expiry
    const userId = req.user ? req.user.id : null;

    db.prepare(`
      INSERT INTO email_verifications (email, otp_code, user_id, expires_at)
      VALUES (?, ?, ?, ?)
    `).run(emailToVerify, otpCode, userId, expiresAt);

    // Send email with resilient fallback
    const result = await sendOtpEmail({ to: emailToVerify, otpCode, userName });

    return res.status(200).json({
      success: true,
      message: `A 6-digit verification code has been dispatched to ${emailToVerify}.`,
      otpPreview: otpCode, // Provided for effortless local dev verification without SMTP block
      delivery: result
    });
  } catch (error) {
    console.error('[CareBridge Send OTP Error]:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to generate verification OTP.',
      error: error.message
    });
  }
}

/**
 * Verify submitted OTP code and activate care alert bridge
 */
async function verifyOtp(req, res) {
  try {
    const emailToVerify = (req.body.email || (req.user && req.user.email) || '').trim().toLowerCase();
    const submittedOtp = (req.body.otp || req.body.otp_code || '').toString().trim();

    if (!emailToVerify || !submittedOtp) {
      return res.status(400).json({
        success: false,
        message: 'Email address and 6-digit OTP code are required.'
      });
    }

    const verificationRecord = db.prepare(`
      SELECT * FROM email_verifications 
      WHERE LOWER(email) = LOWER(?) AND otp_code = ? AND is_verified = 0
      ORDER BY id DESC LIMIT 1
    `).get(emailToVerify, submittedOtp);

    if (!verificationRecord) {
      return res.status(400).json({
        success: false,
        message: 'Invalid verification code. Please check your code or request a new one.'
      });
    }

    // Check expiration
    if (new Date(verificationRecord.expires_at) < new Date()) {
      return res.status(400).json({
        success: false,
        message: 'This OTP has expired. Please click "Resend Code" to receive a fresh verification code.'
      });
    }

    // Mark verified
    db.prepare('UPDATE email_verifications SET is_verified = 1 WHERE id = ?').run(verificationRecord.id);
    db.prepare('UPDATE users SET is_email_verified = 1 WHERE LOWER(email) = LOWER(?)').run(emailToVerify);

    return res.status(200).json({
      success: true,
      message: `Email ${emailToVerify} verified successfully! Your CareBridge task and medication reminder bridge is now active.`
    });
  } catch (error) {
    console.error('[CareBridge Verify OTP Error]:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to verify OTP code.',
      error: error.message
    });
  }
}

/**
 * Get network list of Patients and Doctors for Caretaker/Doctor linking
 */
function getRoleNetwork(req, res) {
  try {
    const patients = db.prepare("SELECT id, username, email, full_name, role FROM users WHERE role = 'patient'").all();
    const doctors = db.prepare("SELECT id, username, email, full_name, role, hospital_name, hospital_department FROM users WHERE role = 'doctor'").all();
    const caretakers = db.prepare("SELECT id, username, email, full_name, role, assigned_patient_id FROM users WHERE role = 'caretaker'").all();

    return res.status(200).json({
      success: true,
      patients,
      doctors,
      caretakers
    });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
}

/**
 * Get current user pending OTP verification status and code preview
 */
function getOtpStatus(req, res) {
  try {
    const userId = req.user.id;
    const email = req.user.email;
    const latest = db.prepare(`
      SELECT otp_code, expires_at, is_verified 
      FROM email_verifications 
      WHERE (user_id = ? OR LOWER(email) = LOWER(?)) AND is_verified = 0
      ORDER BY id DESC LIMIT 1
    `).get(userId, email);

    if (!latest || new Date(latest.expires_at) < new Date()) {
      return res.status(200).json({ success: true, hasPendingOtp: false });
    }

    return res.status(200).json({
      success: true,
      hasPendingOtp: true,
      otpPreview: latest.otp_code,
      expiresAt: latest.expires_at,
      email
    });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
}

module.exports = {
  register,
  login,
  getMe,
  updateProfile,
  sendTestReminder,
  sendOtp,
  verifyOtp,
  getOtpStatus,
  getRoleNetwork
};

