
// Vercel Serverless Function — sits between your browser and Anthropic API
// This is what fixes the CORS error. Your API key stays safe on the server.

const IMAGING_PROMPT = `You explain radiology reports to patients in plain English. Return ONLY a valid JSON object, no other text, no markdown fences.
Schema: {"reportType":"imaging","scanType":"string","summary":"string","findings":[{"term":"string","plain":"string","context":"string","flag":"normal","resources":[{"name":"string","url":"string","description":"string"}]}],"questions":["string"]}
flag must be: "normal", "monitor", or "attention". Include 1-2 real URLs from mayoclinic.org or medlineplus.gov per finding. Never diagnose.
For "questions": generate 3-5 questions the PATIENT should ask THEIR DOCTOR at their next appointment about these findings. These are questions for the doctor, not questions asking the patient for more information. Example: "What does the pulmonary nodule mean for my long-term health?" or "Should I see a specialist about these results?".`;

const BLOODWORK_PROMPT = `You explain blood test results to patients in plain English. Return ONLY a valid JSON object, no other text, no markdown fences.
Schema: {"reportType":"bloodwork","panelName":"string","summary":"string","findings":[{"test":"string","value":"string","referenceRange":"string","flag":"NORMAL","plain":"string","meaning":"string","possibleCauses":[{"cause":"string","explanation":"string"}],"resources":[{"name":"string","url":"string","description":"string"}]}],"questions":["string"]}
flag must be: "NORMAL", "HIGH", or "LOW". For NORMAL: possibleCauses:[], resources:[]. For HIGH/LOW: include meaning, 2-3 possibleCauses, 1-2 real URLs. Never diagnose.
For "questions": generate 3-5 questions the PATIENT should ask THEIR DOCTOR at their next appointment about these results. These are questions for the doctor, not questions asking the patient for more information. Example: "Should I change my diet to lower my glucose?" or "Do these results mean I need to see a specialist?".`;

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

async function claudeCall(system, userText) {
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
      system,
      messages: [{ role: 'user', content: userText }],
    }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error('Anthropic API error: ' + JSON.stringify(data));
  return data.content[0].text;
}

export default async function handler(req, res) {
  // Allow requests from your frontend
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { reportText } = req.body;
  if (!reportText || reportText.trim().length < 10) {
    return res.status(400).json({ error: 'No report text provided' });
  }

  try {
    // Step 1: Detect report type
    const typeRaw = await claudeCall(
      'Reply with one word only: imaging or bloodwork',
      reportText.slice(0, 500)
    );
    const isBW = typeRaw.toLowerCase().includes('blood');

    // Step 2: Explain findings
    const raw = await claudeCall(
      isBW ? BLOODWORK_PROMPT : IMAGING_PROMPT,
      'Explain this medical report:\n\n' + reportText
    );

    const parsed = tryJSON(raw);
    if (!parsed || !parsed.summary || !Array.isArray(parsed.findings)) {
      return res.status(500).json({ error: 'Could not parse AI response. Please try again.' });
    }

    return res.status(200).json(parsed);
  } catch (err) {
    return res.status(500).json({ error: err.message || 'Server error' });
  }
}
