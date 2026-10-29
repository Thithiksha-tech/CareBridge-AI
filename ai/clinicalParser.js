const { generateGeminiContent } = require('./geminiClient');

// Medical term simplification dictionary for caregiver clarity
const MEDICAL_JARGON_MAP = {
  'ambulate': 'walk around safely',
  'ambulation': 'walking / moving around',
  'ad lib': 'as much as you feel comfortable',
  'npo': 'do not eat or drink anything',
  'po': 'by mouth (swallow)',
  'qd': 'once every day',
  'bid': 'twice every day (about 12 hours apart)',
  'tid': 'three times every day (morning, afternoon, evening)',
  'qid': 'four times every day',
  'prn': 'only as needed when symptoms arise',
  'hs': 'at bedtime',
  'dyspnea': 'shortness of breath or trouble breathing',
  'erythema': 'redness of the skin or wound area',
  'edema': 'swelling or fluid buildup',
  'hypertension': 'high blood pressure',
  'hypotension': 'low blood pressure',
  'tachycardia': 'unusually fast heartbeat',
  'bradycardia': 'unusually slow heartbeat',
  'febrile': 'having a fever',
  'afebrile': 'no fever',
  'hematoma': 'collection of blood / deep bruising',
  'analgesic': 'pain-relief medicine',
  'antipyretic': 'fever-reducing medicine',
  'anticoagulant': 'blood thinner medicine',
  'incision': 'surgical cut / wound',
  'suture': 'stitches',
  'follow-up': 'doctor appointment',
  'f/u': 'follow-up visit',
  'orthostatic': 'dizziness when standing up suddenly',
  'emesis': 'vomiting',
  'syncope': 'fainting or passing out'
};

function simplifyMedicalJargon(text) {
  let simplified = text;
  for (const [jargon, simple] of Object.entries(MEDICAL_JARGON_MAP)) {
    const regex = new RegExp(`\\b${jargon}\\b`, 'gi');
    simplified = simplified.replace(regex, simple);
  }
  return simplified;
}

function validateDischargeStructure(data) {
  if (!data || typeof data !== 'object') {
    throw new Error('AI response must be a valid JSON object.');
  }

  const sections = ['medications', 'dietary_guidelines', 'exercises', 'appointments', 'red_flags', 'care_roadmap'];
  for (const section of sections) {
    if (!Array.isArray(data[section])) data[section] = [];
  }

  let totalInstructions = 0;
  const normalizeItem = (item, prefix, idx) => {
    totalInstructions++;
    return {
      id: item.id || `${prefix}-${idx + 1}`,
      category: item.category || prefix,
      original_text: (item.original_text || item.text || '').trim(),
      simplified_text: (item.simplified_text || item.instructions || item.original_text || '').trim(),
      review_status: item.review_status && ['pending_review', 'confirmed', 'edited', 'rejected'].includes(item.review_status)
        ? item.review_status 
        : 'pending_review',
      edited_text: item.edited_text || null,
      user_notes: item.user_notes || '',
      ...item
    };
  };

  data.medications = data.medications.map((item, idx) => {
    const norm = normalizeItem(item, 'med', idx);
    norm.drug_name = norm.drug_name || norm.name || 'Prescription Medication';
    norm.dosage = norm.dosage || 'As directed';
    norm.frequency = norm.frequency || 'Daily';
    norm.purpose = norm.purpose || 'Post-discharge recovery';
    norm.critical_instructions = norm.critical_instructions || norm.warnings || 'Take as prescribed with water.';
    return norm;
  });

  data.dietary_guidelines = data.dietary_guidelines.map((item, idx) => normalizeItem(item, 'diet', idx));
  data.exercises = data.exercises.map((item, idx) => normalizeItem(item, 'act', idx));
  data.appointments = data.appointments.map((item, idx) => {
    const norm = normalizeItem(item, 'appt', idx);
    norm.provider = norm.provider || norm.doctor || 'Attending Physician';
    norm.specialty = norm.specialty || 'General / Surgical Follow-up';
    norm.timeframe = norm.timeframe || 'Within 7-14 days';
    norm.preparation = norm.preparation || 'Bring current medication list and recovery log.';
    return norm;
  });

  data.red_flags = data.red_flags.map((item, idx) => {
    const norm = normalizeItem(item, 'flag', idx);
    norm.urgency = norm.urgency || (norm.simplified_text.toLowerCase().includes('emergency') || norm.simplified_text.toLowerCase().includes('911') ? 'EMERGENCY' : 'CALL_DOCTOR');
    norm.action_plan = norm.action_plan || 'Contact your doctor or visit the nearest emergency room immediately.';
    return norm;
  });

  data.care_roadmap = data.care_roadmap.map((item, idx) => {
    const norm = normalizeItem(item, 'phase', idx);
    norm.phase_name = norm.phase_name || `Phase ${idx + 1}`;
    norm.focus = norm.focus || 'Recovery & Healing';
    norm.milestones = Array.isArray(norm.milestones) ? norm.milestones : ['Adhere to daily medications', 'Rest adequately'];
    return norm;
  });

  data.review_summary = {
    total_instructions: totalInstructions,
    pending_review: totalInstructions,
    confirmed: 0,
    edited: 0,
    rejected: 0,
    all_reviewed: totalInstructions === 0
  };

  return data;
}

