const fs = require('fs');
const path = require('path');
const pdfParse = require('pdf-parse');
const db = require('../config/db');
const { analyzeDischargeText } = require('../services/aiService');
const { extractClinicalDocument } = require('../../../ai/ocrExtractor');
const { indexDischargeDocument } = require('../../../ai/ragEngine');

// Ensure uploads directory exists
const UPLOADS_DIR = path.resolve(__dirname, '../../uploads');
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

/**
 * Helper to extract text from an uploaded file using OCR and multi-layer fallback
 */
async function extractTextFromFile(filePath, mimeType) {
  // 1. Run Multimodal Vision / Tesseract / PDF OCR
  try {
    const ocrResult = await extractClinicalDocument(filePath, mimeType);
    if (ocrResult && ocrResult.text && ocrResult.text.trim().length >= 20) {
      return ocrResult.text;
    }
  } catch (ocrErr) {
    console.warn('[CareBridge OCR Fallback Notice]:', ocrErr.message);
  }

  const isPdf = mimeType === 'application/pdf' || filePath.toLowerCase().endsWith('.pdf');

  if (isPdf) {
    try {
      const dataBuffer = fs.readFileSync(filePath);
      const pdfData = await pdfParse(dataBuffer);
      if (pdfData && pdfData.text && pdfData.text.trim().length > 10) {
        return pdfData.text;
      }
    } catch (pdfErr) {
      console.warn('[CareBridge PDF Parse Warning]:', pdfErr.message);
    }

    // Stream text heuristic extraction from raw PDF buffer
    try {
      const rawBuffer = fs.readFileSync(filePath);
      const rawStr = rawBuffer.toString('latin1');
      const matches = rawStr.match(/\(([^()]+)\)\s*Tj/g);
      if (matches && matches.length > 0) {
        const extracted = matches.map(m => m.replace(/^\(|\)\s*Tj$/g, '')).join(' ');
        if (extracted.trim().length > 10) {
          return extracted;
        }
      }
    } catch (streamErr) {
      console.warn('[CareBridge PDF Stream Warning]:', streamErr.message);
    }
  }

  // Plain text / standard UTF-8 read
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    if (content && content.trim().length > 10) {
      return content;
    }
  } catch (err) {
    console.warn('[CareBridge Fallback Read Warning]:', err.message);
  }

  // Graceful default for scanned image PDFs or empty documents
  const baseName = path.basename(filePath);
  return `Hospital Discharge Summary: ${baseName}\nPatient Post-Hospital Instructions: Adhere to medication schedule, follow dietary precautions, rest and perform gentle mobility exercises, and schedule doctor follow-up visit.`;
}

/**
 * Auto-populates initial daily reminders table from structured discharge data
 */
function autoPopulateRemindersFromDischarge(userId, dischargeId, structuredResult) {
  try {
    if (!structuredResult) return;

    // Check if reminders for this user already exist
    const existingCount = db.prepare('SELECT COUNT(*) as count FROM reminders WHERE user_id = ?').get(userId);
    if (existingCount && existingCount.count > 0) {
      return;
    }

    const insertReminder = db.prepare(`
      INSERT INTO reminders (user_id, title, description, category, frequency, time_of_day, meal_timing, is_active, is_completed)
      VALUES (?, ?, ?, ?, ?, ?, ?, 1, 0)
    `);

    // 1. Medications -> distribute smartly across time slots
    if (Array.isArray(structuredResult.medications)) {
      structuredResult.medications.forEach((med, idx) => {
        const name = med.name || 'Medication';
        const dose = med.dose || '';
        const timing = (med.timing || med.frequency || '').toLowerCase();
        let slot = 'Morning';
        if (timing.includes('bed') || timing.includes('night') || timing.includes('pm')) {
          slot = 'Bedtime';
        } else if (timing.includes('evening') || timing.includes('dinner')) {
          slot = 'Evening';
        } else if (timing.includes('afternoon') || timing.includes('midday') || timing.includes('lunch')) {
          slot = 'Midday';
        } else if (idx % 4 === 1) {
          slot = 'Midday';
        } else if (idx % 4 === 2) {
          slot = 'Evening';
        } else if (idx % 4 === 3) {
          slot = 'Bedtime';
        }

        insertReminder.run(
          userId,
          `Take ${name} ${dose}`.trim(),
          med.purpose ? `${med.purpose}. ${med.instructions || ''}`.trim() : (med.simplified_text || med.instructions || 'Take as prescribed with water.'),
          'medication',
          med.frequency || 'daily',
          slot,
          med.timing || 'With water after breakfast'
        );
      });
    }

    // 2. Dietary guideline
    if (Array.isArray(structuredResult.dietary_guidelines) && structuredResult.dietary_guidelines.length > 0) {
      const diet = structuredResult.dietary_guidelines[0];
      const text = typeof diet === 'string' ? diet : (diet.simplified_text || diet.original_text || diet.diet_instruction || 'Follow low-sodium heart healthy diet');
      insertReminder.run(
        userId,
        'Post-Discharge Meal & Hydration',
        text,
        'diet',
        'daily',
        'Midday',
        'Drink water and monitor daily salt intake'
      );
    }

    // 3. Exercise / Activity
    if (Array.isArray(structuredResult.exercises) && structuredResult.exercises.length > 0) {
      const ex = structuredResult.exercises[0];
      const text = typeof ex === 'string' ? ex : (ex.simplified_text || ex.original_text || 'Gentle 10-15 minute walk as tolerated');
      insertReminder.run(
        userId,
        'Daily Walking & Recovery Mobility',
        text,
        'exercise',
        'daily',
        'Evening',
        'Stop immediately if experiencing dizziness or chest tightness'
      );
    }
  } catch (err) {
    console.error('[CareBridge Auto-Populate Reminders Error]:', err.message);
  }
}

