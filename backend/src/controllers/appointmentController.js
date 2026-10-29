const db = require('../config/db');
const { sendEmail } = require('../config/mailer');

/**
 * List all patient appointments (both upcoming and past visits with doctor feedback)
 */
function getAppointments(req, res) {
  try {
    const userId = req.user.id;

    // Check if patient has discharge records with appointments that haven't been seeded into patient_appointments
    const existingCount = db.prepare('SELECT COUNT(*) as count FROM patient_appointments WHERE user_id = ?').get(userId).count;

    if (existingCount === 0) {
      // Auto-seed initial appointments from latest discharge record or seed defaults so user immediately sees rich data
      const latestDischarge = db.prepare('SELECT id, structured_data FROM discharge_records WHERE user_id = ? ORDER BY created_at DESC LIMIT 1').get(userId);
      if (latestDischarge && latestDischarge.structured_data) {
        try {
          const parsed = JSON.parse(latestDischarge.structured_data);
          const appts = parsed.appointments || [];
          const insertStmt = db.prepare(`
            INSERT INTO patient_appointments (
              user_id, discharge_id, doctor_name, specialty, clinic_hospital,
              appointment_date, appointment_type, purpose, doctor_feedback,
              patient_improvements, vitals_recorded, status
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `);

          // Insert a past hospital discharge consultation visit
          insertStmt.run(
            userId,
            latestDischarge.id,
            'Dr. Sarah Vance, MD',
            'Cardiothoracic Surgery',
            'St. Jude Medical Center - Suite 402',
            '2026-10-24 11:00 AM',
            'past',
            'Inpatient Hospital Discharge Evaluation & Stent Clearance',
            'Successful recovery after drug-eluting stent placement. Patient is stable. Instructed to maintain antiplatelet dual therapy without missing a dose. Begin light ambulation.',
            'Chest pain resolved, vitals stabilized, incision site clean with no hematoma.',
            'BP: 118/76 mmHg, HR: 68 bpm, SpO2: 98%',
            'completed'
          );

          // Insert upcoming appointments
          appts.forEach((a, idx) => {
            const dateStr = idx === 0 ? '2026-11-05 10:30 AM' : '2026-11-20 02:00 PM';
            insertStmt.run(
              userId,
              latestDischarge.id,
              a.provider || 'Cardiology Follow-up Clinic',
              a.specialty || 'Cardiology',
              'Regional Heart & Vascular Health Pavilion',
              dateStr,
              'upcoming',
              a.preparation || 'Post-discharge vital checks, ECG review, and medication titration.',
              null,
              null,
              null,
              'scheduled'
            );
          });
        } catch (e) {
          console.warn('[CareBridge Appointments] Auto-seed failed:', e.message);
        }
      }
    }

    // Fetch upcoming visits
    const upcoming = db.prepare(`
      SELECT * FROM patient_appointments 
      WHERE user_id = ? AND (appointment_type = 'upcoming' OR status = 'scheduled')
      ORDER BY appointment_date ASC
    `).all(userId);

    // Fetch past visits with doctor feedback
    const past = db.prepare(`
      SELECT * FROM patient_appointments 
      WHERE user_id = ? AND (appointment_type = 'past' OR status = 'completed')
      ORDER BY appointment_date DESC
    `).all(userId);

    // Highlight the latest past consultation with clinical feedback
    const lastAppointmentSummary = past.length > 0 ? past[0] : null;

    return res.status(200).json({
      success: true,
      upcoming,
      past,
      lastAppointmentSummary,
      total_upcoming: upcoming.length,
      total_past: past.length
    });

  } catch (error) {
    console.error('[CareBridge Get Appointments Error]:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve appointments.',
      error: error.message
    });
  }
}

/**
 * Schedule a new appointment or log past visit with doctor feedback
 */
