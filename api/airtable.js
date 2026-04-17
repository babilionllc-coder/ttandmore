/**
 * TT & More — Airtable API Proxy
 * Keeps the Airtable token server-side so the admin panel works for everyone
 * without needing to paste tokens.
 */

const AIRTABLE_TOKEN = process.env.AIRTABLE_API_KEY;
const BASE_ID = process.env.AIRTABLE_BASE_ID || 'app9JpWjv6OFEZJ30';
const AIRTABLE_BASE = `https://api.airtable.com/v0/${BASE_ID}`;

export default async function handler(req, res) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PATCH, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();

  if (!AIRTABLE_TOKEN) {
    return res.status(500).json({ error: 'AIRTABLE_API_KEY not configured in Vercel environment' });
  }

  try {
    const { table, recordId, ...queryParams } = req.query;

    if (!table) {
      return res.status(400).json({ error: 'Missing "table" query parameter' });
    }

    // Build Airtable URL
    let url = `${AIRTABLE_BASE}/${encodeURIComponent(table)}`;
    if (recordId) url += `/${recordId}`;

    // Forward query params (sort, filter, pageSize, offset, etc.)
    const params = new URLSearchParams();
    Object.entries(queryParams).forEach(([k, v]) => {
      if (k !== 'table' && k !== 'recordId') params.set(k, v);
    });
    const qs = params.toString();
    if (qs) url += `?${qs}`;

    // Build fetch options
    const fetchOpts = {
      method: req.method,
      headers: {
        'Authorization': `Bearer ${AIRTABLE_TOKEN}`,
        'Content-Type': 'application/json',
      },
    };

    // Forward body for POST/PATCH
    if (req.method === 'POST' || req.method === 'PATCH') {
      fetchOpts.body = JSON.stringify(req.body);
    }

    const response = await fetch(url, fetchOpts);
    const data = await response.json();

    if (!response.ok) {
      return res.status(response.status).json(data);
    }

    return res.status(200).json(data);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
