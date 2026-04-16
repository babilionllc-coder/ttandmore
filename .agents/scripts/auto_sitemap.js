#!/usr/bin/env node
/**
 * auto_sitemap.js — Regenerate public/sitemap.xml from filesystem
 *
 * Walks the project looking for index.html files, builds a sitemap.xml
 * with hreflang alternates for bilingual sites (assumes /es/ subdirectory
 * for Spanish — adjust SECONDARY_LANG_PREFIX below for other langs).
 *
 * Environment variables:
 *   DOMAIN — e.g., "example.com"
 *   SOURCE_DIR — defaults to "src" (where index.html files live)
 *   OUTPUT_DIR — defaults to "public" (where sitemap.xml is written)
 *   SECONDARY_LANG_PREFIX — defaults to "es" (set to "" to disable hreflang)
 */

import { readdirSync, writeFileSync, statSync, existsSync } from 'fs';
import { resolve, relative, join } from 'path';

const DOMAIN = process.env.DOMAIN || 'ttandmore.com';
const SOURCE_DIR = process.env.SOURCE_DIR || 'src';
const OUTPUT_DIR = process.env.OUTPUT_DIR || 'public';
const SECONDARY_LANG_PREFIX = process.env.SECONDARY_LANG_PREFIX ?? 'es';

// Directories to SKIP during walk (build output, deps, config)
const SKIP_DIRS = new Set([
  'node_modules', '.git', 'dist', 'build', '.next', 'coverage',
  'public', 'assets', 'images', 'api', '.vercel', '.firebase',
  SOURCE_DIR === 'src' ? 'src/src' : null  // Vite's src/src edge case
].filter(Boolean));

// -------------------------------------------------------------------------
// Walk filesystem for index.html files
// -------------------------------------------------------------------------
function walkForIndexFiles(dir, results = []) {
  if (!existsSync(dir)) return results;

  for (const entry of readdirSync(dir)) {
    if (SKIP_DIRS.has(entry)) continue;

    const full = join(dir, entry);
    const stat = statSync(full);

    if (stat.isDirectory()) {
      walkForIndexFiles(full, results);
    } else if (entry === 'index.html') {
      results.push(full);
    }
  }
  return results;
}

const sourceRoot = resolve(process.cwd(), SOURCE_DIR);
const indexFiles = walkForIndexFiles(sourceRoot);
console.log(`Found ${indexFiles.length} index.html files in ${SOURCE_DIR}/`);

// -------------------------------------------------------------------------
// Convert file paths to URL paths
// -------------------------------------------------------------------------
function pathToUrl(filePath) {
  const rel = relative(sourceRoot, filePath);
  const dir = rel.replace(/index\.html$/, '').replace(/\\/g, '/');
  if (dir === '') return '/';
  return '/' + (dir.endsWith('/') ? dir : dir + '/');
}

const allPaths = indexFiles.map(pathToUrl);

// -------------------------------------------------------------------------
// Build hreflang pairs (EN ↔ ES)
// -------------------------------------------------------------------------
function findHreflangAlternates(urlPath) {
  const langPrefix = `/${SECONDARY_LANG_PREFIX}/`;
  const alternates = {};

  if (SECONDARY_LANG_PREFIX && urlPath.startsWith(langPrefix)) {
    // This is a secondary-lang page; EN version is the same path minus the prefix
    const enPath = urlPath.replace(langPrefix, '/');
    alternates.en = `https://${DOMAIN}${enPath}`;
    alternates[SECONDARY_LANG_PREFIX] = `https://${DOMAIN}${urlPath}`;
    alternates.xdefault = `https://${DOMAIN}${enPath}`;
  } else if (SECONDARY_LANG_PREFIX && allPaths.includes(`${langPrefix}${urlPath.slice(1)}`)) {
    // This is EN; secondary-lang version exists
    alternates.en = `https://${DOMAIN}${urlPath}`;
    alternates[SECONDARY_LANG_PREFIX] = `https://${DOMAIN}${langPrefix}${urlPath.slice(1)}`;
    alternates.xdefault = `https://${DOMAIN}${urlPath}`;
  }
  // Pages without a translation partner just get <loc> with no alternates
  return alternates;
}

// -------------------------------------------------------------------------
// Build sitemap.xml
// -------------------------------------------------------------------------
const today = new Date().toISOString().split('T')[0];

const urlEntries = allPaths.map(path => {
  const loc = `https://${DOMAIN}${path}`;
  const alts = findHreflangAlternates(path);

  let entry = `  <url>\n    <loc>${loc}</loc>\n    <lastmod>${today}</lastmod>`;
  if (alts.en) {
    entry += `\n    <xhtml:link rel="alternate" hreflang="en" href="${alts.en}"/>`;
    entry += `\n    <xhtml:link rel="alternate" hreflang="${SECONDARY_LANG_PREFIX}" href="${alts[SECONDARY_LANG_PREFIX]}"/>`;
    entry += `\n    <xhtml:link rel="alternate" hreflang="x-default" href="${alts.xdefault}"/>`;
  }
  entry += `\n  </url>`;
  return entry;
}).join('\n');

const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:xhtml="http://www.w3.org/1999/xhtml">
${urlEntries}
</urlset>
`;

// -------------------------------------------------------------------------
// Write output
// -------------------------------------------------------------------------
const outputPath = resolve(process.cwd(), OUTPUT_DIR, 'sitemap.xml');
writeFileSync(outputPath, xml);
console.log(`✓ Wrote ${allPaths.length} URLs to ${OUTPUT_DIR}/sitemap.xml`);