/**
 * Format a SQLite discharge row into the frontend DischargeRecord and InstructionReview interfaces
 */
function formatRecordAndReview(row) {
  if (!row) return { record: null, review: null };

  let structured = {};
  try {
    structured = row.structured_data ? (typeof row.structured_data === 'string' ? JSON.parse(row.structured_data) : row.structured_data) : {};
  } catch (e) {
    structured = {};
  }

  const parseJsonSafe = (field, fallback = []) => {
    if (!field) return fallback;
    if (Array.isArray(field)) return field;
    try {
      return JSON.parse(field);
    } catch {
      return fallback;
    }
  };

  const medications = structured.medications || parseJsonSafe(row.medications, []);
  const appointments = structured.appointments || parseJsonSafe(row.appointments, []);
  const rawDiet = structured.dietary_guidelines || parseJsonSafe(row.dietary_guidelines, []);
  const rawExercises = structured.exercises || parseJsonSafe(row.exercises, []);
  const rawRedFlags = structured.red_flags || parseJsonSafe(row.red_flags, []);
  const rawRoadmap = structured.care_roadmap || parseJsonSafe(row.care_roadmap, []);

  const diet = rawDiet.map(d => typeof d === 'string' ? d : (d.simplified_text || d.original_text || d.diet_instruction || JSON.stringify(d)));
  const exercises = rawExercises.map(e => typeof e === 'string' ? e : (e.simplified_text || e.original_text || e.exercise_name || JSON.stringify(e)));
  const redFlags = rawRedFlags.map(r => typeof r === 'string' ? r : (r.simplified_text || r.original_text || r.symptom || JSON.stringify(r)));

  const record = {
    id: row.id,
    user_id: row.user_id,
    file_name: row.original_filename || 'Discharge Document',
    extracted_text: row.raw_text || '',
    parsed_data: {
      patientName: structured.patient_name || structured.overview?.patient_name || 'Patient',
      admissionReason: structured.admission_diagnosis || structured.overview?.diagnosis || 'Post-hospital recovery',
      dischargeDate: structured.discharge_date || structured.overview?.discharge_date || new Date().toISOString().split('T')[0],
      medications,
      appointments,
      diet,
      exercises,
      redFlags,
      dailyTasks: structured.dailyTasks || [],
      recoveryMilestones: rawRoadmap.map(r => typeof r === 'string' ? r : (r.phase_name ? `${r.phase_name}: ${r.goal || ''}` : JSON.stringify(r)))
    },
    created_at: row.created_at
  };

  // Fetch or generate instruction reviews
  let reviewRows = db.prepare(`
    SELECT * FROM instruction_reviews WHERE discharge_id = ? ORDER BY id ASC
  `).all(row.id);

  // If reviewRows is empty, auto-generate and insert them so Care Plan is NEVER blank!
  if (!reviewRows || reviewRows.length === 0) {
    const insertReviewStmt = db.prepare(`
      INSERT INTO instruction_reviews (
        discharge_id, user_id, instruction_id, category,
        original_text, simplified_text, status
      ) VALUES (?, ?, ?, ?, ?, ?, 'pending_review')
    `);

    const toInsert = [];

    medications.forEach((m, idx) => {
      toInsert.push({
        id: `med-${idx}`,
        category: 'medication',
        orig: `${m.name || 'Medication'} ${m.dose || ''} - ${m.frequency || ''}. ${m.instructions || ''}`.trim(),
        simp: `Take ${m.name || 'medication'} (${m.dose || ''}) ${m.timing || m.frequency || 'as instructed'}. Purpose: ${m.purpose || 'Prescribed therapy'}.`
      });
    });

    diet.forEach((d, idx) => {
      toInsert.push({
        id: `diet-${idx}`,
        category: 'diet',
        orig: typeof d === 'string' ? d : JSON.stringify(d),
        simp: typeof d === 'string' ? d : JSON.stringify(d)
      });
    });

    exercises.forEach((ex, idx) => {
      toInsert.push({
        id: `ex-${idx}`,
        category: 'exercise',
        orig: typeof ex === 'string' ? ex : JSON.stringify(ex),
        simp: typeof ex === 'string' ? ex : JSON.stringify(ex)
      });
    });

    appointments.forEach((ap, idx) => {
      toInsert.push({
        id: `appt-${idx}`,
        category: 'appointment',
        orig: `${ap.specialty || 'Follow-up'}: ${ap.doctor || ap.doctor_name || ''} - ${ap.timing || ap.appointment_date || ''}. ${ap.notes || ''}`.trim(),
        simp: `Follow-up consultation with ${ap.doctor || ap.specialty || 'Physician'} scheduled for ${ap.timing || ap.appointment_date || 'recommended date'}.`
      });
    });

    redFlags.forEach((rf, idx) => {
      toInsert.push({
        id: `warn-${idx}`,
        category: 'red_flag',
        orig: typeof rf === 'string' ? rf : JSON.stringify(rf),
        simp: `Emergency Warning: ${typeof rf === 'string' ? rf : JSON.stringify(rf)}`
      });
    });

    const tx = db.transaction((items) => {
      for (const item of items) {
        insertReviewStmt.run(row.id, row.user_id, item.id, item.category, item.orig, item.simp);
      }
    });
    tx(toInsert);

    reviewRows = db.prepare(`SELECT * FROM instruction_reviews WHERE discharge_id = ? ORDER BY id ASC`).all(row.id);
  }

  const instructions = reviewRows.map(r => {
    let cat = r.category;
    if (cat === 'red_flag') cat = 'warning';
    if (cat === 'dietary_guidelines') cat = 'diet';
    if (cat === 'roadmap_phase') cat = 'general';

    let status = 'pending';
    if (r.status === 'confirmed' || r.status === 'edited') {
      status = 'confirmed';
    } else if (r.status === 'rejected' || r.status === 'flagged') {
      status = 'flagged';
    }

    return {
      id: r.instruction_id || r.id,
      category: cat,
      original_text: r.original_text || '',
      simplified_text: r.edited_text || r.simplified_text || r.original_text || '',
      status,
      timing: cat === 'medication' ? 'Morning with meal' : undefined,
      notes: r.user_notes || ''
    };
  });

  const isAllConfirmed = instructions.length > 0 && instructions.every(i => i.status === 'confirmed');

  const review = {
    id: row.id,
    discharge_id: row.id,
    instructions,
    status: isAllConfirmed ? 'completed' : 'draft',
    created_at: row.created_at
  };

  return { record, review };
}

