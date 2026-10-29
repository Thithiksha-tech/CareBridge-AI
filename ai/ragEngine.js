const db = require('../backend/src/config/db');
const { generateGeminiContent } = require('./geminiClient');

/**
 * CareBridge RAG (Retrieval-Augmented Generation) Engine
 * Indexes patient discharge records into semantic clinical chunks and retrieves
 * relevant excerpts to provide grounded, citation-backed answers to patient queries.
 */

/**
 * Index a discharge record into semantic clinical RAG chunks
 */
function indexDischargeDocument(dischargeId, userId, rawText, structuredData) {
  try {
    if (!dischargeId || !userId) return;

    // Remove existing chunks for this discharge record
    db.prepare('DELETE FROM discharge_rag_chunks WHERE discharge_id = ?').run(dischargeId);

    const chunks = [];
    let chunkIndex = 0;

    // 1. Overview & Clinical Context Chunk
    if (structuredData?.overview) {
      const o = structuredData.overview;
      const overviewText = `[Patient Overview & Admission] Patient: ${o.patient_name || 'Patient'} | Diagnosis: ${o.diagnosis || o.admission_diagnosis || 'Post-hospital discharge'} | Attending: ${o.attending_physician || 'Attending Physician'} | Discharge Date: ${o.discharge_date || 'Recent'}. Summary: ${o.summary || ''}`;
      chunks.push({
        section: 'overview',
        index: chunkIndex++,
        content: overviewText,
        keywords: `${o.patient_name || ''} ${o.diagnosis || ''} ${o.attending_physician || ''} overview diagnosis admission`
      });
    }

    // 2. Medication Chunks (index each medication individually for high-precision retrieval)
    if (Array.isArray(structuredData?.medications)) {
      structuredData.medications.forEach((med, idx) => {
        const medText = `[Discharge Medication #${idx + 1}] Drug: ${med.drug_name || med.name} | Dose: ${med.dosage || med.dose || ''} | Route: ${med.route || 'Oral'} | Frequency: ${med.frequency || ''} | Timing: ${med.timing || ''} | Purpose: ${med.purpose || med.indication || 'Prescribed therapy'} | Directions: ${med.instructions || med.simplified_text || ''} | Side Effects/Warnings: ${med.side_effects || med.precautions || 'Take as instructed'}`;
        chunks.push({
          section: 'medications',
          index: chunkIndex++,
          content: medText,
          keywords: `${med.drug_name || med.name} ${med.dosage || med.dose || ''} ${med.purpose || ''} ${med.frequency || ''} medication pill tablet drug dose`
        });
      });
    }

    // 3. Dietary & Hydration Guidelines Chunk
    if (Array.isArray(structuredData?.dietary_guidelines) && structuredData.dietary_guidelines.length > 0) {
      const dietLines = structuredData.dietary_guidelines.map(d => typeof d === 'string' ? d : (d.simplified_text || d.original_text || d.instruction || '')).join('\n• ');
      chunks.push({
        section: 'diet_nutrition',
        index: chunkIndex++,
        content: `[Dietary, Nutrition & Fluid Guidelines]\n• ${dietLines}`,
        keywords: 'diet nutrition food salt sodium water fluid caffeine hydration alcohol grapefruit meals eating drink'
      });
    }

    // 4. Physical Activity, Walking & Lifting Restrictions Chunk
    if (Array.isArray(structuredData?.exercises) && structuredData.exercises.length > 0) {
      const exLines = structuredData.exercises.map(e => typeof e === 'string' ? e : (e.simplified_text || e.original_text || e.exercise_name || '')).join('\n• ');
      chunks.push({
        section: 'activity_rehab',
        index: chunkIndex++,
        content: `[Physical Activity, Walking, Wound Care & Restrictions]\n• ${exLines}`,
        keywords: 'exercise walking mobility physical therapy lifting restrictions wound dressing shower bathing stairs driving activity rest'
      });
    }

    // 5. Follow-Up Appointments & Diagnostic Tests Chunk
    if (Array.isArray(structuredData?.appointments) && structuredData.appointments.length > 0) {
      const apptLines = structuredData.appointments.map(a => `Doctor/Specialty: ${a.doctor || a.doctor_name || a.specialty} | Timing: ${a.timing || a.appointment_date} | Location: ${a.location || 'Clinic'} | Notes: ${a.notes || ''}`).join('\n• ');
      chunks.push({
        section: 'follow_up_appointments',
        index: chunkIndex++,
        content: `[Scheduled Doctor Follow-Up Appointments & Consultations]\n• ${apptLines}`,
        keywords: 'appointment doctor follow up clinic visit hospital consult suture checkup blood test lab date time'
      });
    }

    // 6. Red Flag Emergency Warnings Chunk
    if (Array.isArray(structuredData?.red_flags) && structuredData.red_flags.length > 0) {
      const rfLines = structuredData.red_flags.map(r => typeof r === 'string' ? r : (r.simplified_text || r.original_text || r.symptom || '')).join('\n• ');
      chunks.push({
        section: 'red_flags_emergencies',
        index: chunkIndex++,
        content: `[CRITICAL RED FLAG WARNINGS & EMERGENCY TRIAGE]\n• ${rfLines}`,
        keywords: 'red flag emergency danger 911 warning chest pain shortness of breath fever swelling bleeding calf clot dvt fainting'
      });
    }

    // 7. Care Roadmap & Milestones Chunk
    if (Array.isArray(structuredData?.care_roadmap) && structuredData.care_roadmap.length > 0) {
      const rmText = structuredData.care_roadmap.map(rm => `Phase: ${rm.phase_name || ''} — Goal: ${rm.goal || rm.focus || ''}`).join('\n• ');
      chunks.push({
        section: 'care_roadmap',
        index: chunkIndex++,
        content: `[Post-Discharge Recovery Roadmap & Milestones]\n• ${rmText}`,
        keywords: 'roadmap milestones week recovery phase progress rehabilitation timeline'
      });
    }

    // 8. Raw Document Chunks if rawText is extensive
    if (rawText && chunks.length < 3) {
      const paragraphs = rawText.split(/\n\s*\n/).filter(p => p.trim().length > 30);
      paragraphs.forEach((p, idx) => {
        chunks.push({
          section: 'raw_notes',
          index: chunkIndex++,
          content: `[Discharge Notes Segment #${idx + 1}]\n${p.trim()}`,
          keywords: p.toLowerCase().replace(/[^a-z0-9 ]/g, ' ').substring(0, 200)
        });
      });
    }

    // Insert all chunks in a transaction
    const insertStmt = db.prepare(`
      INSERT INTO discharge_rag_chunks (
        discharge_id, user_id, section, chunk_index, content, keywords
      ) VALUES (?, ?, ?, ?, ?, ?)
    `);

    const tx = db.transaction((items) => {
      for (const item of items) {
        insertStmt.run(dischargeId, userId, item.section, item.index, item.content, item.keywords);
      }
    });

    tx(chunks);
    console.log(`[CareBridge RAG Engine] Successfully indexed ${chunks.length} clinical chunks for discharge record #${dischargeId}`);
  } catch (err) {
    console.error('[CareBridge RAG Engine Indexing Error]:', err.message);
  }
}

