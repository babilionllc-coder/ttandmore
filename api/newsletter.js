/**
 * TT & More — Monthly Newsletter API
 *
 * POST /api/newsletter — Creates and optionally sends a Brevo email campaign
 *
 * Body:
 *   { month, year, highlights[], featuredTour, promoCode?, promoDiscount?, send: true|false }
 *
 * If send=false (default), creates a draft campaign in Brevo that can be reviewed.
 * If send=true, schedules the campaign for immediate delivery.
 *
 * Sends to Brevo list 2 (TT&More Clients - All Bookings).
 */

const BREVO_KEY = process.env.BREVO_API_KEY || process.env.brevo_api_key;
const BREVO_URL = 'https://api.brevo.com/v3';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });

  if (!BREVO_KEY) {
    return res.status(500).json({ error: 'BREVO_API_KEY not configured' });
  }

  try {
    const {
      month = new Date().toLocaleString('en', { month: 'long' }),
      year = new Date().getFullYear(),
      highlights = [],
      featuredTour = 'chichen-itza-tour',
      promoCode = '',
      promoDiscount = '',
      send = false,
    } = req.body || {};

    const subject = `${month} ${year} — What's New in Cancún | TT & More`;
    const htmlContent = buildNewsletter({
      month, year, highlights, featuredTour, promoCode, promoDiscount,
    });

    // Create campaign in Brevo
    const campaignPayload = {
      name: `Newsletter ${month} ${year}`,
      subject,
      htmlContent,
      sender: { name: 'TT & More', email: 'info@jegodigital.com' },
      replyTo: 'contact@ttandmore.com',
      recipients: { listIds: [2] }, // TT&More Clients list
      // inlineImageActivation omitted — we use external image URLs
    };

    const createResp = await fetch(`${BREVO_URL}/emailCampaigns`, {
      method: 'POST',
      headers: {
        'api-key': BREVO_KEY,
        'content-type': 'application/json',
        'accept': 'application/json',
      },
      body: JSON.stringify(campaignPayload),
    });

    const campaignData = await createResp.json();

    if (!createResp.ok) {
      return res.status(createResp.status).json({ error: 'Brevo campaign creation failed', details: campaignData });
    }

    const campaignId = campaignData.id;

    // Optionally send immediately
    if (send && campaignId) {
      const sendResp = await fetch(`${BREVO_URL}/emailCampaigns/${campaignId}/sendNow`, {
        method: 'POST',
        headers: { 'api-key': BREVO_KEY, 'content-type': 'application/json' },
      });
      if (!sendResp.ok) {
        const sendErr = await sendResp.json().catch(() => ({}));
        return res.status(200).json({
          campaignId,
          status: 'created_but_send_failed',
          sendError: sendErr,
        });
      }
      return res.status(200).json({ campaignId, status: 'sent' });
    }

    return res.status(200).json({ campaignId, status: 'draft', message: 'Campaign created as draft. Send from Brevo dashboard or POST with send:true.' });

  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}

// ─── NEWSLETTER TEMPLATE ───

const TOUR_DATA = {
  'chichen-itza-tour': {
    name: 'Chichén Itzá Express',
    tagline: 'Visit one of the 7 Wonders of the World',
    url: 'https://ttandmore.com/chichen-itza-tour/',
    emoji: '🏛️',
  },
  'tulum': {
    name: 'Tulum Express',
    tagline: 'Clifftop Mayan ruins overlooking the Caribbean',
    url: 'https://ttandmore.com/tulum/',
    emoji: '🌊',
  },
  'tulum-akumal-snorkel': {
    name: 'Tulum + Akumal Snorkel',
    tagline: 'Swim with sea turtles at Akumal Bay',
    url: 'https://ttandmore.com/tulum-akumal-snorkel/',
    emoji: '🐢',
  },
  'coba': {
    name: 'Cobá Express',
    tagline: 'Climb the tallest Mayan pyramid in Yucatán',
    url: 'https://ttandmore.com/coba/',
    emoji: '🌿',
  },
  'chichen-itza-cenote-ik-kil': {
    name: 'Chichén Itzá + Cenote Ik-Kil',
    tagline: 'Ancient wonders + a magical cenote swim',
    url: 'https://ttandmore.com/chichen-itza-cenote-ik-kil/',
    emoji: '💎',
  },
  'ek-balam-cenote-xcanche': {
    name: 'Ek Balam + Cenote Xcanché',
    tagline: 'Off-the-beaten-path Mayan adventure',
    url: 'https://ttandmore.com/ek-balam-cenote-xcanche/',
    emoji: '🗿',
  },
  'tulum-coba': {
    name: 'Tulum + Cobá',
    tagline: 'Two ruins sites in one epic day',
    url: 'https://ttandmore.com/tulum-coba/',
    emoji: '⛰️',
  },
};

