#!/usr/bin/env node
/**
 * force_index.js — Submit URLs to Google Indexing API v3 + IndexNow
 *
 * Reads public/sitemap.xml, extracts all <loc> URLs, and:
 *  1. Pushes each to Google Indexing API v3 (URL_UPDATED notification)
 *  2. Pings IndexNow with the full URL list (Bing/Yandex/Seznam/Naver)
 *
 * Environment variables:
 *   GOOGLE_SERVICE_ACCOUNT_KEY — JSON string of service account key
 *   INDEXNOW_KEY — 32-char UUID key
 *   DOMAIN — e.g., "example.com"
 *
 * Google Indexing API limit: 200 URLs/day. Script batches and warns on overflow.
 */

import { google } from 'googleapis';
import fetch from 'node-fetch';
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs';
import { resolve } from 'path';

const DOMAIN = process.env.DOMAIN || 'ttandmore.com';
const INDEXNOW_KEY = process.env.INDEXNOW_KEY || 'ca7c6a94b42842e5985b351469cfce82';
const SERVICE_ACCOUNT_JSON = process.env.GOOGLE_SERVICE_ACCOUNT_KEY;

const LOG_DIR = resolve(process.cwd(), '.agents/scripts/logs');
if (!existsSync(LOG_DIR)) mkdirSync(LOG_DIR, { recursive: true });

const logPath = resolve(LOG_DIR, `index-${new Date().toISOString().split('T')[0]}.log`);
const log = (msg) => {
  const line = `[${new Date().toISOString()}] ${msg}`;
  console.log(line);
  writeFileSync(logPath, line + '\n', { flag: 'a' });
};

// -------------------------------------------------------------------------
// 1. Extract URLs from sitemap.xml
// -------------------------------------------------------------------------
const sitemapPath = resolve(process.cwd(), 'public/sitemap.xml');
if (!existsSync(sitemapPath)) {
  log('ERROR: public/sitemap.xml not found. Run auto_sitemap.js first.');
  process.exit(1);
}

const sitemapXml = readFileSync(sitemapPath, 'utf-8');
const locMatches = [...sitemapXml.matchAll(/<loc>([^<]+)<\/loc>/g)];
const urls = locMatches.map(m => m[1]);
log(`Found ${urls.length} URLs in sitemap.xml`);

if (urls.length === 0) {
  log('ERROR: No URLs found in sitemap. Aborting.');
  process.exit(1);
}

// -------------------------------------------------------------------------
// 2. Submit to Google Indexing API v3 (requires service account)
// -------------------------------------------------------------------------
async function submitToGoogle() {
  if (!SERVICE_ACCOUNT_JSON) {
    log('SKIP: GOOGLE_SERVICE_ACCOUNT_KEY not set — skipping Google Indexing API');
    return { submitted: 0, failed: urls.length };
  }

  let credentials;
  try {
    credentials = JSON.parse(SERVICE_ACCOUNT_JSON);
    log(`Using service account: ${credentials.client_email}`);
  } catch (e) {
    log(`ERROR: Invalid GOOGLE_SERVICE_ACCOUNT_KEY JSON: ${e.message}`);
    log(`First 80 chars of secret: ${SERVICE_ACCOUNT_JSON.slice(0, 80)}...`);
    return { submitted: 0, failed: urls.length };
  }

  const jwtClient = new google.auth.JWT(
    credentials.client_email,
    null,
    credentials.private_key,
    ['https://www.googleapis.com/auth/indexing']
  );

  try {
    await jwtClient.authorize();
    log('✓ Authorized with Google Indexing API');
  } catch (authErr) {
    log(`✗ Google auth failed: ${authErr.message}`);
    log(`  Hint: check service account has Owner role in Search Console property`);
    return { submitted: 0, failed: urls.length };
  }

  // Limit is 200 URLs/day — hard-cap here
  const urlsToSubmit = urls.slice(0, 200);
  if (urls.length > 200) {
    log(`WARN: ${urls.length} URLs exceeds 200/day limit. Submitting first 200.`);
  }

  let submitted = 0, failed = 0;
  for (const url of urlsToSubmit) {
    try {
      const response = await fetch('https://indexing.googleapis.com/v3/urlNotifications:publish', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${(await jwtClient.getAccessToken()).token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          url: url,
          type: 'URL_UPDATED'
        })
      });

      if (response.ok) {
        submitted++;
        log(`✓ Google: ${url}`);
      } else {
        failed++;
        const errText = await response.text();
        log(`✗ Google ${response.status}: ${url} — ${errText.slice(0, 200)}`);
      }
    } catch (e) {
      failed++;
      log(`✗ Google ERROR: ${url} — ${e.message}`);
    }

    // gentle rate-limit: 100ms between requests
    await new Promise(r => setTimeout(r, 100));
  }

  return { submitted, failed };
}

// -------------------------------------------------------------------------
// 3. Submit to IndexNow (Bing/Yandex/Seznam/Naver in one call)
// -------------------------------------------------------------------------
async function submitToIndexNow() {
  if (!INDEXNOW_KEY || INDEXNOW_KEY.includes('PLACEHOLDER')) {
    log('SKIP: INDEXNOW_KEY not set — skipping IndexNow');
    return { submitted: 0, failed: urls.length };
  }

  const payload = {
    host: DOMAIN,
    key: INDEXNOW_KEY,
    keyLocation: `https://${DOMAIN}/${INDEXNOW_KEY}.txt`,
    urlList: urls
  };

  try {
    // api.indexnow.org fans out to Bing, Yandex, Seznam, Naver
    const response = await fetch('https://api.indexnow.org/IndexNow', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
      body: JSON.stringify(payload)
    });

    if (response.ok || response.status === 200 || response.status === 202) {
      log(`✓ IndexNow: submitted ${urls.length} URLs (HTTP ${response.status})`);
      return { submitted: urls.length, failed: 0 };
    } else {
      const errText = await response.text();
      log(`✗ IndexNow ${response.status}: ${errText.slice(0, 300)}`);
      return { submitted: 0, failed: urls.length };
    }
  } catch (e) {
    log(`✗ IndexNow ERROR: ${e.message}`);
    return { submitted: 0, failed: urls.length };
  }
}

// -------------------------------------------------------------------------
// Main
// -------------------------------------------------------------------------
(async () => {
  log(`=== Auto-indexing ${DOMAIN} (${urls.length} URLs) ===`);

  const [google_result, indexnow_result] = await Promise.all([
    submitToGoogle(),
    submitToIndexNow()
  ]);

  log(`SUMMARY: Google ${google_result.submitted}/${google_result.submitted + google_result.failed} | IndexNow ${indexnow_result.submitted}/${indexnow_result.submitted + indexnow_result.failed}`);

  // Exit non-zero only if BOTH failed (allows partial success)
  if (google_result.submitted === 0 && indexnow_result.submitted === 0) {
    log('FAIL: Both Google and IndexNow submissions failed.');
    process.exit(1);
  }

  log('DONE.');
})();
