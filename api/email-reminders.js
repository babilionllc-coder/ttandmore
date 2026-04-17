/**
 * TT & More — Email Reminders API
 * Cron-triggered: sends pre-trip reminders (24h before) and post-trip review requests
 *
 * Vercel Cron: runs every 6 hours
 * GET /api/email-reminders?type=pre-trip   → sends reminders for tomorrow's transfers
 * GET /api/email-reminders?type=post-trip  → sends review requests for completed transfers
 * GET /api/email-reminders                 → runs both
 */

const AIRTABLE_TOKEN = process.env.AIRTABLE_API_KEY;
const BASE_ID = process.env.AIRTABLE_BASE_ID || 'app9JpWjv6OFEZJ30';
const BREVO_KEY = process.env.BREVO_API_KEY || process.env.brevo_api_key;

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (req.method === 'OPTIONS') return res.status(200).end();

  // Allow GET (for cron) and POST
  const type = req.query.type || 'both';
  const results = { preTrip: null, postTrip: null };

  try {
    if (type === 'pre-trip' || type === 'both') {
      results.preTrip = await sendPreTripReminders();
    }
    if (type === 'post-trip' || type === 'both') {
      results.postTrip = await sendPostTripReviewRequests();
    }

    return res.status(200).json({ success: true, ...results });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}

// ─── PRE-TRIP REMINDER (24h before) ───
async function sendPreTripReminders() {
  // Get tomorrow's date range
  const now = new Date();
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowStart = tomorrow.toISOString().split('T')[0] + 'T00:00:00.000Z';
  const tomorrowEnd = tomorrow.toISOString().split('T')[0] + 'T23:59:59.999Z';

  // Fetch reservations for tomorrow that are confirmed (not cancelled)
  const formula = encodeURIComponent(
    `AND(IS_AFTER({Arrival Date Time},'${tomorrowStart}'),IS_BEFORE({Arrival Date Time},'${tomorrowEnd}'),{Estado del Servicio}!='Cancelado',{Estado del Servicio}!='Completado',{Pre-Trip Email Sent}!=TRUE())`
  );

  const records = await fetchAirtableRecords(formula);
  let sent = 0;
  const errors = [];

  for (const record of records) {
    const f = record.fields;
    const email = extractEmail(f['Notas Adicionales'] || '');
    if (!email) continue;

    const clientName = `${f['Titular Name'] || ''} ${f['Titular Last Name'] || ''}`.trim() || 'Guest';
    const destination = f['Destino - Tarifa'] || 'your destination';
    const hotel = f['Hotel'] || '';
    const flight = f['Flight #'] || '';
    const date = f['Arrival Date Time'] ? new Date(f['Arrival Date Time']).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }) : 'tomorrow';
    const driver = f['Conductor Asignado'] ? 'Your driver has been assigned' : 'Your driver will be assigned shortly';

    try {
      await sendBrevoEmail({
        to: email,
        toName: clientName,
        subject: `Your Transfer is Tomorrow — ${destination} | TT & More`,
        html: buildPreTripEmail({ clientName, destination, hotel, flight, date, driver, bookingId: record.id }),
      });

      // Mark as sent in Airtable
      await updateAirtableRecord(record.id, { 'Pre-Trip Email Sent': true });
      sent++;
    } catch (e) {
      errors.push({ id: record.id, error: e.message });
    }
  }

  return { found: records.length, sent, errors };
}

// ─── POST-TRIP REVIEW REQUEST ───
async function sendPostTripReviewRequests() {
  // Get records completed in the last 48 hours that haven't received a review email
  const now = new Date();
  const twoDaysAgo = new Date(now);
  twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);

  const formula = encodeURIComponent(
    `AND({Estado del Servicio}='Completado',{Review Email Sent}!=TRUE())`
  );

  const records = await fetchAirtableRecords(formula);
  let sent = 0;
  const errors = [];

  for (const record of records) {
    const f = record.fields;
    const email = extractEmail(f['Notas Adicionales'] || '');
    if (!email) continue;

    const clientName = `${f['Titular Name'] || ''} ${f['Titular Last Name'] || ''}`.trim() || 'Guest';
    const destination = f['Destino - Tarifa'] || 'your destination';

    try {
      await sendBrevoEmail({
        to: email,
        toName: clientName,
        subject: `How Was Your Trip? — TT & More`,
        html: buildReviewRequestEmail({ clientName, destination, bookingId: record.id }),
      });

      // Mark as sent
      await updateAirtableRecord(record.id, { 'Review Email Sent': true });
      sent++;
    } catch (e) {
      errors.push({ id: record.id, error: e.message });
    }
  }

  return { found: records.length, sent, errors };
}

// ─── HELPERS ───

function extractEmail(notes) {
  const match = (notes || '').match(/Email:\s*([^\s,\n]+@[^\s,\n]+)/i);
  return match ? match[1] : null;
}

async function fetchAirtableRecords(formula) {
  const url = `https://api.airtable.com/v0/${BASE_ID}/Reservas?filterByFormula=${formula}&pageSize=50`;
  const resp = await fetch(url, {
    headers: { 'Authorization': `Bearer ${AIRTABLE_TOKEN}` },
  });
  const data = await resp.json();
  return data.records || [];
}

