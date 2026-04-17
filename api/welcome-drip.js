/**
 * TT & More — Welcome Drip Sequence
 *
 * 3-email automated sequence triggered after booking:
 *   Email 1 (Day 0):  Welcome + what to expect (sent by booking.js already)
 *   Email 2 (Day 1):  Travel tips + tour upsell
 *   Email 3 (Day 3):  "Did you know?" + tour catalog + WhatsApp CTA
 *
 * Triggered via Vercel cron: GET /api/welcome-drip
 * Queries Brevo contacts by BOOKING_DATE and sends the right email based on timing.
 *
 * Uses Brevo contact attributes set by /api/booking:
 *   FIRSTNAME, LASTNAME, DESTINATION, BOOKING_DATE, HOTEL, SERVICE_TYPE, BOOKING_ID
 *   DRIP_STAGE (new attribute — tracks which drip emails have been sent: 0, 1, 2, 3)
 */

const BREVO_KEY = process.env.BREVO_API_KEY || process.env.brevo_api_key;
const BREVO_URL = 'https://api.brevo.com/v3';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (req.method === 'OPTIONS') return res.status(200).end();

  if (!BREVO_KEY) {
    return res.status(500).json({ error: 'BREVO_API_KEY not configured' });
  }

  try {
    const results = { email2: 0, email3: 0, errors: [] };

    // Get all contacts from TT&More Clients list (ID 2)
    const contacts = await getBrevoContacts();

    const now = new Date();

    for (const contact of contacts) {
      try {
        const attrs = contact.attributes || {};
        const bookingDate = attrs.BOOKING_DATE ? new Date(attrs.BOOKING_DATE) : null;
        const dripStage = parseInt(attrs.DRIP_STAGE) || 0;
        const email = contact.email;
        const firstName = attrs.FIRSTNAME || 'Traveler';
        const destination = attrs.DESTINATION || 'the Riviera Maya';
        const hotel = attrs.HOTEL || '';

        if (!bookingDate || !email) continue;

        const daysSinceBooking = Math.floor((now - bookingDate) / (1000 * 60 * 60 * 24));

        // Email 2: Day 1+ after booking, drip stage = 0 (only booking confirmation sent)
        if (daysSinceBooking >= 1 && dripStage === 0) {
          await sendBrevoEmail({
            to: email,
            toName: firstName,
            subject: `${firstName}, 5 Tips for Your Cancún Trip`,
            html: buildEmail2({ firstName, destination, hotel }),
          });
          await updateDripStage(email, 1);
          results.email2++;
        }

        // Email 3: Day 3+ after booking, drip stage = 1
        else if (daysSinceBooking >= 3 && dripStage === 1) {
          await sendBrevoEmail({
            to: email,
            toName: firstName,
            subject: `${firstName}, Make Your Trip Unforgettable`,
            html: buildEmail3({ firstName, destination }),
          });
          await updateDripStage(email, 2);
          results.email3++;
        }

      } catch (contactErr) {
        results.errors.push(`${contact.email}: ${contactErr.message}`);
      }
    }

    return res.status(200).json({
      success: true,
      processed: contacts.length,
      ...results,
    });

  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}

// ─── BREVO API HELPERS ───

async function getBrevoContacts() {
  // Get contacts from list 2 (TT&More Clients)
  const resp = await fetch(`${BREVO_URL}/contacts/lists/2/contacts?limit=50&sort=desc`, {
    headers: { 'api-key': BREVO_KEY, 'accept': 'application/json' },
  });
  const data = await resp.json();
  return data.contacts || [];
}

async function updateDripStage(email, stage) {
  await fetch(`${BREVO_URL}/contacts/${encodeURIComponent(email)}`, {
    method: 'PUT',
    headers: { 'api-key': BREVO_KEY, 'content-type': 'application/json' },
    body: JSON.stringify({
      attributes: { DRIP_STAGE: stage.toString() },
    }),
  });
}