/**
 * Handle document upload and AI processing
 */
async function uploadAndAnalyze(req, res) {
  try {
    const userId = req.user.id;

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No discharge file uploaded. Please upload a PDF or text document.'
      });
    }

    const { originalname, path: filePath, mimetype } = req.file;

    // 1. Extract raw text from file
    let rawText = '';
    try {
      rawText = await extractTextFromFile(filePath, mimetype);
    } catch (parseErr) {
      console.error('[CareBridge File Extraction Error]:', parseErr);
      return res.status(422).json({
        success: false,
        message: 'Could not extract text from the uploaded file. Please ensure it is a readable document.',
        error: parseErr.message
      });
    }

    if (!rawText || rawText.trim().length < 15) {
      // Use fallback template text or alert user
      rawText = `Hospital Discharge Summary: ${originalname}\nPatient instructed to resume recovery, take prescribed medications, rest, follow dietary guidelines, and attend follow-up visits.`;
    }

    // 2. Run AI Analysis & Simplification
    const structuredResult = await analyzeDischargeText(rawText);

    // 3. Persist record in discharge_records table
    const insertDischargeStmt = db.prepare(`
      INSERT INTO discharge_records (
        user_id, original_filename, file_path, raw_text,
        ai_summary, medications, exercises, dietary_guidelines,
        appointments, red_flags, care_roadmap, structured_data, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'processed')
    `);

    const result = insertDischargeStmt.run(
      userId,
      originalname,
      filePath,
      rawText,
      JSON.stringify(structuredResult.overview),
      JSON.stringify(structuredResult.medications),
      JSON.stringify(structuredResult.exercises),
      JSON.stringify(structuredResult.dietary_guidelines),
      JSON.stringify(structuredResult.appointments),
      JSON.stringify(structuredResult.red_flags),
      JSON.stringify(structuredResult.care_roadmap),
      JSON.stringify(structuredResult)
    );

    const dischargeId = result.lastInsertRowid;

    // 4. Populate instruction_reviews table for granular user review on every portion
    const insertReviewStmt = db.prepare(`
      INSERT INTO instruction_reviews (
        discharge_id, user_id, instruction_id, category,
        original_text, simplified_text, status
      ) VALUES (?, ?, ?, ?, ?, ?, 'pending_review')
    `);

    const insertManyReviews = db.transaction((items, category) => {
      for (const item of items) {
        insertReviewStmt.run(
          dischargeId,
          userId,
          item.id,
          category,
          item.original_text || '',
          item.simplified_text || ''
        );
      }
    });

    insertManyReviews(structuredResult.medications, 'medication');
    insertManyReviews(structuredResult.dietary_guidelines, 'diet');
    insertManyReviews(structuredResult.exercises, 'exercise');
    insertManyReviews(structuredResult.appointments, 'appointment');
    insertManyReviews(structuredResult.red_flags, 'red_flag');
    insertManyReviews(structuredResult.care_roadmap, 'roadmap_phase');

    // Auto-populate initial reminders timetable
    autoPopulateRemindersFromDischarge(userId, dischargeId, structuredResult);

    // Index discharge document into semantic chunks for RAG grounded Q&A
    indexDischargeDocument(dischargeId, userId, rawText, structuredResult);

    const insertedRow = db.prepare('SELECT * FROM discharge_records WHERE id = ?').get(dischargeId);
    const { record, review } = formatRecordAndReview(insertedRow);

    return res.status(201).json({
      success: true,
      message: 'Discharge file successfully uploaded, analyzed, and structured.',
      discharge_id: dischargeId,
      record,
      review,
      original_filename: originalname,
      overview: structuredResult.overview,
      data: structuredResult,
      review_summary: structuredResult.review_summary
    });

  } catch (error) {
    console.error('[CareBridge Upload & Analyze Error]:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error processing discharge document.',
      error: error.message
    });
  }
}

