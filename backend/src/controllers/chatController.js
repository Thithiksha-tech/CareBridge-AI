const { GoogleGenAI } = require('@google/genai');
const db = require('../config/db');
require('dotenv').config();

/**
 * Knowledge-based fallback responder for clinical questions
 */
function generateClinicalRuleReply(userMessage, taskContext, carePlan) {
  const msg = userMessage.toLowerCase();
  
  if (taskContext) {
    if (msg.includes('food') || msg.includes('empty stomach') || msg.includes('eat')) {
      return `Regarding **${taskContext}**: It is generally recommended to take medications with food or after a light meal unless specifically instructed otherwise, as this minimizes stomach discomfort and helps your body absorb the medicine smoothly. Please avoid alcohol and check the label for any specific timing.`;
    }
    if (msg.includes('safe') || msg.includes('pain') || msg.includes('exercise') || msg.includes('walk')) {
      return `For **${taskContext}**: Always listen to your body. Recovery is a gradual process. Begin with short, assisted movements (5 to 10 minutes) on level surfaces. If you feel any sharp pain, dizziness, or shortness of breath, stop immediately, sit down, and rest.`;
    }
    if (msg.includes('miss') || msg.includes('forgot') || msg.includes('late')) {
      return `If you missed a dose or task for **${taskContext}**: Take it as soon as you remember, unless it is almost time for your next scheduled dose. Never double up on pills. If you are unsure, call your clinic nurse.`;
    }
    return `Regarding your selected task (**${taskContext}**): This is an essential part of your recovery roadmap. Follow the instructions provided in your discharge summary closely, keep a log of your progress, and have a family caregiver assist you if needed.`;
  }

  // General questions
  if (msg.includes('fever') || msg.includes('temperature') || msg.includes('101')) {
    return `🚨 **Clinical Warning:** A fever above 101°F (38.3°C) after hospital discharge can be an early sign of infection. Please contact your doctor's clinic immediately. If accompanied by shortness of breath or acute chest discomfort, seek emergency medical care.`;
  }

  if (msg.includes('appointment') || msg.includes('doctor') || msg.includes('when')) {
    return `📅 Regular follow-up appointments are vital to confirm your recovery progress, check your vitals, and adjust medication dosages. You can view your scheduled doctor visits in the **Doctor Appointments** section of your dashboard. Always bring your medication list and any recorded symptom logs.`;
  }

  if (msg.includes('water') || msg.includes('hydration') || msg.includes('drink')) {
    return `💧 Proper hydration supports kidney function, helps metabolize medications, and prevents dizziness when standing. Unless your doctor has placed you on a strict fluid restriction, aim for about 6 to 8 cups (1.5 to 2 liters) of water spaced evenly throughout the day.`;
  }

  if (msg.includes('diet') || msg.includes('salt') || msg.includes('sodium')) {
    return `🥗 Heart-healthy nutrition with low sodium (< 2,000 mg/day) reduces strain on your cardiovascular system and prevents fluid retention (edema). Focus on fresh vegetables, lean proteins, and avoid canned or processed foods.`;
  }

  return `I am here to help you understand your discharge instructions and care tasks. You can select any task from your checklist to ask detailed questions, or ask about medications, diet, exercises, and doctor appointments. How is the patient feeling right now?`;
}

/**
 * Handle patient chat messages with context awareness
 */
