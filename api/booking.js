/**
 * TT & More — Booking API
 * Creates Airtable reservation + sends Brevo confirmation email
 */

const AIRTABLE_TOKEN = process.env.AIRTABLE_API_KEY;
const BASE_ID = process.env.AIRTABLE_BASE_ID || 'app9JpWjv6OFEZJ30';
const BREVO_KEY = process.env.BREVO_API_KEY || process.env.brevo_api_key;

export default async function handler(req, res) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });

  try {
    const { fields, email, clientName, destination, date, phone } = req.body;

    if (!fields) return res.status(400).json({ error: 'Missing fields' });

    // ── 1. Create Airtable record ──
    if (!AIRTABLE_TOKEN) {
      return res.status(500).json({ error: 'AIRTABLE_API_KEY not configured' });
    }

    const atResp = await fetch(`https://api.airtable.com/v0/${BASE_ID}/Reservas`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${AIRTABLE_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ fields }),
    });

    const atData = await atResp.json();
    if (!atResp.ok) {
      return res.status(atResp.status).json(atData);
    }

    // ── 2. Send confirmation email via Brevo ──
    let emailSent = false;
    if (BREVO_KEY && email) {
      try {
        const bookingId = atData.id || 'N/A';
        const htmlEmail = buildConfirmationEmail({
          clientName: clientName || 'Guest',
          destination: destination || fields['Destino - Tarifa'] || 'Your destination',
          date: date || 'TBD',
          phone: phone || '',
          bookingId,
          price: fields['Total'] || '',
          hotel: fields['Hotel'] || '',
          passengers: fields['Passengers - Selector'] || '',
          serviceType: fields['Tipo de Traslado'] || '',
          flight: fields['Flight #'] || '',
        });

        const brevoResp = await fetch('https://api.brevo.com/v3/smtp/email', {
          method: 'POST',
          headers: {
            'accept': 'application/json',
            'api-key': BREVO_KEY,
            'content-type': 'application/json',
          },
          body: JSON.stringify({
            sender: { name: 'TT & More', email: 'bookings@ttandmore.com' },
            to: [{ email, name: clientName || 'Guest' }],
            replyTo: { email: 'contact@ttandmore.com', name: 'TT & More' },
            subject: `Booking Confirmed — ${destination || 'Your Transfer'} | TT & More`,
            htmlContent: htmlEmail,
          }),
        });

        if (brevoResp.ok) {
          emailSent = true;
        } else {
          const errData = await brevoResp.json().catch(() => ({}));
          console.error('Brevo error:', errData);
        }
      } catch (emailErr) {
        console.error('Email send failed:', emailErr.message);
      }
    }

    return res.status(200).json({
      ...atData,
      emailSent,
    });

  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}

function buildConfirmationEmail({ clientName, destination, date, phone, bookingId, price, hotel, passengers, serviceType, flight }) {
  const whatsappLink = `https://wa.me/529983000307?text=${encodeURIComponent(`Hi! I just booked a transfer. Booking ID: ${bookingId}`)}`;

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
  <p style="margin:8px 0 0;color:rgba(255,255,255,0.7);font-size:14px;">Private Airport Transportation</p>
</td></tr>

<!-- Green check bar -->
<tr><td style="background:#22c55e;padding:16px 40px;text-align:center;">
  <p style="margin:0;color:#ffffff;font-size:18px;font-weight:700;">Booking Confirmed!</p>
</td></tr>

<!-- Body -->
<tr><td style="padding:32px 40px;">
  <p style="margin:0 0 20px;font-size:16px;color:#333;">Hello <strong>${clientName}</strong>,</p>
  <p style="margin:0 0 24px;font-size:15px;color:#555;line-height:1.6;">
    Thank you for choosing TT & More! Your private transfer has been received and our team will confirm your driver assignment shortly.
  </p>

  <!-- Booking details card -->
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8f9fa;border-radius:8px;border:1px solid #e9ecef;margin-bottom:24px;">
    <tr><td style="padding:20px 24px;">
      <p style="margin:0 0 12px;font-size:13px;font-weight:600;color:#999;text-transform:uppercase;letter-spacing:0.5px;">Booking Details</p>
      <table width="100%" cellpadding="0" cellspacing="0">
        ${serviceType ? `<tr><td style="padding:6px 0;color:#666;font-size:14px;width:130px;">Service</td><td style="padding:6px 0;color:#333;font-size:14px;font-weight:600;">${serviceType}</td></tr>` : ''}
        <tr><td style="padding:6px 0;color:#666;font-size:14px;width:130px;">Destination</td><td style="padding:6px 0;color:#333;font-size:14px;font-weight:600;">${destination}</td></tr>
        <tr><td style="padding:6px 0;color:#666;font-size:14px;">Date</td><td style="padding:6px 0;color:#333;font-size:14px;font-weight:600;">${date}</td></tr>
        ${hotel ? `<tr><td style="padding:6px 0;color:#666;font-size:14px;">Hotel</td><td style="padding:6px 0;color:#333;font-size:14px;font-weight:600;">${hotel}</td></tr>` : ''}
        ${passengers ? `<tr><td style="padding:6px 0;color:#666;font-size:14px;">Passengers</td><td style="padding:6px 0;color:#333;font-size:14px;font-weight:600;">${passengers}</td></tr>` : ''}
        ${flight ? `<tr><td style="padding:6px 0;color:#666;font-size:14px;">Flight</td><td style="padding:6px 0;color:#333;font-size:14px;font-weight:600;">${flight}</td></tr>` : ''}
        ${price ? `<tr><td style="padding:6px 0;color:#666;font-size:14px;">Price</td><td style="padding:6px 0;color:#22c55e;font-size:16px;font-weight:700;">${price}</td></tr>` : ''}
      </table>
      <p style="margin:12px 0 0;padding-top:12px;border-top:1px solid #e9ecef;font-size:12px;color:#999;">Booking ID: ${bookingId}</p>
    </td></tr>
  </table>

  <!-- What's next -->
  <p style="margin:0 0 8px;font-size:15px;font-weight:600;color:#333;">What happens next?</p>
  <p style="margin:0 0 24px;font-size:14px;color:#555;line-height:1.6;">
    Our team will assign a driver to your transfer and you will receive your driver's details before your trip. On the day of service, your driver will be waiting for you at the airport with a sign displaying your name.
  </p>

  <!-- CTA buttons -->
  <table width="100%" cellpadding="0" cellspacing="0">
    <tr>
      <td align="center" style="padding:0 0 16px;">
        <a href="${whatsappLink}" target="_blank" style="display:inline-block;background:#25d366;color:#ffffff;text-decoration:none;padding:14px 28px;border-radius:8px;font-size:15px;font-weight:600;">
          Chat with us on WhatsApp
        </a>
      </td>
    </tr>
  </table>

  <p style="margin:0;font-size:13px;color:#999;text-align:center;">
    Questions? Call us at <a href="tel:+529983000307" style="color:#2563eb;">+52 (998) 300 0307</a> or email <a href="mailto:contact@ttandmore.com" style="color:#2563eb;">contact@ttandmore.com</a>
  </p>
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