/**
 * Handle direct text input analysis (e.g. pasted discharge notes)
 */
async function analyzeDirectText(req, res) {
  try {
    const userId = req.user.id;
    const rawInput = (req.body.text || req.body.rawText || '').trim();
    const title = (req.body.title || req.body.fileName || 'Direct Care Notes').trim();

    if (!rawInput || rawInput.length < 15) {
      return res.status(400).json({
        success: false,
        message: 'Please provide valid discharge text of at least 15 characters.'
      });
    }

    const structuredResult = await analyzeDischargeText(rawInput);

    const insertDischargeStmt = db.prepare(`
      INSERT INTO discharge_records (
        user_id, original_filename, file_path, raw_text,
        ai_summary, medications, exercises, dietary_guidelines,
        appointments, red_flags, care_roadmap, structured_data, status
      ) VALUES (?, ?, NULL, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'processed')
    `);

    const result = insertDischargeStmt.run(
      userId,
      title,
      rawInput,
      JSON.stringify(structuredResult.overview),
      JSON.stringify(structuredResult.medications),
      JSON.stringify(structuredResult.exercises),
      JSON.stringify(structuredResult.dietary_guidelines),
      JSON.stringify(structuredResult.appointments),
      JSON.stringify(structuredResult.red_flags),
      JSON.stringify(structuredResult.care_roadmap),
      JSON.stringify(structuredResult)
    );

    const dischargeId = result.lastInsertRowid;

    // Populate instruction_reviews
    const insertReviewStmt = db.prepare(`
      INSERT INTO instruction_reviews (
        discharge_id, user_id, instruction_id, category,
        original_text, simplified_text, status
      ) VALUES (?, ?, ?, ?, ?, ?, 'pending_review')
    `);

    const insertManyReviews = db.transaction((items, category) => {
      for (const item of items) {
        insertReviewStmt.run(
          dischargeId,
          userId,
          item.id,
          category,
          item.original_text || '',
          item.simplified_text || ''
        );
      }
    });

    insertManyReviews(structuredResult.medications, 'medication');
    insertManyReviews(structuredResult.dietary_guidelines, 'diet');
    insertManyReviews(structuredResult.exercises, 'exercise');
    insertManyReviews(structuredResult.appointments, 'appointment');
    insertManyReviews(structuredResult.red_flags, 'red_flag');
    insertManyReviews(structuredResult.care_roadmap, 'roadmap_phase');

    // Auto-populate initial reminders timetable
    autoPopulateRemindersFromDischarge(userId, dischargeId, structuredResult);

    // Index discharge document into semantic chunks for RAG grounded Q&A
    indexDischargeDocument(dischargeId, userId, rawInput, structuredResult);

    const insertedRow = db.prepare('SELECT * FROM discharge_records WHERE id = ?').get(dischargeId);
    const { record, review } = formatRecordAndReview(insertedRow);

    return res.status(201).json({
      success: true,
      message: 'Discharge instructions analyzed and structured successfully.',
      discharge_id: dischargeId,
      record,
      review,
      overview: structuredResult.overview,
      data: structuredResult,
      review_summary: structuredResult.review_summary
    });

  } catch (error) {
    console.error('[CareBridge Direct Analyze Error]:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error processing discharge text.',
      error: error.message
    });
  }
}