function analyzeWithRuleEngine(rawText) {
  const lines = rawText.split('\n').map(l => l.trim()).filter(Boolean);
  const medications = [];
  const dietary = [];
  const exercises = [];
  const appointments = [];
  const redFlags = [];

  const medRegex = /(mg|mcg|ml|tablet|capsule|pill|po|daily|bid|tid|prn|once daily|twice daily)/i;
  const dietRegex = /(diet|fluid|sodium|salt|water|hydrate|hydration|meal|eat|intake|fasting|npo)/i;
  const exerciseRegex = /(exercise|activity|walk|lifting|weight|bedrest|rest|stairs|drive|driving|physical therapy|wound|dressing)/i;
  const apptRegex = /(follow[- ]?up|appointment|dr\.|clinic|call to schedule|return in|see doctor)/i;
  const flagRegex = /(fever|chest pain|shortness of breath|dyspnea|emergency|call 911|bleeding|redness|swelling|urgent|warning)/i;

  lines.forEach((line) => {
    if (flagRegex.test(line)) {
      redFlags.push({
        original_text: line,
        simplified_text: simplifyMedicalJargon(line) + ' (🚨 Please contact medical team or seek emergency help if this occurs).',
        urgency: /chest pain|911|emergency|severe/i.test(line) ? 'EMERGENCY' : 'CALL_DOCTOR',
        action_plan: 'Contact your primary physician immediately or call emergency medical services (911).'
      });
    } else if (apptRegex.test(line)) {
      appointments.push({
        original_text: line,
        simplified_text: simplifyMedicalJargon(line),
        provider: 'Primary Care / Specialty Clinic',
        specialty: 'Post-Discharge Follow-up',
        timeframe: 'Follow-up within recommended window (typically 7-14 days)',
        preparation: 'Bring discharge paperwork, medication list, and note any new symptoms.'
      });
    } else if (medRegex.test(line)) {
      medications.push({
        drug_name: line.split(/[\d]/)[0].trim() || 'Prescription Medication',
        original_text: line,
        simplified_text: simplifyMedicalJargon(line),
        dosage: (line.match(/\d+\s*(mg|mcg|ml)/i) || ['As directed'])[0],
        frequency: /twice|bid/i.test(line) ? 'Twice daily' : /three|tid/i.test(line) ? 'Three times daily' : 'Once daily',
        purpose: 'Prescribed for safe healing and recovery',
        critical_instructions: 'Take exactly as prescribed with water. Do not stop without consulting doctor.'
      });
    } else if (dietRegex.test(line)) {
      dietary.push({
        original_text: line,
        simplified_text: simplifyMedicalJargon(line),
        category: /water|fluid|hydrate/i.test(line) ? 'hydration' : /avoid|no /i.test(line) ? 'avoid' : 'guideline'
      });
    } else if (exerciseRegex.test(line)) {
      exercises.push({
        original_text: line,
        simplified_text: simplifyMedicalJargon(line),
        category: /no |limit|avoid|restrict/i.test(line) ? 'restriction' : 'exercise'
      });
    }
  });

  if (medications.length === 0) {
    medications.push({
      drug_name: 'Prescribed Recovery Medications',
      original_text: 'Take prescribed medicines per hospital schedule.',
      simplified_text: 'Take all your recovery medications exactly as instructed with a full glass of water.',
      dosage: 'Per bottle label',
      frequency: 'Daily',
      purpose: 'Healing and symptom relief',
      critical_instructions: 'Take with food to protect stomach.'
    });
  }

  if (dietary.length === 0) {
    dietary.push(
      { original_text: 'Fluid intake maintain at 2L daily.', simplified_text: 'Drink 6 to 8 cups of water (2 liters) daily to stay well hydrated.', category: 'hydration' },
      { original_text: 'Low sodium diet (<2g/day).', simplified_text: 'Eat heart-healthy meals with very little salt.', category: 'guideline' }
    );
  }

  if (exercises.length === 0) {
    exercises.push(
      { original_text: 'Ambulate ad lib with assist. No lifting > 10 lbs.', simplified_text: 'Take short walks around the house with a caregiver. Do not lift anything heavy (over 10 lbs).', category: 'restriction' }
    );
  }

  if (appointments.length === 0) {
    appointments.push({
      original_text: 'F/U with doctor in 10-14 days.',
      simplified_text: 'Schedule a visit with your doctor in 10 to 14 days to confirm your healing.',
      provider: 'Attending Physician',
      specialty: 'Clinical Follow-up',
      timeframe: 'In 10-14 days',
      preparation: 'Bring current medication list and symptom log.'
    });
  }

  if (redFlags.length === 0) {
    redFlags.push({
      original_text: 'Call clinic or 911 for temp > 101F, dyspnea, or severe acute pain.',
      simplified_text: 'Call doctor for fever over 101°F or trouble breathing. Go to ER for sudden severe pain.',
      urgency: 'EMERGENCY',
      action_plan: 'Call clinic or emergency services immediately.'
    });
  }

  const careRoadmap = [
    {
      phase_name: 'Phase 1: Days 1 to 3 (Immediate Recovery)',
      focus: 'Rest, Pain Control, & Caregiver Assistance',
      original_text: 'Strict rest; caregiver assistance with mobility.',
      simplified_text: 'Rest in bed as much as possible with caregiver help. Take all medicines on schedule.',
      milestones: ['Rest and recover quietly', 'Keep hydration on track', 'Family caregiver verifies medicine schedule']
    },
    {
      phase_name: 'Phase 2: Days 4 to 7 (Early Healing)',
      focus: 'Gentle Mobility & Incision Monitoring',
      original_text: 'Gradual increase in ambulation; inspect incision daily.',
      simplified_text: 'Begin short walks around the house. Look at your incision/wound daily for redness or swelling.',
      milestones: ['Walk 5-10 minutes every few hours', 'Drink 2L water daily', 'Confirm appointment date']
    },
    {
      phase_name: 'Phase 3: Week 2 and Beyond (Stabilization)',
      focus: 'Doctor Follow-up & Safe Return to Routine',
      original_text: 'Outpatient clinic follow-up; evaluate resumption of normal activity.',
      simplified_text: 'Attend your doctor visit to check healing and receive clearance for daily activities.',
      milestones: ['Complete doctor follow-up', 'Review long-term medication routine', 'Safely resume light routines']
    }
  ];

  return {
    overview: {
      clinical_summary: 'Comprehensive post-hospital recovery plan addressing medications, nutrition, activity, and doctor visits.',
      simplified_summary: 'Here is your simplified recovery checklist. It breaks down your medicines, diet, safe movements, and doctor appointments.'
    },
    medications,
    dietary_guidelines: dietary,
    exercises,
    appointments,
    red_flags: redFlags,
    care_roadmap: careRoadmap
  };
}

