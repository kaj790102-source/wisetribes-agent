require('dotenv').config();
const axios = require('axios');

const GROQ_BASE = 'https://api.groq.com/openai/v1';

const MODELS = {
  'llama-3.3-70b-versatile': { name: 'Llama 3.3 70B', context: 131072, speed: 'fastest' },
  'llama-3.1-8b-instant': { name: 'Llama 3.1 8B', context: 131072, speed: 'fast' },
  'mixtral-8x7b-32768': { name: 'Mixtral 8x7B', context: 32768, speed: 'fast' },
  'llama-3.2-1b-preview': { name: 'Llama 3.2 1B', context: 131072, speed: 'fastest' },
  'llama-3.2-3b-preview': { name: 'Llama 3.2 3B', context: 131072, speed: 'fast' }
};

const DEFAULT_MODEL = 'llama-3.3-70b-versatile';

async function complete(options) {
  const {
    model = DEFAULT_MODEL,
    messages,
    system,
    max_tokens = 2000,
    temperature = 0.7
  } = options;

  if (!process.env.GROQ_API_KEY) {
    throw new Error('GROQ_API_KEY not configured');
  }

  const systemMsg = system ? { role: 'system', content: system } : null;
  const formattedMessages = systemMsg
    ? [systemMsg, ...messages]
    : messages;

  // Retry logic for rate limits
  const maxRetries = 5;
  let lastError;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const response = await axios.post(
        `${GROQ_BASE}/chat/completions`,
        {
          model,
          messages: formattedMessages,
          max_tokens,
          temperature,
          response_format: undefined
        },
        {
          headers: {
            'Authorization': `Bearer ${process.env.GROQ_API_KEY}`,
            'Content-Type': 'application/json'
          },
          timeout: 60000
        }
      );

      return {
        content: response.data.choices?.[0]?.message?.content || '',
        usage: response.data.usage,
        model: response.data.model,
        provider: 'groq'
      };
    } catch (err) {
      const errorData = err.response?.data?.error;
      const errorMsg = errorData?.message || err.message;
      
      // Check for rate limit
      if (errorData?.type === 'rate_limit_exceeded') {
        const retryAfter = errorData?.retry_details?.retry_after_ms || 3000;
        console.log(`[Groq] Rate limited. Waiting ${Math.ceil(retryAfter/1000)}s... (attempt ${attempt + 1}/${maxRetries})`);
        await sleep(Math.max(retryAfter, 3000));
        lastError = errorMsg;
        continue;
      }
      
      throw new Error(`Groq API error: ${errorMsg}`);
    }
  }
  
  throw new Error(`Groq API error after ${maxRetries} retries: ${lastError}`);
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function listModels() {
  return Object.entries(MODELS).map(([id, info]) => ({ id, ...info }));
}

function getModelInfo(modelId) {
  return MODELS[modelId] || MODELS[DEFAULT_MODEL];
}

module.exports = { complete, listModels, getModelInfo, MODELS };