async function updateAirtableRecord(recordId, fields) {
  await fetch(`https://api.airtable.com/v0/${BASE_ID}/Reservas/${recordId}`, {
    method: 'PATCH',
    headers: {
      'Authorization': `Bearer ${AIRTABLE_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ fields }),
  });
}

async function sendBrevoEmail({ to, toName, subject, html }) {
  const resp = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: {
      'accept': 'application/json',
      'api-key': BREVO_KEY,
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      sender: { name: 'TT & More', email: 'info@jegodigital.com' },
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

function buildPreTripEmail({ clientName, destination, hotel, flight, date, driver, bookingId }) {
  const whatsappLink = `https://wa.me/529983000307?text=${encodeURIComponent(`Hi! My transfer is tomorrow. Booking: ${bookingId}`)}`;

  return `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f4f4f7;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f7;padding:40px 20px;">
<tr><td align="center">
<table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">

<!-- Header -->
<tr><td style="background:#1A1A2E;padding:32px 40px;text-align:center;">
  <img src="https://ttandmore.com/ttlogo1.png" alt="TT &amp; More" width="180" style="display:block;margin:0 auto 8px;max-width:180px;height:auto;">
  <p style="margin:8px 0 0;color:rgba(255,255,255,0.7);font-size:14px;">Private Airport Transportation</p>
</td></tr>

<!-- Blue reminder bar -->
<tr><td style="background:#2563eb;padding:16px 40px;text-align:center;">
  <p style="margin:0;color:#ffffff;font-size:18px;font-weight:700;">Your Transfer is Tomorrow!</p>
</td></tr>

<!-- Body -->
<tr><td style="padding:32px 40px;">
  <p style="margin:0 0 20px;font-size:16px;color:#333;">Hello <strong>${clientName}</strong>,</p>
  <p style="margin:0 0 24px;font-size:15px;color:#555;line-height:1.6;">
    Just a friendly reminder — your private transfer is scheduled for <strong>${date}</strong>. Here's everything you need to know:
  </p>

  <!-- Trip details card -->
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f0f4ff;border-radius:8px;border:1px solid #d4e0ff;margin-bottom:24px;">
    <tr><td style="padding:20px 24px;">
      <p style="margin:0 0 12px;font-size:13px;font-weight:600;color:#2563eb;text-transform:uppercase;letter-spacing:0.5px;">Trip Details</p>
      <table width="100%" cellpadding="0" cellspacing="0">
        <tr><td style="padding:6px 0;color:#666;font-size:14px;width:120px;">Destination</td><td style="padding:6px 0;color:#333;font-size:14px;font-weight:600;">${destination}</td></tr>
        <tr><td style="padding:6px 0;color:#666;font-size:14px;">Date</td><td style="padding:6px 0;color:#333;font-size:14px;font-weight:600;">${date}</td></tr>
        ${hotel ? `<tr><td style="padding:6px 0;color:#666;font-size:14px;">Hotel</td><td style="padding:6px 0;color:#333;font-size:14px;font-weight:600;">${hotel}</td></tr>` : ''}
        ${flight ? `<tr><td style="padding:6px 0;color:#666;font-size:14px;">Flight</td><td style="padding:6px 0;color:#333;font-size:14px;font-weight:600;">${flight}</td></tr>` : ''}
        <tr><td style="padding:6px 0;color:#666;font-size:14px;">Driver</td><td style="padding:6px 0;color:#333;font-size:14px;font-weight:600;">${driver}</td></tr>
      </table>
    </td></tr>
  </table>

  <!-- Tips -->
  <p style="margin:0 0 8px;font-size:15px;font-weight:600;color:#333;">Important Tips:</p>
  <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
    <tr><td style="padding:4px 0;font-size:14px;color:#555;">&#10003; Your driver will wait for you at the airport holding a sign with your name</td></tr>
    <tr><td style="padding:4px 0;font-size:14px;color:#555;">&#10003; If your flight is delayed, don't worry — we monitor all flights in real time</td></tr>
    <tr><td style="padding:4px 0;font-size:14px;color:#555;">&#10003; Have your booking reference handy: <strong>${bookingId}</strong></td></tr>
    <tr><td style="padding:4px 0;font-size:14px;color:#555;">&#10003; Need to change anything? WhatsApp us right now</td></tr>
  </table>

  <!-- CTA -->
  <table width="100%" cellpadding="0" cellspacing="0">
    <tr><td align="center" style="padding:0 0 16px;">
      <a href="${whatsappLink}" target="_blank" style="display:inline-block;background:#25d366;color:#ffffff;text-decoration:none;padding:14px 28px;border-radius:8px;font-size:15px;font-weight:600;">
        Contact Us on WhatsApp
      </a>
    </td></tr>
  </table>

  <p style="margin:0;font-size:13px;color:rgba(255,255,255,0.7);text-align:center;">
    Call us: <a href="tel:+529983000307" style="color:#2563eb;">+52 (998) 300 0307</a> · <a href="mailto:contact@ttandmore.com" style="color:#2563eb;">contact@ttandmore.com</a>
  </p>
</td></tr>

<!-- Footer -->
<tr><td style="background:#1A1A2E;padding:24px 40px;text-align:center;">
  <p style="margin:0 0 4px;font-size:13px;color:rgba(255,255,255,0.7);">TT & More — Reliable Cancun Airport Transportation Since 1993</p>
  <p style="margin:0;font-size:12px;color:rgba(255,255,255,0.4);">Cancun, Quintana Roo, Mexico</p>
</td></tr>

</table></td></tr></table></body></html>`;
}

function buildReviewRequestEmail({ clientName, destination, bookingId }) {
  // Direct link to Google review
  const googleReviewLink = 'https://search.google.com/local/writereview?placeid=ChIJxxxxxx'; // TODO: replace with actual Place ID
  const whatsappLink = `https://wa.me/529983000307?text=${encodeURIComponent(`Hi! I just completed my transfer. Booking: ${bookingId}`)}`;
  const tripAdvisorLink = 'https://www.tripadvisor.com/UserReviewEdit'; // TODO: replace with actual TA link

  return `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f4f4f7;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f7;padding:40px 20px;">
<tr><td align="center">
<table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">

<!-- Header -->
<tr><td style="background:#1A1A2E;padding:32px 40px;text-align:center;">
  <img src="https://ttandmore.com/ttlogo1.png" alt="TT &amp; More" width="180" style="display:block;margin:0 auto 8px;max-width:180px;height:auto;">
  <p style="margin:8px 0 0;color:rgba(255,255,255,0.7);font-size:14px;">Private Airport Transportation</p>
</td></tr>

<!-- Yellow thanks bar -->
<tr><td style="background:#f59e0b;padding:16px 40px;text-align:center;">
  <p style="margin:0;color:#ffffff;font-size:18px;font-weight:700;">Thank You for Traveling with Us!</p>
</td></tr>

<!-- Body -->
<tr><td style="padding:32px 40px;">
  <p style="margin:0 0 20px;font-size:16px;color:#333;">Hello <strong>${clientName}</strong>,</p>
  <p style="margin:0 0 16px;font-size:15px;color:#555;line-height:1.6;">
    We hope you enjoyed your transfer to <strong>${destination}</strong>! At TT & More, we've been providing reliable transportation in Cancun and the Riviera Maya for over 33 years — and your feedback helps us keep improving.
  </p>
  <p style="margin:0 0 24px;font-size:15px;color:#555;line-height:1.6;">
    Would you take 30 seconds to leave us a quick review? It means the world to our team and helps other travelers find safe, reliable transportation.
  </p>

  <!-- Star visual -->
  <p style="text-align:center;font-size:36px;margin:0 0 24px;letter-spacing:4px;">&#9733;&#9733;&#9733;&#9733;&#9733;</p>

  <!-- CTA buttons -->
  <table width="100%" cellpadding="0" cellspacing="0">
    <tr><td align="center" style="padding:0 0 12px;">
      <a href="${googleReviewLink}" target="_blank" style="display:inline-block;background:#4285f4;color:#ffffff;text-decoration:none;padding:14px 32px;border-radius:8px;font-size:15px;font-weight:600;">
        Leave a Google Review
      </a>
    </td></tr>
  </table>

  <p style="margin:0 0 24px;font-size:13px;color:rgba(255,255,255,0.7);text-align:center;">It takes less than 30 seconds and helps us greatly</p>

  <!-- Coming back? -->
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#FAF5FF;border-radius:8px;border:1px solid #E9D5FF;margin-bottom:24px;">
    <tr><td style="padding:20px 24px;text-align:center;">
      <p style="margin:0 0 8px;font-size:15px;font-weight:600;color:#166534;">Coming Back to Cancun?</p>
      <p style="margin:0 0 16px;font-size:14px;color:#555;">Book your next transfer now and get <strong>10% off</strong> as a returning customer.</p>
      <a href="https://ttandmore.com/book/?returning=true" target="_blank" style="display:inline-block;background:#9333EA;color:#ffffff;text-decoration:none;padding:12px 24px;border-radius:8px;font-size:14px;font-weight:600;">
        Book Again — 10% Off
      </a>
    </td></tr>
  </table>

  <p style="margin:0;font-size:13px;color:rgba(255,255,255,0.7);text-align:center;">
    Questions? <a href="${whatsappLink}" style="color:#25d366;font-weight:600;">WhatsApp us</a> · <a href="tel:+529983000307" style="color:#2563eb;">+52 (998) 300 0307</a>
  </p>
</td></tr>

<!-- Footer -->
<tr><td style="background:#1A1A2E;padding:24px 40px;text-align:center;">
  <p style="margin:0 0 4px;font-size:13px;color:rgba(255,255,255,0.7);">TT & More — Reliable Cancun Airport Transportation Since 1993</p>
  <p style="margin:0;font-size:12px;color:rgba(255,255,255,0.4);">Cancun, Quintana Roo, Mexico</p>
</td></tr>

</table></td></tr></table></body></html>`;
}