async function extractStructuredCarePlan(rawText) {
  const prompt = `
You are CareBridge AI, an expert clinical discharge communication specialist.
Extract and simplify the following hospital discharge paperwork into a validated JSON structure for patients and family caregivers (target reading level: 6th grade).

CRITICAL REQUIREMENTS:
1. Provide BOTH "original_text" (clinical medical wording) AND "simplified_text" (warm, plain-language guidance).
2. For every item, set "review_status": "pending_review".
3. Return valid JSON only with keys:
   - "medications": array with { id, drug_name, dosage, frequency, purpose, original_text, simplified_text, critical_instructions, review_status: "pending_review" }
   - "dietary_guidelines": array with { id, category, original_text, simplified_text, review_status: "pending_review" }
   - "exercises": array with { id, category, original_text, simplified_text, review_status: "pending_review" }
   - "appointments": array with { id, provider, specialty, timeframe, original_text, simplified_text, preparation, review_status: "pending_review" }
   - "red_flags": array with { id, urgency, original_text, simplified_text, action_plan, review_status: "pending_review" }
   - "care_roadmap": array of 3 phases (Days 1-3, Days 4-7, Week 2+) with { id, phase_name, focus, original_text, simplified_text, milestones: string[], review_status: "pending_review" }
   - "overview": { clinical_summary, simplified_summary }

Discharge Paperwork Content:
${rawText}
`;

  const aiResult = await generateGeminiContent({
    prompt,
    model: 'gemini-3.8-flash',
    jsonMode: true
  });

  if (aiResult.success && aiResult.text) {
    try {
      let cleaned = aiResult.text.trim();
      // Remove any markdown formatting block fences if present
      if (cleaned.startsWith('```json')) {
        cleaned = cleaned.replace(/^```json\s*/i, '').replace(/\s*```$/i, '');
      } else if (cleaned.startsWith('```')) {
        cleaned = cleaned.replace(/^```\s*/i, '').replace(/\s*```$/i, '');
      }

      const firstBrace = cleaned.indexOf('{');
      const lastBrace = cleaned.lastIndexOf('}');
      if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
        cleaned = cleaned.substring(firstBrace, lastBrace + 1);
      }

      const parsed = JSON.parse(cleaned);
      const structured = validateDischargeStructure(parsed);
      structured.source = aiResult.model || 'gemini-3.8-flash';
      return structured;
    } catch (parseErr) {
      console.warn('[CareBridge AI Parser] JSON parse error from Gemini, using rule engine:', parseErr.message);
    }
  }

  // Fallback engine
  const ruleResult = analyzeWithRuleEngine(rawText);
  ruleResult.source = 'clinical-nlp-fallback';
  return validateDischargeStructure(ruleResult);
}

module.exports = {
  extractStructuredCarePlan,
  validateDischargeStructure,
  simplifyMedicalJargon
};