async function sendBrevoEmail({ to, toName, subject, html }) {
  const resp = await fetch(`${BREVO_URL}/smtp/email`, {
    method: 'POST',
    headers: {
      'accept': 'application/json',
      'api-key': BREVO_KEY,
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      sender: { name: 'TT & More', email: 'bookings@ttandmore.com' },
      to: [{ email: to, name: toName }],
      replyTo: { email: 'contact@ttandmore.com', name: 'TT & More' },
      subject,
      htmlContent: html,
    }),
  });
  if (!resp.ok) {
    const err = await resp.json().catch(() => ({}));
    throw new Error(err.message || `Brevo ${resp.status}`);
  }
}

// ─── EMAIL TEMPLATES ───

function buildEmail2({ firstName, destination, hotel }) {
  const whatsappLink = `https://wa.me/529983000307?text=${encodeURIComponent('Hi! I have a question about my upcoming trip.')}`;

  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f4f4f7;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f7;padding:40px 20px;">
<tr><td align="center">
<table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">

<!-- Header -->
<tr><td style="background:#0a0a12;padding:32px 40px;text-align:center;">
  <h1 style="margin:0;color:#ffffff;font-size:24px;font-weight:700;">TT <span style="color:#22c55e;">&</span> More</h1>
  <p style="margin:8px 0 0;color:rgba(255,255,255,0.7);font-size:14px;">Your Cancún Travel Companion</p>
</td></tr>

<!-- Body -->
<tr><td style="padding:32px 40px;">
  <p style="margin:0 0 20px;font-size:16px;color:#333;">Hi <strong>${firstName}</strong>,</p>
  <p style="margin:0 0 16px;font-size:15px;color:#555;line-height:1.6;">
    Excited about your upcoming trip to <strong>${destination}</strong>? Here are 5 insider tips from our team with 33+ years in Cancún:
  </p>

  <!-- Tips -->
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f0fdf4;border-radius:8px;border:1px solid #bbf7d0;margin-bottom:24px;">
  <tr><td style="padding:20px 24px;">
    <p style="margin:0 0 12px;font-size:13px;font-weight:600;color:#16a34a;text-transform:uppercase;letter-spacing:0.5px;">Insider Tips</p>
    <table width="100%" cellpadding="0" cellspacing="0">
      <tr><td style="padding:6px 0;color:#333;font-size:14px;line-height:1.5;"><strong>1.</strong> Bring pesos for small purchases — you'll get better prices than paying in USD at shops and restaurants.</td></tr>
      <tr><td style="padding:6px 0;color:#333;font-size:14px;line-height:1.5;"><strong>2.</strong> Pack reef-safe sunscreen — regular sunscreen is banned at cenotes and eco-parks.</td></tr>
      <tr><td style="padding:6px 0;color:#333;font-size:14px;line-height:1.5;"><strong>3.</strong> Your driver will hold a sign with your name at the airport. Look for us right outside customs.</td></tr>
      <tr><td style="padding:6px 0;color:#333;font-size:14px;line-height:1.5;"><strong>4.</strong> Download WhatsApp if you haven't — it's how everyone communicates in Mexico.</td></tr>
      <tr><td style="padding:6px 0;color:#333;font-size:14px;line-height:1.5;"><strong>5.</strong> ${hotel ? `Your hotel (${hotel}) is in a great area — ask your driver for restaurant tips on the way!` : 'Ask your driver for restaurant recommendations — they know the best local spots!'}</td></tr>
    </table>
  </td></tr>
  </table>

  <!-- Tour Upsell -->
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#fffbeb;border-radius:8px;border:1px solid #fde68a;margin-bottom:24px;">
  <tr><td style="padding:20px 24px;">
    <p style="margin:0 0 8px;font-size:15px;font-weight:600;color:#333;">While you're here... explore the Riviera Maya!</p>
    <p style="margin:0 0 12px;font-size:14px;color:#555;line-height:1.5;">
      Most of our guests add a day trip to their itinerary. Our most popular tours:
    </p>
    <table width="100%" cellpadding="0" cellspacing="0">
      <tr>
        <td style="padding:4px 0;"><a href="https://ttandmore.com/chichen-itza-tour/" style="color:#2563eb;text-decoration:none;font-size:14px;">Chichén Itzá Express</a> — <span style="color:#666;font-size:13px;">One of the 7 Wonders</span></td>
      </tr>
      <tr>
        <td style="padding:4px 0;"><a href="https://ttandmore.com/tulum/" style="color:#2563eb;text-decoration:none;font-size:14px;">Tulum Ruins</a> — <span style="color:#666;font-size:13px;">Clifftop Mayan city</span></td>
      </tr>
      <tr>
        <td style="padding:4px 0;"><a href="https://ttandmore.com/tulum-akumal-snorkel/" style="color:#2563eb;text-decoration:none;font-size:14px;">Akumal Snorkel</a> — <span style="color:#666;font-size:13px;">Swim with sea turtles</span></td>
      </tr>
    </table>
    <p style="margin:12px 0 0;font-size:13px;color:#999;">All tours include hotel pickup, bilingual driver, and A/C transport.</p>
  </td></tr>
  </table>

  <p style="margin:0 0 24px;font-size:14px;color:#555;line-height:1.6;">
    Questions about your trip? Just reply to this email or message us on WhatsApp — we respond in minutes.
  </p>

  <table width="100%" cellpadding="0" cellspacing="0">
    <tr><td align="center">
      <a href="${whatsappLink}" target="_blank" style="display:inline-block;background:#25d366;color:#ffffff;text-decoration:none;padding:14px 28px;border-radius:8px;font-size:15px;font-weight:600;">
        Chat with us on WhatsApp
      </a>
    </td></tr>
  </table>
</td></tr>

<!-- Footer -->
<tr><td style="background:#f8f9fa;padding:24px 40px;text-align:center;border-top:1px solid #e9ecef;">
  <p style="margin:0 0 4px;font-size:13px;color:#999;">TT & More — Reliable Cancun Airport Transportation Since 1993</p>
  <p style="margin:0;font-size:12px;color:#bbb;">Cancun, Quintana Roo, Mexico</p>
</td></tr>

</table>
</td></tr>
</table>
</body>
</html>`;
}

function buildEmail3({ firstName, destination }) {
  const whatsappLink = `https://wa.me/529983000307?text=${encodeURIComponent("Hi! I'd like to add a tour to my trip.")}`;

  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f4f4f7;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f7;padding:40px 20px;">
<tr><td align="center">
<table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">

<!-- Header -->
<tr><td style="background:#0a0a12;padding:32px 40px;text-align:center;">
  <h1 style="margin:0;color:#ffffff;font-size:24px;font-weight:700;">TT <span style="color:#22c55e;">&</span> More</h1>
  <p style="margin:8px 0 0;color:rgba(255,255,255,0.7);font-size:14px;">Private Tours & Transportation</p>
</td></tr>

<!-- Body -->
<tr><td style="padding:32px 40px;">
  <p style="margin:0 0 20px;font-size:16px;color:#333;">Hey <strong>${firstName}</strong>,</p>
  <p style="margin:0 0 16px;font-size:15px;color:#555;line-height:1.6;">
    Did you know TT & More has been taking travelers to the Riviera Maya's hidden gems for <strong>33 years</strong>? We're not just an airport shuttle — we're your local experts.
  </p>

  <p style="margin:0 0 16px;font-size:15px;font-weight:600;color:#333;">
    Our 7 Private Tours:
  </p>

  <!-- Tour Grid -->
  <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
    <tr>
      <td style="padding:8px;width:50%;vertical-align:top;">
        <div style="background:#f8f9fa;border-radius:8px;padding:16px;border:1px solid #e9ecef;">
          <p style="margin:0 0 4px;font-size:14px;font-weight:600;color:#333;">Chichén Itzá Express</p>
          <p style="margin:0;font-size:12px;color:#666;">7th Wonder of the World</p>
          <a href="https://ttandmore.com/chichen-itza-tour/" style="font-size:12px;color:#22c55e;">View tour &rarr;</a>
        </div>
      </td>
      <td style="padding:8px;width:50%;vertical-align:top;">
        <div style="background:#f8f9fa;border-radius:8px;padding:16px;border:1px solid #e9ecef;">
          <p style="margin:0 0 4px;font-size:14px;font-weight:600;color:#333;">Chichén Itzá + Ik-Kil</p>
          <p style="margin:0;font-size:12px;color:#666;">Ruins + cenote swim</p>
          <a href="https://ttandmore.com/chichen-itza-cenote-ik-kil/" style="font-size:12px;color:#22c55e;">View tour &rarr;</a>
        </div>
      </td>
    </tr>
    <tr>
      <td style="padding:8px;width:50%;vertical-align:top;">
        <div style="background:#f8f9fa;border-radius:8px;padding:16px;border:1px solid #e9ecef;">
          <p style="margin:0 0 4px;font-size:14px;font-weight:600;color:#333;">Tulum Express</p>
          <p style="margin:0;font-size:12px;color:#666;">Clifftop Mayan ruins</p>
          <a href="https://ttandmore.com/tulum/" style="font-size:12px;color:#22c55e;">View tour &rarr;</a>
        </div>
      </td>
      <td style="padding:8px;width:50%;vertical-align:top;">
        <div style="background:#f8f9fa;border-radius:8px;padding:16px;border:1px solid #e9ecef;">
          <p style="margin:0 0 4px;font-size:14px;font-weight:600;color:#333;">Tulum + Akumal Snorkel</p>
          <p style="margin:0;font-size:12px;color:#666;">Swim with sea turtles</p>
          <a href="https://ttandmore.com/tulum-akumal-snorkel/" style="font-size:12px;color:#22c55e;">View tour &rarr;</a>
        </div>
      </td>
    </tr>
    <tr>
      <td style="padding:8px;width:50%;vertical-align:top;">
        <div style="background:#f8f9fa;border-radius:8px;padding:16px;border:1px solid #e9ecef;">
          <p style="margin:0 0 4px;font-size:14px;font-weight:600;color:#333;">Cobá Express</p>
          <p style="margin:0;font-size:12px;color:#666;">Climb the tallest pyramid</p>
          <a href="https://ttandmore.com/coba/" style="font-size:12px;color:#22c55e;">View tour &rarr;</a>
        </div>
      </td>
      <td style="padding:8px;width:50%;vertical-align:top;">
        <div style="background:#f8f9fa;border-radius:8px;padding:16px;border:1px solid #e9ecef;">
          <p style="margin:0 0 4px;font-size:14px;font-weight:600;color:#333;">Ek Balam + Cenote</p>
          <p style="margin:0;font-size:12px;color:#666;">Off-the-beaten-path gem</p>
          <a href="https://ttandmore.com/ek-balam-cenote-xcanche/" style="font-size:12px;color:#22c55e;">View tour &rarr;</a>
        </div>
      </td>
    </tr>
  </table>

  <p style="margin:0 0 8px;font-size:15px;font-weight:600;color:#333;">Why book with us?</p>
  <p style="margin:0 0 24px;font-size:14px;color:#555;line-height:1.6;">
    Every tour is <strong>100% private</strong> — just you, your group, and your bilingual driver. No crowded buses, no waiting for strangers. We pick you up at your hotel and drop you back. Air-conditioned vehicles, bottled water included.
  </p>

  <table width="100%" cellpadding="0" cellspacing="0">
    <tr><td align="center" style="padding:0 0 8px;">
      <a href="${whatsappLink}" target="_blank" style="display:inline-block;background:#22c55e;color:#ffffff;text-decoration:none;padding:14px 28px;border-radius:8px;font-size:15px;font-weight:600;">
        Add a Tour to Your Trip
      </a>
    </td></tr>
    <tr><td align="center">
      <p style="margin:0;font-size:13px;color:#999;">Or call us: <a href="tel:+529983000307" style="color:#2563eb;">+52 (998) 300 0307</a></p>
    </td></tr>
  </table>
</td></tr>

<!-- Footer -->
<tr><td style="background:#f8f9fa;padding:24px 40px;text-align:center;border-top:1px solid #e9ecef;">
  <p style="margin:0 0 4px;font-size:13px;color:#999;">TT & More — Reliable Cancun Airport Transportation Since 1993</p>
  <p style="margin:0;font-size:12px;color:#bbb;">Cancun, Quintana Roo, Mexico | <a href="https://ttandmore.com" style="color:#bbb;">ttandmore.com</a></p>
</td></tr>

</table>
</td></tr>
</table>
</body>
</html>`;
}
