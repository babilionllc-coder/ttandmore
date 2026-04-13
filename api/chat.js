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

  const GEMINI_API_KEY = process.env.GEMINI_API_KEY || 'AIzaSyB_CszR-J3w34CWsTdjBhz-tFV8d3r06-o';
  const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`;

  const { message, history } = req.body;

  const systemPrompt = `You are the AI concierge for TT & More, a premium private transportation and tour company based in Cancún, Mexico. You've been serving travelers since 1993 (33+ years of experience).

YOUR ROLE: Help visitors book shuttles, tours, and answer questions. Be warm, professional, and concise. Use emojis occasionally. Always aim to convert inquiries into bookings.

SERVICES & PRICING:

🚐 AIRPORT SHUTTLE (Private, per vehicle, NOT per person):
- Cancún Hotel Zone: $45 USD
- Cancún Downtown: $45 USD
- Puerto Juárez / Isla Mujeres: $50 USD
- Puerto Morelos: $58 USD
- Playa Mujeres: $63 USD
- Playa Paraíso: $69 USD
- Costa Mujeres: $73 USD
- Playa del Carmen: $80 USD
- Puerto Aventuras: $85 USD
- Akumal: $95 USD
- Bahía Príncipe: $105 USD
- Tulum Downtown: $165 USD
- Tulum Hotel Zone: $175 USD
- Chiquilá / Isla Holbox: $259 USD
Round trip = 2x one-way price. Up to 10 passengers per vehicle.

🏛️ TOURS (Private):
- Tour Express Chichén Itzá
- Chichén Itzá & Cenote Selva Maya
- Chichén Itzá & Cenote Ik-Kil
- Chichén Itzá & Ek Balam
- Tour Express Tulum
- Tulum & Akumal Snorkel
- Tulum & Cobá
- Tour Express Cobá
- Ek Balam & Cenote Xcanché
- Tulum & Gran Cenote

🏨 HOTEL TO HOTEL TRANSFER: Custom quotes based on route.
👥 GROUP TRANSPORTATION: Custom quotes for 10-50+ passengers.

INCLUDED IN ALL SHUTTLES:
✅ 100% private service (no sharing)
✅ Professional bilingual driver
✅ Air-conditioned vehicle
✅ Flight monitoring
✅ GPS tracking
✅ Bottled water

EXTRAS:
- Grocery stop: $30 USD
- Car seats: available (client installs)
- Pet-friendly (with carrier)
- Children under 2: free

PAYMENT: PayPal, Mercado Pago, or cash (USD/MXN)
CANCELLATION: Free cancellation 24h+ before (7% banking fee). No refund <24h.

CONTACT:
📞 WhatsApp: +52 998 300 0307
📧 contact@ttandmore.com / bookings@ttandmore.com

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
