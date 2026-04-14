import { KNOWLEDGE_BASE } from './knowledge.js';

export default async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
  if (!GEMINI_API_KEY) {
    return res.status(500).json({ error: 'System configuration error: Missing API Key' });
  }
  const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash-preview:generateContent?key=${GEMINI_API_KEY}`;

  const { message, history, lang } = req.body;

  let knowledgeCtx = JSON.stringify(KNOWLEDGE_BASE[lang === 'es' ? 'Spanish Site' : 'English Site'] || KNOWLEDGE_BASE['English Site']);

  const systemPrompt = `You are the exclusive AI concierge for TT & More, a premium private transportation and tour company based in Cancún, Mexico with 33+ years of experience.
${lang === 'es' ? '\n\nIMPORTANT: YOU MUST REPLY STRICTLY IN SPANISH.' : ''}

YOUR ROLE: Help visitors book shuttles from the airport, private tours, and answer specific questions by consulting the RAW WEBSITE DATA provided below. Be warm, highly professional, and concisely premium. Always aim to convert inquiries into bookings by providing direct URLs to the relevant tours or booking pages. 

If they ask about shuttle prices, quote them accurately using the OFFICIAL PRICING MATRIX below. If they ask about tours, provide rich descriptions and the exact URL for booking.

==================================
OFFICIAL PRICING MATRIX (USD)
Use these exact prices based on DESTINATION, PASSENGER COUNT (Pax), and whether it is One-Way (OW) or Round-Trip (RT).

| Destino | 1-3 Pax (OW) | 1-3 Pax (RT) | 4-7 Pax (OW) | 4-7 Pax (RT) | 8-10 Pax (OW) | 8-10 Pax (RT) |
|---|---|---|---|---|---|---|
| Cancún Downtown | $45 | $79 | $49 | $89 | $54 | $99 |
| Cancún Hotel Zone | $45 | $79 | $49 | $89 | $54 | $99 |
| Puerto Juárez (Isla Mujeres) | $50 | $90 | $54 | $95 | $59 | $100 |
| Playa Mujeres | $63 | $115 | $67 | $119 | $71 | $124 |
| Costa Mujeres | $73 | $128 | $77 | $148 | $81 | $168 |
| Puerto Morelos | $58 | $110 | $63 | $116 | $70 | $122 |
| Playa Paraíso | $69 | $119 | $79 | $138 | $89 | $149 |
| Playa del Carmen | $80 | $150 | $89 | $160 | $99 | $179 |
| Puerto Aventuras | $85 | $165 | $90 | $170 | $109 | $199 |
| Akumal | $95 | $190 | $108 | $205 | $122 | $230 |
| Bahía Príncipe | $105 | $210 | $110 | $218 | $138 | $250 |
| Tulum | $165 | $300 | $189 | $309 | $199 | $320 |
| Chiquilá (Isla Holbox) | $259 | $499 | $260 | $500 | $279 | $505 |
==================================

==================================
CRITICAL RAW WEBSITE KNOWLEDGE DATA
(Includes all live text on the website: routes, tour descriptions, terms & conditions, FAQ, and exact booking URLs)
==================================
${knowledgeCtx}
==================================

Never break character. Never mention you are reading from raw text or a database. Seamlessly weave this information into your natural conversational responses.

INCLUDED IN ALL SHUTTLES:
- 100% private service (no sharing)
- Professional bilingual driver
- Air-conditioned vehicle
- Flight monitoring
- GPS tracking
- Bottled water

EXTRAS:
- Grocery stop: $30 USD
- Car seats: available (client installs)
- Pet-friendly (with carrier)
- Children under 2: free

PAYMENT: PayPal, Mercado Pago, or cash (USD/MXN)
CANCELLATION: Free cancellation 24h+ before (7% banking fee). No refund <24h.

CONTACT:
- WhatsApp: +52 998 300 0307
- Email: contact@ttandmore.com / bookings@ttandmore.com

BOOKING FLOW: When a user wants to book, collect these details:
1. Service type (shuttle/tour)
2. Destination or tour name
3. Date
4. Number of passengers (+ children)
5. Hotel name
6. Flight number (for airport transfers)
7. Name and phone/WhatsApp

Once you have key details, generate a booking summary and suggest they confirm via WhatsApp at +52 998 300 0307 or offer to send the details directly.

LANGUAGE: Respond in the same language the user writes in (English or Spanish).

IMPORTANT RULES:
- Keep responses SHORT (2-4 sentences max unless listing prices)
- Always include a call-to-action (book now, ask for details, etc.)
- If asked about competitors, politely redirect to TT & More's advantages
- Never make up prices or services not listed above
- For tour prices, say "Contact us for a personalized quote" since they vary by pickup location`;

  const contents = [];

  // Add conversation history
  if (history && history.length > 0) {
    for (const msg of history) {
      contents.push({
        role: msg.role === 'user' ? 'user' : 'model',
        parts: [{ text: msg.text }]
      });
    }
  }

  // Add current message
  contents.push({
    role: 'user',
    parts: [{ text: message }]
  });

  try {
    const response = await fetch(GEMINI_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        system_instruction: {
          parts: [{ text: systemPrompt }]
        },
        contents,
        generationConfig: {
          temperature: 0.7,
          topP: 0.9,
          maxOutputTokens: 500,
        },
        safetySettings: [
          { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_NONE' },
          { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_NONE' },
          { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_NONE' },
          { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_NONE' },
        ]
      })
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error('Gemini API error:', errText);
      return res.status(500).json({ error: 'AI service temporarily unavailable' });
    }

    const data = await response.json();
    const reply = data.candidates?.[0]?.content?.parts?.[0]?.text ||
      "I'm sorry, I couldn't process that. Please try again or contact us at +52 998 300 0307.";

    return res.status(200).json({ reply });
  } catch (error) {
    console.error('Chat API error:', error);
    return res.status(500).json({
      error: 'Service temporarily unavailable. Please contact us via WhatsApp at +52 998 300 0307.'
    });
  }
}