function buildNewsletter({ month, year, highlights, featuredTour, promoCode, promoDiscount }) {
  const tour = TOUR_DATA[featuredTour] || TOUR_DATA['chichen-itza-tour'];
  const whatsappLink = `https://wa.me/529983000307?text=${encodeURIComponent(`Hi! I saw your ${month} newsletter and I'm interested in booking.`)}`;

  // Build highlights HTML
  let highlightsHtml = '';
  if (highlights.length > 0) {
    highlightsHtml = highlights.map(h => `
      <tr><td style="padding:8px 0;border-bottom:1px solid #f0f0f0;">
        <p style="margin:0;font-size:14px;color:#333;line-height:1.5;">${h}</p>
      </td></tr>
    `).join('');
  } else {
    highlightsHtml = `
      <tr><td style="padding:8px 0;border-bottom:1px solid #f0f0f0;">
        <p style="margin:0;font-size:14px;color:#333;line-height:1.5;">Peak season is coming — book your airport transfer early to guarantee availability!</p>
      </td></tr>
      <tr><td style="padding:8px 0;border-bottom:1px solid #f0f0f0;">
        <p style="margin:0;font-size:14px;color:#333;line-height:1.5;">New blog post: <a href="https://ttandmore.com/blog/" style="color:#9333EA;">Cancún Travel Tips & Guides</a></p>
      </td></tr>
      <tr><td style="padding:8px 0;">
        <p style="margin:0;font-size:14px;color:#333;line-height:1.5;">33 years of safe, private transportation — and counting!</p>
      </td></tr>
    `;
  }

  // Promo section
  let promoHtml = '';
  if (promoCode && promoDiscount) {
    promoHtml = `
    <table width="100%" cellpadding="0" cellspacing="0" style="background:#fffbeb;border-radius:8px;border:2px dashed #f59e0b;margin-bottom:24px;">
    <tr><td style="padding:20px 24px;text-align:center;">
      <p style="margin:0 0 8px;font-size:18px;font-weight:700;color:#b45309;">${promoDiscount} OFF Your Next Booking!</p>
      <p style="margin:0 0 12px;font-size:14px;color:#666;">Use code <strong style="font-size:16px;color:#333;background:#fef3c7;padding:2px 8px;border-radius:4px;">${promoCode}</strong> when you book via WhatsApp</p>
      <a href="${whatsappLink}" style="display:inline-block;background:#FACC15;color:#1A1A2E;text-decoration:none;padding:10px 24px;border-radius:6px;font-size:14px;font-weight:700;">Book Now</a>
    </td></tr>
    </table>`;
  }

  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f4f4f7;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f7;padding:40px 20px;">
<tr><td align="center">
<table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">

<!-- Header -->
<tr><td style="background:#1A1A2E;padding:32px 40px;text-align:center;">
  <img src="https://ttandmore.com/ttlogo1.png" alt="TT &amp; More" width="180" style="display:block;margin:0 auto 8px;max-width:180px;height:auto;">
  <p style="margin:8px 0 0;color:rgba(255,255,255,0.7);font-size:14px;">Monthly Newsletter — ${month} ${year}</p>
</td></tr>

<!-- Green bar -->
<tr><td style="background:#9333EA;padding:12px 40px;text-align:center;">
  <p style="margin:0;color:#ffffff;font-size:15px;font-weight:600;">What's New in Cancún & Riviera Maya</p>
</td></tr>

<!-- Body -->
<tr><td style="padding:32px 40px;">
  <p style="margin:0 0 20px;font-size:16px;color:#333;">Hello <strong>{{params.FIRSTNAME}}</strong>,</p>
  <p style="margin:0 0 24px;font-size:15px;color:#555;line-height:1.6;">
    Welcome to our ${month} update! Here's what's happening at TT & More and across the Riviera Maya.
  </p>

  ${promoHtml}

  <!-- Highlights -->
  <p style="margin:0 0 12px;font-size:16px;font-weight:600;color:#333;">This Month's Highlights</p>
  <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
    ${highlightsHtml}
  </table>

  <!-- Featured Tour -->
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#FAF5FF;border-radius:8px;border:1px solid #E9D5FF;margin-bottom:24px;">
  <tr><td style="padding:24px;">
    <p style="margin:0 0 4px;font-size:12px;font-weight:600;color:#7E22CE;text-transform:uppercase;letter-spacing:0.5px;">Featured Tour</p>
    <p style="margin:0 0 8px;font-size:20px;font-weight:700;color:#333;">${tour.emoji} ${tour.name}</p>
    <p style="margin:0 0 16px;font-size:14px;color:#555;line-height:1.5;">${tour.tagline}. Private transportation from your hotel, bilingual driver, air-conditioned vehicle. An unforgettable day in the Yucatán Peninsula.</p>
    <a href="${tour.url}" style="display:inline-block;background:#FACC15;color:#1A1A2E;text-decoration:none;padding:10px 24px;border-radius:6px;font-size:14px;font-weight:700;">See Tour Details &rarr;</a>
  </td></tr>
  </table>

  <!-- Quick Links -->
  <p style="margin:0 0 12px;font-size:14px;font-weight:600;color:#333;">Quick Links</p>
  <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
    <tr>
      <td style="padding:4px 0;"><a href="https://ttandmore.com/book/" style="color:#9333EA;text-decoration:none;font-size:14px;">Book a Transfer</a></td>
    </tr>
    <tr>
      <td style="padding:4px 0;"><a href="https://ttandmore.com/#tours" style="color:#9333EA;text-decoration:none;font-size:14px;">Browse All Tours</a></td>
    </tr>
    <tr>
      <td style="padding:4px 0;"><a href="https://ttandmore.com/blog/" style="color:#9333EA;text-decoration:none;font-size:14px;">Travel Tips Blog</a></td>
    </tr>
  </table>

  <!-- WhatsApp CTA -->
  <table width="100%" cellpadding="0" cellspacing="0">
    <tr><td align="center">
      <a href="${whatsappLink}" target="_blank" style="display:inline-block;background:#25d366;color:#ffffff;text-decoration:none;padding:14px 28px;border-radius:8px;font-size:15px;font-weight:600;">
        Chat with Us on WhatsApp
      </a>
    </td></tr>
    <tr><td align="center" style="padding-top:12px;">
      <p style="margin:0;font-size:13px;color:rgba(255,255,255,0.7);">
        <a href="tel:+529983000307" style="color:#2563eb;">+52 (998) 300 0307</a> · <a href="mailto:contact@ttandmore.com" style="color:#2563eb;">contact@ttandmore.com</a>
      </p>
    </td></tr>
  </table>
</td></tr>

<!-- Footer -->
<tr><td style="background:#1A1A2E;padding:24px 40px;text-align:center;">
  <p style="margin:0 0 4px;font-size:13px;color:rgba(255,255,255,0.7);">TT & More — Reliable Cancun Airport Transportation Since 1993</p>
  <p style="margin:0 0 8px;font-size:12px;color:rgba(255,255,255,0.4);">Cancun, Quintana Roo, Mexico</p>
  <p style="margin:0;font-size:11px;color:rgba(255,255,255,0.3);">
    <a href="https://ttandmore.com" style="color:#FACC15;text-decoration:none;">Visit Website</a> ·
    You received this because you booked with TT & More.
  </p>
</td></tr>

</table>
</td></tr>
</table>
</body>
</html>`;
}