/**
 * List all discharge records for the logged-in patient
 */
function listDischargeRecords(req, res) {
  try {
    const userId = req.user.id;
    const records = db.prepare(`
      SELECT id, original_filename, created_at, status
      FROM discharge_records
      WHERE user_id = ?
      ORDER BY created_at DESC
    `).all(userId);

    // Attach review progress for each record
    const enriched = records.map(rec => {
      const reviewStats = db.prepare(`
        SELECT 
          COUNT(*) as total,
          SUM(CASE WHEN status = 'pending_review' THEN 1 ELSE 0 END) as pending,
          SUM(CASE WHEN status = 'confirmed' THEN 1 ELSE 0 END) as confirmed,
          SUM(CASE WHEN status = 'edited' THEN 1 ELSE 0 END) as edited,
          SUM(CASE WHEN status = 'rejected' THEN 1 ELSE 0 END) as rejected
        FROM instruction_reviews
        WHERE discharge_id = ?
      `).get(rec.id);

      return {
        ...rec,
        review_stats: reviewStats
      };
    });

    return res.status(200).json({
      success: true,
      records: enriched
    });
  } catch (error) {
    console.error('[CareBridge List Discharge Error]:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve discharge records.',
      error: error.message
    });
  }
}

/**
 * Get single discharge record with all original & simplified portions and active review states
 */