async function sendMessage(req, res) {
  try {
    const userId = req.user.id;
    const { message, task_context, context, discharge_id } = req.body;
    const resolvedContext = task_context || (typeof context === 'string' ? context : (context ? JSON.stringify(context) : ''));

    if (!message || message.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Message cannot be empty.'
      });
    }

    // Retrieve active discharge record for patient context
    let carePlanSummary = '';
    const latestDischarge = db.prepare(`
      SELECT structured_data, ai_summary, original_filename
      FROM discharge_records
      WHERE user_id = ?
      ORDER BY created_at DESC
      LIMIT 1
    `).get(userId);

    if (latestDischarge && latestDischarge.structured_data) {
      try {
        const parsed = JSON.parse(latestDischarge.structured_data);
        carePlanSummary = `
Patient Care Plan:
- Medications: ${(parsed.medications || []).map(m => `${m.drug_name} (${m.dosage}, ${m.frequency})`).join('; ')}
- Diet: ${(parsed.dietary_guidelines || []).map(d => d.simplified_text).join('; ')}
- Exercises: ${(parsed.exercises || []).map(e => e.simplified_text).join('; ')}
- Appointments: ${(parsed.appointments || []).map(a => `${a.provider} (${a.timeframe})`).join('; ')}
- Red Flags: ${(parsed.red_flags || []).map(f => f.simplified_text).join('; ')}
        `.trim();
      } catch (e) {
        carePlanSummary = latestDischarge.ai_summary || '';
      }
    }

    // Save user message to database
    db.prepare(`
      INSERT INTO chat_messages (user_id, discharge_id, role, message, task_context)
      VALUES (?, ?, 'user', ?, ?)
    `).run(userId, discharge_id || null, message.trim(), resolvedContext || null);

    // Call RAG-augmented Gemini Clinical Engine
    let assistantResponse = '';
    let aiSource = 'gemini-3.8-flash-rag';
    let ragGrounded = false;
    let citations = [];

    try {
      const { answerPatientQueryWithRAG } = require('../../../ai/ragEngine');
      const ragResult = await answerPatientQueryWithRAG(userId, message.trim(), resolvedContext || carePlanSummary);
      if (ragResult && ragResult.reply) {
        assistantResponse = ragResult.reply;
        aiSource = ragResult.model || 'gemini-3.8-flash-rag';
        ragGrounded = ragResult.ragGrounded;
        citations = ragResult.citations || [];
      }
    } catch (ragErr) {
      console.warn('[CareBridge RAG Notice]:', ragErr.message);
    }

    if (!assistantResponse) {
      const aiModule = require('../../../ai');
      const fallbackResult = await aiModule.answerPatientQuery({
        message: message.trim(),
        taskContext: resolvedContext || '',
        patientName: req.user.full_name || req.user.username,
        carePlanContext: carePlanSummary
      });
      assistantResponse = fallbackResult.reply;
      aiSource = fallbackResult.source;
    }

    // Save assistant response
    db.prepare(`
      INSERT INTO chat_messages (user_id, discharge_id, role, message, task_context)
      VALUES (?, ?, 'assistant', ?, ?)
    `).run(userId, discharge_id || null, assistantResponse, task_context || null);

    return res.status(200).json({
      success: true,
      reply: assistantResponse,
      task_context: task_context || null,
      source: aiSource,
      rag_grounded: ragGrounded,
      citations
    });

  } catch (error) {
    console.error('[CareBridge Chat Error]:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to process chat message.',
      error: error.message
    });
  }
}

/**
 * Dedicated RAG document search and grounded answering endpoint
 */
async function queryRAGDocument(req, res) {
  try {
    const userId = req.user.id;
    const { query, question } = req.body;
    const resolvedQuery = (query || question || '').trim();

    if (!resolvedQuery) {
      return res.status(400).json({ success: false, message: 'Query is required.' });
    }

    const { answerPatientQueryWithRAG, retrieveRelevantChunks } = require('../../../ai/ragEngine');
    const relevantChunks = retrieveRelevantChunks(userId, resolvedQuery, 4);
    const ragResult = await answerPatientQueryWithRAG(userId, resolvedQuery);

    return res.status(200).json({
      success: true,
      query: resolvedQuery,
      reply: ragResult.reply,
      source: ragResult.model,
      rag_grounded: ragResult.ragGrounded,
      citations: ragResult.citations || [],
      chunks: relevantChunks.map(c => ({
        section: c.section,
        score: c.score,
        content: c.content
      }))
    });
  } catch (err) {
    console.error('[CareBridge RAG Query Error]:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
}

/**
 * Get recent chat history
 */
function getChatHistory(req, res) {
  try {
    const userId = req.user.id;
    const messages = db.prepare(`
      SELECT id, role, message, task_context, created_at
      FROM chat_messages
      WHERE user_id = ?
      ORDER BY created_at ASC
      LIMIT 50
    `).all(userId);

    return res.status(200).json({
      success: true,
      messages
    });
  } catch (error) {
    console.error('[CareBridge Chat History Error]:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve chat history.',
      error: error.message
    });
  }
}

/**
 * Clear chat history
 */
function clearChatHistory(req, res) {
  try {
    const userId = req.user.id;
    db.prepare('DELETE FROM chat_messages WHERE user_id = ?').run(userId);
    return res.status(200).json({
      success: true,
      message: 'Chat history cleared.'
    });
  } catch (error) {
    console.error('[CareBridge Clear Chat Error]:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to clear chat history.',
      error: error.message
    });
  }
}

module.exports = {
  sendMessage,
  queryRAGDocument,
  getChatHistory,
  clearChatHistory
};