function createAppointment(req, res) {
  try {
    const userId = req.user.id;
    const {
      doctor_name,
      specialty = 'Specialist Consultation',
      clinic_hospital = 'Medical Center Outpatient Clinic',
      appointment_date,
      appointment_type = 'upcoming',
      purpose,
      doctor_feedback,
      patient_improvements,
      vitals_recorded,
      status = 'scheduled'
    } = req.body;

    if (!doctor_name || !appointment_date) {
      return res.status(400).json({
        success: false,
        message: 'Doctor name and appointment date are required.'
      });
    }

    const insertStmt = db.prepare(`
      INSERT INTO patient_appointments (
        user_id, doctor_name, specialty, clinic_hospital,
        appointment_date, appointment_type, purpose,
        doctor_feedback, patient_improvements, vitals_recorded, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const result = insertStmt.run(
      userId,
      doctor_name.trim(),
      specialty.trim(),
      clinic_hospital.trim(),
      appointment_date.trim(),
      appointment_type,
      purpose || 'Routine Post-Discharge Follow-up',
      doctor_feedback || null,
      patient_improvements || null,
      vitals_recorded || null,
      status
    );

    const created = db.prepare('SELECT * FROM patient_appointments WHERE id = ?').get(result.lastInsertRowid);

    return res.status(201).json({
      success: true,
      message: appointment_type === 'past' ? 'Past doctor visit & feedback logged.' : 'Upcoming appointment scheduled.',
      appointment: created
    });

  } catch (error) {
    console.error('[CareBridge Create Appointment Error]:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to create appointment.',
      error: error.message
    });
  }
}

/**
 * Update an appointment, log doctor feedback, and record patient improvements
 */
function updateAppointment(req, res) {
  try {
    const userId = req.user.id;
    const apptId = req.params.id;

    const existing = db.prepare('SELECT * FROM patient_appointments WHERE id = ? AND user_id = ?').get(apptId, userId);
    if (!existing) {
      return res.status(404).json({ success: false, message: 'Appointment not found.' });
    }

    const {
      doctor_name,
      specialty,
      clinic_hospital,
      appointment_date,
      appointment_type,
      purpose,
      doctor_feedback,
      patient_improvements,
      vitals_recorded,
      prescriptions_adjusted,
      status
    } = req.body;

    const updates = [];
    const values = [];

    if (doctor_name !== undefined) { updates.push('doctor_name = ?'); values.push(doctor_name.trim()); }
    if (specialty !== undefined) { updates.push('specialty = ?'); values.push(specialty.trim()); }
    if (clinic_hospital !== undefined) { updates.push('clinic_hospital = ?'); values.push(clinic_hospital.trim()); }
    if (appointment_date !== undefined) { updates.push('appointment_date = ?'); values.push(appointment_date.trim()); }
    if (appointment_type !== undefined) { updates.push('appointment_type = ?'); values.push(appointment_type); }
    if (purpose !== undefined) { updates.push('purpose = ?'); values.push(purpose.trim()); }
    if (doctor_feedback !== undefined) { updates.push('doctor_feedback = ?'); values.push(doctor_feedback.trim()); }
    if (patient_improvements !== undefined) { updates.push('patient_improvements = ?'); values.push(patient_improvements.trim()); }
    if (vitals_recorded !== undefined) { updates.push('vitals_recorded = ?'); values.push(vitals_recorded.trim()); }
    if (prescriptions_adjusted !== undefined) { updates.push('prescriptions_adjusted = ?'); values.push(prescriptions_adjusted.trim()); }
    if (status !== undefined) { updates.push('status = ?'); values.push(status); }

    if (updates.length > 0) {
      values.push(apptId);
      db.prepare(`UPDATE patient_appointments SET ${updates.join(', ')} WHERE id = ?`).run(...values);
    }

    const updated = db.prepare('SELECT * FROM patient_appointments WHERE id = ?').get(apptId);
    return res.status(200).json({
      success: true,
      message: 'Appointment and doctor feedback updated successfully.',
      appointment: updated
    });

  } catch (error) {
    console.error('[CareBridge Update Appointment Error]:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to update appointment.',
      error: error.message
    });
  }
}

/**
 * Delete an appointment
 */
function deleteAppointment(req, res) {
  try {
    const userId = req.user.id;
    const apptId = req.params.id;

    const result = db.prepare('DELETE FROM patient_appointments WHERE id = ? AND user_id = ?').run(apptId, userId);
    if (result.changes === 0) {
      return res.status(404).json({ success: false, message: 'Appointment not found.' });
    }

    return res.status(200).json({ success: true, message: 'Appointment deleted successfully.' });
  } catch (error) {
    console.error('[CareBridge Delete Appointment Error]:', error);
    return res.status(500).json({ success: false, message: 'Failed to delete appointment.', error: error.message });
  }
}

/**
 * Dispatch an appointment reminder email to the patient
 */
async function sendAppointmentEmail(req, res) {
  try {
    const userId = req.user.id;
    const apptId = req.params.id;
    const user = req.user;

    const appt = db.prepare('SELECT * FROM patient_appointments WHERE id = ? AND user_id = ?').get(apptId, userId);
    if (!appt) {
      return res.status(404).json({ success: false, message: 'Appointment not found.' });
    }

    const emailResult = await sendEmail({
      to: user.email,
      subject: `[CareBridge Appointment Alert] Upcoming visit with ${appt.doctor_name}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 8px;">
          <div style="background-color: #0284c7; color: white; padding: 16px; border-radius: 6px; text-align: center;">
            <h2 style="margin: 0; font-size: 20px;">Doctor Appointment Reminder</h2>
          </div>
          <div style="padding: 20px 0;">
            <p>Dear <strong>${user.full_name || user.username}</strong>,</p>
            <p>This is your scheduled notification to confirm your healthiness and ongoing recovery progress:</p>
            
            <div style="background: #f0fdf4; border-left: 4px solid #16a34a; padding: 14px 18px; margin: 16px 0; border-radius: 4px;">
              <h3 style="margin: 0 0 6px 0; color: #166534; font-size: 16px;">👨‍⚕️ ${appt.doctor_name}</h3>
              <p style="margin: 0; color: #0f172a; font-size: 14px;"><strong>Specialty:</strong> ${appt.specialty}</p>
              <p style="margin: 4px 0; color: #0f172a; font-size: 14px;"><strong>Date & Time:</strong> 📅 ${appt.appointment_date}</p>
              <p style="margin: 4px 0; color: #0f172a; font-size: 14px;"><strong>Location:</strong> 🏥 ${appt.clinic_hospital}</p>
            </div>

            <div style="background: #f8fafc; border: 1px solid #e2e8f0; padding: 12px 16px; border-radius: 6px; margin-top: 12px;">
              <h4 style="margin: 0 0 6px 0; color: #334155;">Preparation Checklist for your visit:</h4>
              <ul style="margin: 0; padding-left: 20px; color: #475569; font-size: 13px;">
                <li>Bring all current prescription medicine bottles.</li>
                <li>Bring your daily blood pressure and symptom logs.</li>
                <li>Note down any questions or dizziness/fatigue experienced.</li>
              </ul>
            </div>

            <p style="color: #64748b; font-size: 13px; margin-top: 20px;">Delivered via CareBridge AI to your registered email: ${user.email}</p>
          </div>
        </div>
      `
    });

    return res.status(200).json({
      success: true,
      message: `Appointment reminder dispatched to ${user.email}`,
      delivery: emailResult
    });

  } catch (error) {
    console.error('[CareBridge Send Appt Email Error]:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to send appointment reminder email.',
      error: error.message
    });
  }
}

/**
 * Caretaker or Patient requests a new appointment with Doctor/Hospital
 */
async function requestAppointment(req, res) {
  try {
    const requester = req.user;
    const {
      patient_id,
      doctor_id,
      doctor_name = 'Dr. Sarah Jenkins, MD',
      specialty = 'Cardiology',
      clinic_hospital = 'St. Jude Memorial Hospital',
      hospital_details = 'Outpatient Department, Reception Desk #3',
      appointment_date,
      appointment_time = '10:00 AM',
      purpose = 'Post-discharge vital checks and medication re-evaluation'
    } = req.body;

    let targetPatientId = patient_id;
    if (!targetPatientId) {
      if (requester.role === 'caretaker' && requester.assigned_patient_id) {
        targetPatientId = requester.assigned_patient_id;
      } else {
        targetPatientId = requester.id;
      }
    }

    const patient = db.prepare('SELECT * FROM users WHERE id = ?').get(targetPatientId);
    if (!patient) {
      return res.status(404).json({ success: false, message: 'Patient record not found.' });
    }

    const insert = db.prepare(`
      INSERT INTO patient_appointments (
        user_id, doctor_name, doctor_id, specialty, clinic_hospital, hospital_details,
        appointment_date, appointment_time, appointment_type, purpose,
        requested_by_role, requested_by_name, requested_by_email, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'upcoming', ?, ?, ?, ?, 'requested')
    `);

    const result = insert.run(
      targetPatientId,
      doctor_name.trim(),
      doctor_id || null,
      specialty.trim(),
      clinic_hospital.trim(),
      hospital_details.trim(),
      appointment_date || new Date().toISOString().split('T')[0],
      appointment_time,
      purpose,
      requester.role || 'caretaker',
      requester.full_name || requester.username,
      requester.email
    );

    const created = db.prepare('SELECT * FROM patient_appointments WHERE id = ?').get(result.lastInsertRowid);

    // Notify Doctor via email
    const doctorUser = doctor_id ? db.prepare('SELECT * FROM users WHERE id = ?').get(doctor_id) : db.prepare("SELECT * FROM users WHERE role = 'doctor' LIMIT 1").get();
    if (doctorUser && doctorUser.email) {
      await sendEmail({
        to: doctorUser.email,
        subject: `📅 [CareBridge Appointment Request] New Consultation Requested for ${patient.full_name}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 8px;">
            <div style="background: #373B8F; color: white; padding: 16px; border-radius: 6px; text-align: center;">
              <h2 style="margin: 0;">CareBridge Clinical Appointment Request</h2>
            </div>
            <div style="padding: 20px 0;">
              <p>Dear <strong>${doctorUser.full_name || 'Doctor'}</strong>,</p>
              <p>An appointment request has been submitted by <strong>${requester.full_name} (${requester.role})</strong> for patient <strong>${patient.full_name}</strong>.</p>
              <div style="background: #f8fafc; border-left: 4px solid #665BE8; padding: 14px; margin: 16px 0;">
                <p style="margin: 4px 0;">🏥 <strong>Hospital / Desk:</strong> ${clinic_hospital} — ${hospital_details}</p>
                <p style="margin: 4px 0;">📅 <strong>Requested Date & Time:</strong> ${appointment_date} at ${appointment_time}</p>
                <p style="margin: 4px 0;">📝 <strong>Reason / Symptoms:</strong> ${purpose}</p>
              </div>
              <p style="font-size: 13px; color: #64748b;">Please log in to your Doctor Portal to confirm or propose an available time slot.</p>
            </div>
          </div>
        `
      });
    }

    return res.status(201).json({
      success: true,
      message: 'Appointment request sent to Doctor and Hospital Reception successfully.',
      appointment: created
    });
  } catch (error) {
    console.error('[CareBridge Request Appt Error]:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
}

/**
 * Get all appointment requests for Doctor portal
 */
function getDoctorRequests(req, res) {
  try {
    const doctorId = req.user.id;
    const requests = db.prepare(`
      SELECT a.*, u.full_name as patient_name, u.email as patient_email, u.phone as patient_phone
      FROM patient_appointments a
      JOIN users u ON a.user_id = u.id
      WHERE a.doctor_id = ? OR a.status = 'requested' OR a.doctor_name LIKE '%Jenkins%'
      ORDER BY a.created_at DESC
    `).all(doctorId);

    return res.status(200).json({
      success: true,
      requests
    });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
}

/**
 * Doctor responds to appointment request ("I'm available at this time, you can come and visit me" or propose reschedule)
 */
async function doctorRespond(req, res) {
  try {
    const { id } = req.params;
    const { available_slot, response_notes, confirmed_date, confirmed_time, is_reschedule, status: customStatus } = req.body;
    const doctor = req.user;

    const appt = db.prepare(`
      SELECT a.*, u.full_name as patient_name, u.email as patient_email
      FROM patient_appointments a
      JOIN users u ON a.user_id = u.id
      WHERE a.id = ?
    `).get(id);

    if (!appt) {
      return res.status(404).json({ success: false, message: 'Appointment not found.' });
    }

    const proposedSlot = available_slot || `${confirmed_date || appt.appointment_date} at ${confirmed_time || appt.appointment_time || '10:30 AM'}`;
    const isReschedule = is_reschedule || customStatus === 'reschedule_proposed';
    const newStatus = isReschedule ? 'reschedule_proposed' : 'confirmed_by_doctor';

    const defaultNotes = isReschedule 
      ? `Dr. ${doctor.full_name || 'Jenkins'} has a schedule conflict on the requested date. Proposed new slot: ${proposedSlot}. Please confirm if this works.`
      : `Confirmed. Dr. ${doctor.full_name || 'Jenkins'} is available on ${proposedSlot}. You can come and visit at this time.`;

    const notes = response_notes || defaultNotes;

    db.prepare(`
      UPDATE patient_appointments 
      SET doctor_available_slot = ?, doctor_response_notes = ?, doctor_feedback = ?, status = ?,
          appointment_date = COALESCE(?, appointment_date),
          appointment_time = COALESCE(?, appointment_time)
      WHERE id = ?
    `).run(proposedSlot, notes, notes, newStatus, confirmed_date || null, confirmed_time || null, id);

    const updated = db.prepare('SELECT * FROM patient_appointments WHERE id = ?').get(id);

    // 3-Way Notification: Dispatch email to both Patient and Caretaker
    const recipients = [];
    if (appt.patient_email) recipients.push(appt.patient_email);
    if (appt.requested_by_email && !recipients.includes(appt.requested_by_email)) {
      recipients.push(appt.requested_by_email);
    }

    const emailSubject = isReschedule
      ? `🗓️ [Action Required: CareBridge Reschedule Proposal] Dr. ${doctor.full_name || 'Jenkins'} proposed a new date`
      : `✅ [Doctor Response] Appointment Confirmed with ${doctor.full_name || 'Dr. Sarah Jenkins'}`;

    for (const email of recipients) {
      await sendEmail({
        to: email,
        subject: emailSubject,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid ${isReschedule ? '#f59e0b' : '#16a34a'}; border-radius: 8px;">
            <div style="background: ${isReschedule ? '#d97706' : '#16a34a'}; color: white; padding: 16px; border-radius: 6px; text-align: center;">
              <h2 style="margin: 0;">${isReschedule ? 'Appointment Reschedule Proposed' : 'Appointment Confirmed by Doctor'}</h2>
            </div>
            <div style="padding: 20px 0;">
              <p>Dear <strong>${appt.patient_name || 'Patient'}</strong> & Caregiver,</p>
              <p>Your physician has reviewed the consultation request and sent the following scheduling response:</p>
              
              <div style="background: ${isReschedule ? '#fffbeb' : '#f0fdf4'}; border-left: 4px solid ${isReschedule ? '#f59e0b' : '#16a34a'}; padding: 16px; margin: 16px 0; border-radius: 4px;">
                <p style="font-size: 16px; font-weight: bold; color: ${isReschedule ? '#92400e' : '#166534'}; margin: 0 0 8px 0;">
                  💬 "${notes}"
                </p>
                <p style="margin: 4px 0; color: #334155;"><strong>⏰ Proposed Slot:</strong> ${proposedSlot}</p>
                <p style="margin: 4px 0; color: #334155;"><strong>🏥 Location / Desk:</strong> ${appt.clinic_hospital} (${appt.hospital_details || 'Suite 400'})</p>
              </div>

              ${isReschedule 
                ? '<p style="font-size: 14px; color: #b45309; font-weight: 600;">Please log into your Caregiver Portal to Accept this proposed date or submit an alternative date.</p>'
                : '<p style="font-size: 13px; color: #64748b;">Please bring your latest blood pressure, blood sugar records, and current medication bottles.</p>'
              }
            </div>
          </div>
        `
      });
    }

    return res.status(200).json({
      success: true,
      message: isReschedule
        ? `Reschedule proposal sent to Caretaker & Patient: ${proposedSlot}`
        : `Appointment confirmed and slot sent to Patient and Caregiver (${recipients.join(', ')})`,
      appointment: updated
    });
  } catch (error) {
    console.error('[CareBridge Doctor Respond Error]:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
}

/**
 * Caretaker responds to Doctor's proposed reschedule date (accept or counter-propose)
 */
async function caretakerRespondReschedule(req, res) {
  try {
    const { id } = req.params;
    const { action, counter_date, counter_time, notes } = req.body;
    const user = req.user;

    const appt = db.prepare(`
      SELECT a.*, u.full_name as patient_name, u.email as patient_email
      FROM patient_appointments a
      JOIN users u ON a.user_id = u.id
      WHERE a.id = ?
    `).get(id);

    if (!appt) {
      return res.status(404).json({ success: false, message: 'Appointment not found.' });
    }

    if (action === 'accept') {
      const confirmedDate = appt.doctor_available_slot ? appt.doctor_available_slot.split(' at ')[0] : appt.appointment_date;
      const confirmedTime = appt.doctor_available_slot && appt.doctor_available_slot.includes(' at ') ? appt.doctor_available_slot.split(' at ')[1] : appt.appointment_time;

      db.prepare(`
        UPDATE patient_appointments
        SET status = 'confirmed_by_doctor',
            appointment_date = ?,
            appointment_time = ?,
            doctor_response_notes = COALESCE(doctor_response_notes, '') || ' | Caregiver accepted proposed date.'
        WHERE id = ?
      `).run(confirmedDate, confirmedTime, id);

      const updated = db.prepare('SELECT * FROM patient_appointments WHERE id = ?').get(id);

      // Notify Doctor
      const doctorUser = appt.doctor_id 
        ? db.prepare('SELECT * FROM users WHERE id = ?').get(appt.doctor_id) 
        : db.prepare("SELECT * FROM users WHERE role = 'doctor' LIMIT 1").get();
        
      if (doctorUser && doctorUser.email) {
        await sendEmail({
          to: doctorUser.email,
          subject: `✅ [Reschedule Accepted] Caregiver confirmed ${confirmedDate} for ${appt.patient_name}`,
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #16a34a; border-radius: 8px;">
              <h2 style="color: #166534; margin: 0 0 12px 0;">Rescheduled Consultation Confirmed</h2>
              <p>Caregiver <strong>${user.full_name || 'Sarah Davis'}</strong> has accepted your proposed slot for <strong>${appt.patient_name}</strong>.</p>
              <div style="background: #f0fdf4; padding: 12px 16px; border-left: 4px solid #16a34a; border-radius: 4px;">
                <p style="margin: 4px 0;">📅 <strong>Confirmed Date:</strong> ${confirmedDate}</p>
                <p style="margin: 4px 0;">⏰ <strong>Confirmed Time:</strong> ${confirmedTime}</p>
              </div>
            </div>
          `
        });
      }

      return res.status(200).json({
        success: true,
        message: 'Proposed date accepted and consultation confirmed.',
        appointment: updated
      });
    } else {
      // Counter-propose another date
      const newDate = counter_date || appt.appointment_date;
      const newTime = counter_time || appt.appointment_time || '10:00 AM';
      const counterNotes = notes || 'Caretaker requested alternate date due to patient schedule.';

      db.prepare(`
        UPDATE patient_appointments
        SET status = 'requested',
            appointment_date = ?,
            appointment_time = ?,
            purpose = purpose || ' (Caretaker counter: ' || ? || ')'
        WHERE id = ?
      `).run(newDate, newTime, counterNotes, id);

      const updated = db.prepare('SELECT * FROM patient_appointments WHERE id = ?').get(id);

      // Notify Doctor
      const doctorUser = appt.doctor_id 
        ? db.prepare('SELECT * FROM users WHERE id = ?').get(appt.doctor_id) 
        : db.prepare("SELECT * FROM users WHERE role = 'doctor' LIMIT 1").get();

      if (doctorUser && doctorUser.email) {
        await sendEmail({
          to: doctorUser.email,
          subject: `🔄 [Alternate Date Requested] Caregiver counter-proposed ${newDate} for ${appt.patient_name}`,
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #665BE8; border-radius: 8px;">
              <h2 style="color: #373B8F; margin: 0 0 12px 0;">Alternate Appointment Requested</h2>
              <p>Caregiver <strong>${user.full_name || 'Sarah Davis'}</strong> could not make the proposed slot and requested an alternative date for <strong>${appt.patient_name}</strong>:</p>
              <div style="background: #f8fafc; padding: 12px 16px; border-left: 4px solid #665BE8; border-radius: 4px;">
                <p style="margin: 4px 0;">📅 <strong>Requested Date:</strong> ${newDate}</p>
                <p style="margin: 4px 0;">⏰ <strong>Requested Time:</strong> ${newTime}</p>
                <p style="margin: 4px 0;">📝 <strong>Reason / Notes:</strong> ${counterNotes}</p>
              </div>
            </div>
          `
        });
      }

      return res.status(200).json({
        success: true,
        message: 'Alternative date submitted to Doctor.',
        appointment: updated
      });
    }
  } catch (error) {
    console.error('[CareBridge Caretaker Respond Reschedule Error]:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
}

/**
 * Check if doctor has an appointment conflict on a given date
 */
function checkConflict(req, res) {
  try {
    const { date, doctor_id, time } = req.query;
    if (!date) {
      return res.status(400).json({ success: false, message: 'Date parameter is required.' });
    }

    const doctorId = doctor_id ? parseInt(doctor_id) : (req.user.role === 'doctor' ? req.user.id : null);
    
    // Normalize date string (e.g. 2026-11-04 or Nov 04, 2026)
    const cleanDate = date.trim();
    
    let query = `
      SELECT a.*, u.full_name as patient_name, u.phone as patient_phone
      FROM patient_appointments a
      LEFT JOIN users u ON a.user_id = u.id
      WHERE (
        a.appointment_date LIKE ? OR 
        a.appointment_date LIKE ?
      )
      AND a.status != 'cancelled'
    `;
    const params = [`%${cleanDate}%`, `%${cleanDate.replace(/-/g, '/')} %`];

    if (doctorId) {
      query += ` AND (a.doctor_id = ? OR a.doctor_id IS NULL)`;
      params.push(doctorId);
    }

    const existing = db.prepare(query).all(...params);

    if (existing && existing.length > 0) {
      const conflictAppt = existing[0];
      return res.status(200).json({
        success: true,
        hasConflict: true,
        totalConflicts: existing.length,
        conflictAppointment: conflictAppt,
        message: `You have an appointment on this day already (${conflictAppt.doctor_name || 'Dr. Jenkins'} with ${conflictAppt.patient_name || 'patient'} at ${conflictAppt.appointment_time || 'scheduled slot'}). You can choose another day or another time.`
      });
    }

    return res.status(200).json({
      success: true,
      hasConflict: false,
      message: 'Slot is open. No scheduling conflict detected.'
    });
  } catch (error) {
    console.error('[CareBridge Check Conflict Error]:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
}

module.exports = {
  getAppointments,
  createAppointment,
  requestAppointment,
  getDoctorRequests,
  doctorRespond,
  caretakerRespondReschedule,
  checkConflict,
  updateAppointment,
  deleteAppointment,
  sendAppointmentEmail
};