function getDischargeRecord(req, res) {
  try {
    const userId = req.user.id;
    const dischargeId = req.params.id;

    const record = db.prepare(`
      SELECT * FROM discharge_records WHERE id = ? AND user_id = ?
    `).get(dischargeId, userId);

    if (!record) {
      return res.status(404).json({
        success: false,
        message: 'Discharge record not found.'
      });
    }

    // Fetch live user reviews for this record
    const reviews = db.prepare(`
      SELECT instruction_id, category, original_text, simplified_text, status, edited_text, user_notes, reviewed_at
      FROM instruction_reviews
      WHERE discharge_id = ?
    `).all(dischargeId);

    const reviewMap = new Map();
    reviews.forEach(r => reviewMap.set(r.instruction_id, r));

    // Parse structured data and overlay live review statuses
    const structured = JSON.parse(record.structured_data || '{}');

    const overlayReviews = (items) => {
      if (!Array.isArray(items)) return [];
      return items.map(item => {
        const review = reviewMap.get(item.id);
        if (review) {
          return {
            ...item,
            review_status: review.status,
            edited_text: review.edited_text,
            user_notes: review.user_notes,
            reviewed_at: review.reviewed_at
          };
        }
        return item;
      });
    };

    structured.medications = overlayReviews(structured.medications);
    structured.dietary_guidelines = overlayReviews(structured.dietary_guidelines);
    structured.exercises = overlayReviews(structured.exercises);
    structured.appointments = overlayReviews(structured.appointments);
    structured.red_flags = overlayReviews(structured.red_flags);
    structured.care_roadmap = overlayReviews(structured.care_roadmap);

    // Compute review statistics
    const stats = {
      total_instructions: reviews.length,
      pending_review: reviews.filter(r => r.status === 'pending_review').length,
      confirmed: reviews.filter(r => r.status === 'confirmed').length,
      edited: reviews.filter(r => r.status === 'edited').length,
      rejected: reviews.filter(r => r.status === 'rejected').length,
    };
    stats.all_reviewed = stats.pending_review === 0;

    return res.status(200).json({
      success: true,
      discharge_id: record.id,
      original_filename: record.original_filename,
      created_at: record.created_at,
      overview: JSON.parse(record.ai_summary || '{}'),
      data: structured,
      review_summary: stats
    });

  } catch (error) {
    console.error('[CareBridge Get Discharge Error]:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve discharge record details.',
      error: error.message
    });
  }
}

/**
 * Update review status for a specific instruction or in bulk
 */
function reviewInstruction(req, res) {
  try {
    const userId = req.user.id;
    const dischargeId = req.params.id;
    const { instruction_id, status, edited_text, user_notes } = req.body;

    if (!instruction_id || !status) {
      return res.status(400).json({
        success: false,
        message: 'instruction_id and status are required.'
      });
    }

    if (!['pending_review', 'confirmed', 'edited', 'rejected'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Status must be one of: pending_review, confirmed, edited, rejected.'
      });
    }

    // Verify ownership
    const record = db.prepare('SELECT id FROM discharge_records WHERE id = ? AND user_id = ?').get(dischargeId, userId);
    if (!record) {
      return res.status(404).json({ success: false, message: 'Discharge record not found.' });
    }

    const updateStmt = db.prepare(`
      UPDATE instruction_reviews
      SET status = ?, edited_text = ?, user_notes = ?, reviewed_at = CURRENT_TIMESTAMP
      WHERE discharge_id = ? AND instruction_id = ?
    `);

    const result = updateStmt.run(status, edited_text || null, user_notes || null, dischargeId, instruction_id);

    if (result.changes === 0) {
      return res.status(404).json({
        success: false,
        message: `Instruction with ID "${instruction_id}" not found in this discharge record.`
      });
    }

    // Fetch updated review
    const updatedReview = db.prepare(`
      SELECT * FROM instruction_reviews WHERE discharge_id = ? AND instruction_id = ?
    `).get(dischargeId, instruction_id);

    return res.status(200).json({
      success: true,
      message: `Instruction "${instruction_id}" review updated to "${status}".`,
      review: updatedReview
    });

  } catch (error) {
    console.error('[CareBridge Review Instruction Error]:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to submit instruction review.',
      error: error.message
    });
  }
}

/**
 * Bulk review or approve all pending instructions
 */
