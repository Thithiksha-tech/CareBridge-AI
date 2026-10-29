const path = require('path');

let GoogleGenAI;
try {
  GoogleGenAI = require('@google/genai').GoogleGenAI;
} catch (e1) {
  try {
    const genaiPath = require.resolve('@google/genai', { paths: [path.join(__dirname, '../backend')] });
    GoogleGenAI = require(genaiPath).GoogleGenAI;
  } catch (e2) {
    GoogleGenAI = require(path.join(__dirname, '../backend/node_modules/@google/genai')).GoogleGenAI;
  }
}

// Search across standard environment locations (.env, backend/.env, env/.env)
try {
  const fs = require('fs');
  const envCandidates = [
    path.resolve(process.cwd(), '.env'),
    path.resolve(__dirname, '../.env'),
    path.resolve(__dirname, '../backend/.env'),
    path.resolve(__dirname, '../env/.env')
  ];
  for (const envPath of envCandidates) {
    if (fs.existsSync(envPath)) {
      require('dotenv').config({ path: envPath });
    }
  }
} catch (err) {
  // Ignored if dotenv not found or already loaded
}

function getCandidateApiKeys() {
  const keys = [];
  if (process.env.GEMINI_API_KEY) {
    keys.push(process.env.GEMINI_API_KEY.trim());
  }
  if (process.env.GEMINI_BACKUP_API_KEY) {
    keys.push(process.env.GEMINI_BACKUP_API_KEY.trim());
  }
  if (process.env.GEMINI_FALLBACK_API_KEY) {
    keys.push(process.env.GEMINI_FALLBACK_API_KEY.trim());
  }
  try {
    const db = require('../database');
    const row = db.prepare("SELECT value FROM system_settings WHERE key = 'gemini_api_key'").get();
    if (row && row.value && row.value.trim().length > 10) {
      keys.push(row.value.trim());
    }
  } catch (e) {
    // Database query failed or table not ready
  }
  return [...new Set(keys.filter(k => k && k.length > 10))];
}

function getApiKey() {
  const candidates = getCandidateApiKeys();
  return candidates[0] || process.env.GEMINI_API_KEY || '';
}

function getGeminiClient(keyToUse = null) {
  const apiKey = keyToUse || getApiKey();
  return new GoogleGenAI({ apiKey });
}

/**
 * Execute Gemini model call with automatic multi-model and multi-key cascade
 */
async function generateGeminiContent({ prompt, contents, systemInstruction = '', model = 'gemini-3.8-flash', jsonMode = false }) {
  const preferredModel = process.env.GEMINI_MODEL || model || 'gemini-3.8-flash';
  const modelCascade = [
    preferredModel,
    'gemini-3.6-flash',
    'gemini-3.5-flash',
    'gemini-3.1-flash-lite'
  ].filter((m, idx, arr) => arr.indexOf(m) === idx);

  const candidateKeys = getCandidateApiKeys();
  let lastError = null;

  for (const apiKey of candidateKeys) {
    let keyDepleted = false;

    for (const targetModel of modelCascade) {
      if (keyDepleted) break;

      try {
        const ai = getGeminiClient(apiKey);
        const config = {};
        if (systemInstruction) config.systemInstruction = systemInstruction;
        if (jsonMode) config.responseMimeType = 'application/json';

        const callPromise = ai.models.generateContent({
          model: targetModel,
          contents: contents || prompt,
          config
        });

        // Timeout: 8 seconds
        const timeoutMs = parseInt(process.env.GEMINI_TIMEOUT_MS, 10) || 8000;
        const timeoutPromise = new Promise((_, reject) => {
          const timer = setTimeout(() => {
            reject(new Error(`Model ${targetModel} timed out after ${timeoutMs}ms`));
          }, timeoutMs);
          if (timer.unref) timer.unref();
        });

        const response = await Promise.race([callPromise, timeoutPromise]);

        if (response && response.text && response.text.trim().length > 0) {
          return {
            success: true,
            text: response.text.trim(),
            model: targetModel
          };
        }
      } catch (error) {
        lastError = error;
        const errMsg = error.message || '';
        if (errMsg.includes('402') || errMsg.includes('credits are depleted') || errMsg.includes('API_KEY_INVALID')) {
          console.warn(`[CareBridge AI Engine] Key ending in ...${apiKey.substring(apiKey.length - 4)} reported depleted credits/invalid. Switching key.`);
          keyDepleted = true;
          break;
        }
        console.warn(`[CareBridge AI Engine] Model ${targetModel} notice (${errMsg.substring(0, 80)}). Trying next candidate in cascade...`);
      }
    }
  }

  console.warn(`[CareBridge AI Engine] All Gemini cascade models and keys exhausted (${lastError?.message}). Falling back to rule engine.`);
  return {
    success: false,
    error: lastError?.message || 'Gemini model cascade failed'
  };
}

module.exports = {
  getApiKey,
  getGeminiClient,
  generateGeminiContent
};
