const { generateGeminiContent } = require('./geminiClient');

/**
 * Knowledge-based fallback responder for clinical questions
 */
function generateClinicalRuleReply(userMessage, taskContext, carePlanSummary) {
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
 * Handle patient chat messages with context awareness using Gemini AI
 */
async function answerPatientQuery({ message, taskContext = '', patientName = 'Patient', carePlanContext = '', conversationHistory = [] }) {
  const systemInstruction = `
You are the CareBridge AI Health Assistant, an empathetic, highly knowledgeable clinical discharge specialist communicating with a discharged patient or their family caregiver.
Patient Name: ${patientName}.

Patient's Active Hospital Discharge Plan:
${carePlanContext || 'No hospital discharge summary uploaded yet.'}

${taskContext ? `The user is specifically inquiring about this selected care task: "${taskContext}"` : ''}

CRITICAL CLINICAL & PREDICTIVE GUIDELINES:
1. DETECT & ASSESS: Identify any reported symptoms (pain, swelling, dizziness, shortness of breath, fever, nausea) or missed medication doses immediately.
2. PREDICT RISKS & INTERACTIONS: Explain what the symptom or timing predicts (e.g. orthostatic hypotension from BP meds, potential fluid retention from missed diuretics, bleeding risks with blood thinners).
3. ACTIONABLE NEXT STEPS: Provide concrete, step-by-step guidance (e.g. sit down, drink water, take with food, monitor daily morning weight).
4. RED FLAGS & TRIAGE: If warning signs, acute chest pressure, dyspnea at rest, syncope, or fever > 101°F are present, firmly direct the patient to contact the clinic or seek immediate emergency care (911).
5. TONE & FORMAT: Warm, clear, reassuring (6th-8th grade reading level). Use bolding and concise bullet points.
`.trim();

  // Call Gemini AI model cascade
  const aiResult = await generateGeminiContent({
    prompt: `Patient/Caregiver Question: "${message}"`,
    systemInstruction,
    model: 'gemini-3.8-flash'
  });

  if (aiResult.success && aiResult.text) {
    return {
      reply: aiResult.text,
      source: aiResult.model || 'gemini-3.8-flash',
      task_context: taskContext || null
    };
  }

  console.warn('[CareBridge AI ChatBot] Gemini call fallback to clinical rule responder:', aiResult.error);
  const fallbackReply = generateClinicalRuleReply(message, taskContext, carePlanContext);
  return {
    reply: fallbackReply,
    source: 'clinical-nlp-fallback',
    task_context: taskContext || null
  };
}

module.exports = {
  answerPatientQuery,
  generateClinicalRuleReply
};
