/**
 * وسيط آمن لطلبات Gemini على Vercel.
 * المفتاح يُقرأ من متغير البيئة GEMINI_API_KEY ولا يظهر في المتصفح.
 */

const ALLOWED_MODELS = new Set([
  'gemini-2.5-flash',
  'gemini-2.5-flash-lite',
  'gemini-2.5-flash-image',
  'gemini-3.1-flash-image',
  'gemini-3-pro-image'
]);

module.exports = async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');

  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    res.status(501).json({ error: 'GEMINI_API_KEY is not configured' });
    return;
  }

  const { model, payload } = req.body || {};
  if (!model || !ALLOWED_MODELS.has(model) || !payload || typeof payload !== 'object') {
    res.status(400).json({ error: 'Invalid request' });
    return;
  }

  try {
    const upstream = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': apiKey
        },
        body: JSON.stringify(payload)
      }
    );

    const body = await upstream.text();
    res.status(upstream.status);
    res.setHeader('Content-Type', 'application/json');
    res.send(body);
  } catch (error) {
    res.status(502).json({ error: 'Upstream request failed' });
  }
};