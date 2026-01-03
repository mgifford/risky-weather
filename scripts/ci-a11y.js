#!/usr/bin/env node
'use strict';

const { chromium } = require('playwright');
const AxeBuilder = require('@axe-core/playwright').default;
const { URL } = require('url');

const baseUrl = (process.env.BASE_URL || 'http://127.0.0.1:4173').trim();
const pageList = parseList(process.env.A11Y_PAGES, ['index.html']);
const excludeList = parseList(process.env.A11Y_EXCLUDE, []);
const tags = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22a', 'wcag22aa'];

if (!pageList.length) {
  console.error('No pages configured. Set A11Y_PAGES to a comma-separated list of paths.');
  process.exit(1);
}

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ baseURL: baseUrl });
  const page = await context.newPage();
  let hasBlockingViolations = false;

  for (const pagePath of pageList) {
    const targetUrl = new URL(pagePath, `${baseUrl.replace(/\/$/, '')}/`).toString();
    console.log(`\nScanning ${targetUrl}`);

    try {
      await page.goto(targetUrl, { waitUntil: 'networkidle' });
      const builder = new AxeBuilder({ page }).withTags(tags);
      excludeList.forEach((selector) => builder.exclude(selector));
      const results = await builder.analyze();
      const violations = results.violations || [];

      if (!violations.length) {
        console.log('  ✅ No violations found');
        continue;
      }

      violations.forEach((violation) => {
        const { id, impact, description, helpUrl, nodes } = violation;
        const isBlocking = ['serious', 'critical'].includes(impact);
        if (isBlocking) hasBlockingViolations = true;
        const label = isBlocking ? 'BLOCKING' : 'WARN';
        console.log(`  ${label}: ${impact || 'unknown'} - ${id}: ${description}`);
        if (helpUrl) console.log(`    Help: ${helpUrl}`);
        nodes.forEach((node) => {
          const selectorList = (node.target || []).join(' | ');
          console.log(`    Node: ${selectorList}`);
          if (node.html) console.log(`    Snippet: ${node.html.trim().slice(0, 200)}`);
        });
      });
    } catch (error) {
      hasBlockingViolations = true;
      console.error(`  ERROR: Failed to scan ${targetUrl}: ${error.message}`);
    }
  }

  await browser.close();

  if (hasBlockingViolations) {
    console.error('\nAccessibility scan failed (serious/critical issues found).');
    process.exit(1);
  }

  console.log('\nAccessibility scan completed with no blocking issues.');
})();

function parseList(value, fallback) {
  if (!value) return fallback;
  return value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}