/**
 * Retrieve the most clinically relevant chunks for a patient query
 */
function retrieveRelevantChunks(userId, queryText, topK = 4) {
  try {
    const rawTerms = queryText.toLowerCase().replace(/[^a-z0-9 ]/g, ' ').split(/\s+/).filter(w => w.length > 2);
    
    // Stopwords filter
    const stopWords = new Set(['the', 'and', 'for', 'are', 'what', 'when', 'how', 'can', 'should', 'today', 'with', 'that', 'this', 'you', 'your', 'about', 'from']);
    const queryKeywords = rawTerms.filter(t => !stopWords.has(t));

    // Get all chunks for this patient (or their latest discharge)
    let chunks = db.prepare(`
      SELECT * FROM discharge_rag_chunks 
      WHERE user_id = ? 
      ORDER BY id ASC
    `).all(userId);

    // If no chunks found for this user, check latest active discharge chunks in system
    if (!chunks || chunks.length === 0) {
      chunks = db.prepare(`
        SELECT * FROM discharge_rag_chunks 
        ORDER BY discharge_id DESC, id ASC 
        LIMIT 30
      `).all();
    }

    if (!chunks || chunks.length === 0) {
      return [];
    }

    // Score chunks using TF-IDF / keyword overlap & clinical section weighting
    const scoredChunks = chunks.map(chunk => {
      let score = 0;
      const lowerContent = chunk.content.toLowerCase();
      const lowerKeywords = (chunk.keywords || '').toLowerCase();

      // Section semantic boosts based on query intention
      const queryLower = queryText.toLowerCase();
      if ((queryLower.includes('tablet') || queryLower.includes('medication') || queryLower.includes('pill') || queryLower.includes('dose') || queryLower.includes('drug') || queryLower.includes('take')) && chunk.section === 'medications') {
        score += 3.0;
      }
      if ((queryLower.includes('walk') || queryLower.includes('exercise') || queryLower.includes('shower') || queryLower.includes('lift') || queryLower.includes('drive') || queryLower.includes('run')) && chunk.section === 'activity_rehab') {
        score += 3.0;
      }
      if ((queryLower.includes('eat') || queryLower.includes('food') || queryLower.includes('diet') || queryLower.includes('drink') || queryLower.includes('salt') || queryLower.includes('sodium')) && chunk.section === 'diet_nutrition') {
        score += 3.0;
      }
      if ((queryLower.includes('doctor') || queryLower.includes('appointment') || queryLower.includes('clinic') || queryLower.includes('visit') || queryLower.includes('see')) && chunk.section === 'follow_up_appointments') {
        score += 3.0;
      }
      if ((queryLower.includes('pain') || queryLower.includes('emergency') || queryLower.includes('danger') || queryLower.includes('swelling') || queryLower.includes('er') || queryLower.includes('911') || queryLower.includes('fever')) && chunk.section === 'red_flags_emergencies') {
        score += 3.5;
      }

      // Keyword match scoring
      queryKeywords.forEach(term => {
        if (lowerKeywords.includes(term)) score += 2.0;
        if (lowerContent.includes(term)) score += 1.5;
      });

      return {
        ...chunk,
        score
      };
    });

    // Sort by score descending and take topK
    scoredChunks.sort((a, b) => b.score - a.score);
    const selected = scoredChunks.filter(c => c.score > 0.5).slice(0, topK);

    return selected.length > 0 ? selected : scoredChunks.slice(0, 2);
  } catch (err) {
    console.error('[CareBridge RAG Retrieval Error]:', err.message);
    return [];
  }
}

