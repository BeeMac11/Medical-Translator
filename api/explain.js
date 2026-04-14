// Vercel Serverless Function — sits between your browser and Anthropic API
// Single API call with auto-retry for overloaded errors

const COMBINED_PROMPT = `You explain medical reports to patients in plain English. 
First detect if this is an imaging report (CT, MRI, X-ray, PET, ultrasound) or blood work / lab results, then explain it.

For IMAGING reports return this exact JSON:
{"reportType":"imaging","scanType":"string","summary":"string","findings":[{"term":"string","plain":"string","context":"string","flag":"normal","resources":[{"name":"string","url":"string","description":"string"}]}],"questions":["string"]}
flag must be: "normal", "monitor", or "attention". Include 1-2 real URLs from mayoclinic.org or medlineplus.gov per finding.

For BLOOD WORK reports return this exact JSON:
{"reportType":"bloodwork","panelName":"string","summary":"string","findings":[{"test":"string","value":"string","referenceRange":"string","flag":"NORMAL","plain":"string","meaning":"string","possibleCauses":[{"cause":"string","explanation":"string"}],"resources":[{"name":"string","url":"string","description":"string"}]}],"questions":["string"]}
flag must be: "NORMAL", "HIGH", or "LOW". For NORMAL: possibleCauses:[], resources:[]. For HIGH/LOW: include meaning, 2-3 possibleCauses, 1-2 real URLs from mayoclinic.org or medlineplus.gov.

For "questions": generate 3-5 questions the PATIENT should ask THEIR DOCTOR at their next appointment. Example: "Should I see a specialist about these results?"

Return ONLY valid JSON. No markdown, no extra text. Never diagnose.`;

function tryJSON(text) {
  try { return JSON.parse(text); } catch (_) {}
  const s = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/i, '').trim();
  try { return JSON.parse(s); } catch (_) {}
  let d = 0, st = -1;
  for (let i = 0; i < text.length; i++) {
    if (text[i] === '{') { if (d === 0) st = i; d++; }
    else if (text[i] === '}') { d--; if (d === 0 && st !== -1) { try { return JSON.parse(text.slice(st, i + 1)); } catch (_) { st = -1; } } }
  }
  return null;
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function claudeCall(userText) {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': process.env.ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 4000,
      system: COMBINED_PROMPT,
      messages: [{ role: 'user', content: 'Explain this medical report:\n\n' + userText }],
    }),
  });
  const data = await res.json();
  if (!res.ok) {
    const errorType = data?.error?.type || '';
    if (errorType === 'overloaded_error') throw new Error('OVERLOADED');
    if (errorType === 'authentication_error') throw new Error('AUTH_ERROR');
    if (errorType === 'rate_limit_error') throw new Error('RATE_LIMIT');
    throw new Error('SERVER_ERROR');
  }
  return data.content[0].text;
}

async function claudeCallWithRetry(userText, maxRetries = 2) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await claudeCall(userText);
    } catch (err) {
      if (err.message === 'OVERLOADED' && attempt < maxRetries) {
        // Wait 5 seconds then retry automatically
        await sleep(5000);
        continue;
      }
      throw err;
    }
  }
}

function getFriendlyError(code) {
  switch(code) {
    case 'OVERLOADED':
      return 'The service is temporarily busy. Please wait 30 seconds and try again.';
    case 'AUTH_ERROR':
      return 'There is a configuration issue with the app. Please contact support.';
    case 'RATE_LIMIT':
      return 'Too many requests right now. Please wait a minute and try again.';
    default:
    