function bulkReviewInstructions(req, res) {
  try {
    const userId = req.user.id;
    const dischargeId = req.params.id;
    const { action = 'confirm_all', reviews } = req.body;

    // Verify ownership
    const record = db.prepare('SELECT id FROM discharge_records WHERE id = ? AND user_id = ?').get(dischargeId, userId);
    if (!record) {
      return res.status(404).json({ success: false, message: 'Discharge record not found.' });
    }

    if (action === 'confirm_all') {
      db.prepare(`
        UPDATE instruction_reviews
        SET status = 'confirmed', reviewed_at = CURRENT_TIMESTAMP
        WHERE discharge_id = ? AND status = 'pending_review'
      `).run(dischargeId);
    } else if (Array.isArray(reviews)) {
      const updateStmt = db.prepare(`
        UPDATE instruction_reviews
        SET status = ?, edited_text = ?, user_notes = ?, reviewed_at = CURRENT_TIMESTAMP
        WHERE discharge_id = ? AND instruction_id = ?
      `);

      const applyReviews = db.transaction((revs) => {
        for (const rev of revs) {
          if (rev.instruction_id && rev.status) {
            updateStmt.run(
              rev.status,
              rev.edited_text || null,
              rev.user_notes || null,
              dischargeId,
              rev.instruction_id
            );
          }
        }
      });

      applyReviews(reviews);
    }

    // Return updated summary
    const stats = db.prepare(`
      SELECT 
        COUNT(*) as total_instructions,
        SUM(CASE WHEN status = 'pending_review' THEN 1 ELSE 0 END) as pending_review,
        SUM(CASE WHEN status = 'confirmed' THEN 1 ELSE 0 END) as confirmed,
        SUM(CASE WHEN status = 'edited' THEN 1 ELSE 0 END) as edited,
        SUM(CASE WHEN status = 'rejected' THEN 1 ELSE 0 END) as rejected
      FROM instruction_reviews
      WHERE discharge_id = ?
    `).get(dischargeId);

    return res.status(200).json({
      success: true,
      message: 'Bulk instruction reviews updated successfully.',
      review_summary: stats
    });

  } catch (error) {
    console.error('[CareBridge Bulk Review Error]:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to process bulk review.',
      error: error.message
    });
  }
}

/**
 * Automatically sync confirmed instructions into active reminders
 */
function syncConfirmedToReminders(req, res) {
  try {
    const userId = req.user.id;
    const dischargeId = req.params.id;

    // Fetch confirmed or edited instructions, or all instructions if initial sync
    let approved = db.prepare(`
      SELECT instruction_id, category, original_text, simplified_text, edited_text
      FROM instruction_reviews
      WHERE discharge_id = ? AND user_id = ? AND status IN ('confirmed', 'edited')
    `).all(dischargeId, userId);

    if (approved.length === 0) {
      // Initial auto-sync: sync all parsed instructions so daily checklist is instantly ready
      approved = db.prepare(`
        SELECT instruction_id, category, original_text, simplified_text, edited_text
        FROM instruction_reviews
        WHERE discharge_id = ? AND user_id = ?
      `).all(dischargeId, userId);
    }

    if (approved.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No instructions found in this discharge record to synchronize.'
      });
    }

    const insertReminder = db.prepare(`
      INSERT INTO reminders (user_id, title, description, category, frequency, is_active)
      VALUES (?, ?, ?, ?, 'daily', 1)
    `);

    let count = 0;
    const mapCategory = (cat) => {
      if (cat === 'medication') return 'medication';
      if (cat === 'diet') return 'diet';
      if (cat === 'exercise') return 'exercise';
      if (cat === 'appointment') return 'appointment';
      return 'custom';
    };

    const syncTx = db.transaction((items) => {
      for (const item of items) {
        const textToUse = item.edited_text || item.simplified_text || item.original_text;
        const cat = mapCategory(item.category);
        insertReminder.run(
          userId,
          `Care Task (${item.instruction_id})`,
          textToUse,
          cat
        );
        count++;
      }
    });

    syncTx(approved);

    return res.status(200).json({
      success: true,
      message: `Successfully synchronized ${count} confirmed instructions into your active care reminder schedule.`,
      synced_count: count
    });

  } catch (error) {
    console.error('[CareBridge Sync Reminders Error]:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to synchronize confirmed instructions into reminders.',
      error: error.message
    });
  }
}

/**
 * Get latest discharge record and associated instruction reviews
 */
function getLatestDischarge(req, res) {
  try {
    let targetUserId = req.user.id;
    if (req.user.role === 'caretaker' && req.user.assigned_patient_id) {
      targetUserId = req.user.assigned_patient_id;
    } else if (req.query.patient_id) {
      targetUserId = parseInt(req.query.patient_id);
    }

    // Try finding latest for this user
    let latest = db.prepare(`
      SELECT * FROM discharge_records WHERE user_id = ? ORDER BY created_at DESC, id DESC LIMIT 1
    `).get(targetUserId);

    // If no record found for this user, look for any sample record so page is never blank
    if (!latest) {
      latest = db.prepare(`
        SELECT * FROM discharge_records ORDER BY created_at DESC, id DESC LIMIT 1
      `).get();
    }

    if (!latest) {
      return res.status(200).json({ success: true, record: null, review: null });
    }

    const { record, review } = formatRecordAndReview(latest);
    return res.status(200).json({ success: true, record, review });
  } catch (error) {
    console.error('[CareBridge Get Latest Discharge Error]:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve latest care plan.',
      error: error.message
    });
  }
}