/**
 * Answer patient question with Retrieval-Augmented Generation (RAG)
 */
async function answerPatientQueryWithRAG(userId, queryText, additionalContext = '') {
  try {
    const relevantChunks = retrieveRelevantChunks(userId, queryText, 4);
    const hasGrounding = relevantChunks.length > 0 && relevantChunks[0].score > 1.0;

    let ragPrompt = '';
    let citations = [];

    if (hasGrounding) {
      const formattedExcerpts = relevantChunks.map((c, i) => {
        const sectionTitle = c.section.replace(/_/g, ' ').toUpperCase();
        citations.push({
          source_id: c.id,
          section: c.section,
          section_title: sectionTitle,
          excerpt: c.content.substring(0, 160) + '...'
        });
        return `[EXCERPT ${i + 1} | SECTION: ${sectionTitle}]\n${c.content}`;
      }).join('\n\n');

      ragPrompt = `
You are CareBridge Clinical RAG Assistant, an empathetic and highly knowledgeable post-hospital recovery companion.

VERIFIED PATIENT DISCHARGE RECORDS (GROUND TRUTH):
=====================================================
${formattedExcerpts}
=====================================================
${additionalContext ? `ACTIVE RECOVERY CONTEXT: ${additionalContext}` : ''}

PATIENT QUESTION: "${queryText}"

CLINICAL RESPONSE GUIDELINES:
1. Ground your response strictly and accurately in the verified discharge excerpts above.
2. Directly reference which section gives this guidance (e.g., "According to your Discharge Medications plan...", "As listed in your Activity & Restrictions section...").
3. If the question asks about something NOT mentioned in their discharge papers, state clearly: "Your uploaded discharge instructions do not specifically mention this." Then provide safe, common-sense clinical guidance and advise checking with their attending doctor.
4. If the question touches on red flag symptoms (severe chest pain, breathing difficulty, acute bleeding), explicitly emphasize emergency protocol (call 911 immediately).
5. Format with neat markdown headings or bullet points. Keep language friendly and simple (8th-grade level).
`;
    } else {
      // General clinical fallback prompt if no specific discharge chunks match
      ragPrompt = `
You are CareBridge Clinical AI Assistant, helping a patient through their post-hospital recovery.
${additionalContext ? `ACTIVE PATIENT CONTEXT: ${additionalContext}` : ''}

PATIENT QUESTION: "${queryText}"

Provide supportive, clear, medically accurate post-discharge recovery guidance. Emphasize medication consistency, rest, proper hydration, and when to seek emergency assistance.
`;
    }

    const aiResponse = await generateGeminiContent({
      prompt: ragPrompt,
      systemInstruction: 'You are CareBridge AI, a clinical post-hospital recovery assistant. Always prioritize patient safety, clarity, and grounded guidance from physician instructions.'
    });

    return {
      success: true,
      reply: aiResponse.text,
      model: aiResponse.model,
      ragGrounded: hasGrounding,
      citations: hasGrounding ? citations : [],
      retrievedCount: relevantChunks.length
    };

  } catch (err) {
    console.error('[CareBridge RAG Generation Error]:', err.message);
    throw err;
  }
}

module.exports = {
  indexDischargeDocument,
  retrieveRelevantChunks,
  answerPatientQueryWithRAG
};
