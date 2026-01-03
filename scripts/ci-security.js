#!/usr/bin/env node
'use strict';

const fs = require('fs/promises');
const path = require('path');

const targetDir = path.resolve(process.cwd(), process.env.DOCS_DIR || 'docs');

(async () => {
  const exists = await pathExists(targetDir);
  if (!exists) {
    console.error(`docs directory not found at ${targetDir}. Populate docs/ before running the security scan.`);
    process.exit(1);
  }

  const htmlFiles = await collectHtmlFiles(targetDir);
  if (!htmlFiles.length) {
    console.error(`No HTML files found under ${targetDir}.`);
    process.exit(1);
  }

  const allErrors = [];
  const allWarnings = [];

  for (const file of htmlFiles) {
    const relPath = path.relative(process.cwd(), file);
    const content = await fs.readFile(file, 'utf8');
    const errors = [];
    const warnings = [];

    detectSecrets(content).forEach((match) => {
      errors.push(`Suspected secret: ${match}`);
    });

    detectTracking(content).forEach((match) => {
      errors.push(`Tracking script detected: ${match}`);
    });

    findInlineScripts(content).forEach((snippet) => {
      warnings.push(`Inline script detected: ${snippet}`);
    });

    findBlankTargets(content).forEach((href) => {
      warnings.push(`target="_blank" missing rel="noopener noreferrer": ${href}`);
    });

    findHttpAssets(content).forEach((url) => {
      warnings.push(`HTTP asset reference: ${url}`);
    });

    if (errors.length || warnings.length) {
      console.log(`\n${relPath}`);
      errors.forEach((msg) => console.log(`  ERROR: ${msg}`));
      warnings.forEach((msg) => console.log(`  WARN: ${msg}`));
    }

    allErrors.push(...errors);
    allWarnings.push(...warnings);
  }

  if (!allErrors.length && !allWarnings.length) {
    console.log('Security scan completed: no issues found.');
    return;
  }

  if (allWarnings.length) {
    console.log(`\nWarnings: ${allWarnings.length} (non-blocking)`);
  }

  if (allErrors.length) {
    console.error(`\nSecurity scan failed: ${allErrors.length} blocking issue(s) detected.`);
    process.exit(1);
  }
})();

async function collectHtmlFiles(dir) {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await collectHtmlFiles(fullPath)));
    } else if (entry.isFile() && entry.name.toLowerCase().endsWith('.html')) {
      files.push(fullPath);
    }
  }
  return files;
}

async function pathExists(target) {
  try {
    await fs.access(target);
    return true;
  } catch (_) {
    return false;
  }
}

function detectSecrets(content) {
  const sanitized = content.replace(/data-uses-token="[^"]*"/gi, '');
  const patterns = [
    { label: 'AWS style access key', regex: /AKIA[0-9A-Z]{16}/g },
    { label: 'Generic key/token assignment', regex: /(?:api[-_]?key|secret|token|authorization)[^\n\r"'>]{0,20}['"]?[=:]['"]?[A-Za-z0-9_\-\.]{16,}/gi },
    { label: 'Long hex/base64-looking value', regex: /\b[A-Fa-f0-9]{32,}\b/g }
  ];

  const hits = [];
  for (const { label, regex } of patterns) {
    let match;
    while ((match = regex.exec(sanitized)) !== null) {
      hits.push(`${label} (${trimSnippet(match[0])})`);
    }
  }
  return hits;
}

function detectTracking(content) {
  const patterns = [
    /google-analytics\.com\/(?:ga|analytics)\.js/i,
    /googletagmanager\.com\/gtag\/js/i,
    /googletagmanager\.com\/gtm\.js/i,
    /connect\.facebook\.net\/.*\/fbevents\.js/i,
    /fbq\(/i,
    /cdn\.segment\.com\/analytics\.js/i,
    /api\.segment\.io/i,
    /static\.hotjar\.com/i,
    /script\.hotjar\.com/i,
    /clarity\.ms/i
  ];

  const hits = [];
  for (const regex of patterns) {
    if (regex.test(content)) {
      hits.push(regex.source);
    }
  }
  return hits;
}

function findInlineScripts(content) {
  const matches = [];
  const scriptRegex = /<script\b(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/gi;
  let match;
  while ((match = scriptRegex.exec(content)) !== null) {
    const snippet = trimSnippet(match[1]);
    if (snippet) matches.push(snippet);
  }
  return matches;
}

function findBlankTargets(content) {
  const results = [];
  const anchorRegex = /<a\b[^>]*target=["']?_blank["']?[^>]*>/gi;
  let match;
  while ((match = anchorRegex.exec(content)) !== null) {
    const tag = match[0];
    const hasRel = /rel=["'][^"']*(noopener|noreferrer)[^"']*["']/i.test(tag);
    if (!hasRel) {
      const hrefMatch = tag.match(/href=["']([^"']+)["']/i);
      results.push(hrefMatch ? hrefMatch[1] : tag);
    }
  }
  return results;
}

function findHttpAssets(content) {
  const results = [];
  const urlRegex = /(src|href)=["']http:\/\/(?!localhost|127\.0\.0\.1)[^"'>\s]+/gi;
  let match;
  while ((match = urlRegex.exec(content)) !== null) {
    const url = match[0].split('=')[1].replace(/^["']|["']$/g, '');
    results.push(url);
  }
  return results;
}

function trimSnippet(value) {
  return value.trim().replace(/\s+/g, ' ').slice(0, 120);
}