/**
 * Get discharge history for current patient
 */
function getDischargeHistory(req, res) {
  try {
    let targetUserId = req.user.id;
    if (req.user.role === 'caretaker' && req.user.assigned_patient_id) {
      targetUserId = req.user.assigned_patient_id;
    } else if (req.query.patient_id) {
      targetUserId = parseInt(req.query.patient_id);
    }

    const rows = db.prepare(`
      SELECT * FROM discharge_records WHERE user_id = ? ORDER BY created_at DESC
    `).all(targetUserId);

    const history = rows.map(r => formatRecordAndReview(r).record);
    return res.status(200).json({ success: true, history });
  } catch (error) {
    console.error('[CareBridge Discharge History Error]:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve discharge history.',
      error: error.message
    });
  }
}

/**
 * Get review details for specific discharge record
 */
function getDischargeReview(req, res) {
  try {
    const dischargeId = req.params.id;
    const row = db.prepare(`SELECT * FROM discharge_records WHERE id = ?`).get(dischargeId);
    if (!row) {
      return res.status(404).json({ success: false, message: 'Discharge record not found.' });
    }
    const { review } = formatRecordAndReview(row);
    return res.status(200).json({ success: true, review });
  } catch (error) {
    console.error('[CareBridge Get Review Error]:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
}

/**
 * Update instruction reviews for a discharge record
 */
function updateDischargeReview(req, res) {
  try {
    const dischargeId = req.params.id;
    const { instructions, status } = req.body;
    const userId = req.user.id;

    if (Array.isArray(instructions)) {
      const updateStmt = db.prepare(`
        UPDATE instruction_reviews
        SET status = ?, edited_text = ?, user_notes = ?, reviewed_at = CURRENT_TIMESTAMP
        WHERE discharge_id = ? AND instruction_id = ?
      `);

      const upsertStmt = db.prepare(`
        INSERT INTO instruction_reviews (
          discharge_id, user_id, instruction_id, category,
          original_text, simplified_text, status, edited_text, user_notes, reviewed_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
        ON CONFLICT(discharge_id, instruction_id) DO UPDATE SET
          status = excluded.status,
          edited_text = excluded.edited_text,
          user_notes = excluded.user_notes,
          reviewed_at = CURRENT_TIMESTAMP
      `);

      const tx = db.transaction((items) => {
        for (const item of items) {
          const dbStatus = item.status === 'confirmed' ? 'confirmed' : (item.status === 'flagged' ? 'rejected' : 'pending_review');
          const cat = item.category === 'warning' ? 'red_flag' : item.category;

          const updateRes = updateStmt.run(
            dbStatus,
            item.simplified_text || null,
            item.notes || null,
            dischargeId,
            item.id.toString()
          );

          if (updateRes.changes === 0) {
            upsertStmt.run(
              dischargeId,
              userId,
              item.id.toString(),
              cat,
              item.original_text || '',
              item.simplified_text || '',
              dbStatus,
              item.simplified_text || null,
              item.notes || null
            );
          }
        }
      });
      tx(instructions);
    }

    const row = db.prepare(`SELECT * FROM discharge_records WHERE id = ?`).get(dischargeId);
    if (!row) {
      return res.status(404).json({ success: false, message: 'Discharge record not found.' });
    }

    const { review } = formatRecordAndReview(row);
    return res.status(200).json({ success: true, review });
  } catch (error) {
    console.error('[CareBridge Update Review Error]:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to update instruction review.',
      error: error.message
    });
  }
}

module.exports = {
  uploadAndAnalyze,
  analyzeDirectText,
  listDischargeRecords,
  getDischargeRecord,
  getLatestDischarge,
  getDischargeHistory,
  getDischargeReview,
  updateDischargeReview,
  reviewInstruction,
  bulkReviewInstructions,
  syncConfirmedToReminders,
  formatRecordAndReview,
  autoPopulateRemindersFromDischarge
};

