#!/usr/bin/env node

/**
 * Version Injection Script
 * Injects a unique version hash into index.html for cache busting
 * Runs before build to ensure every deployment has a unique version
 */

import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const indexPath = path.join(__dirname, '..', 'index.html');

// Generate a unique version hash using current timestamp and random hash
const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
const randomHash = crypto.randomBytes(8).toString('hex');
const version = `${timestamp}-${randomHash}`;

console.log(`[Version Inject] Generated version: ${version}`);

try {
  let content = fs.readFileSync(indexPath, 'utf-8');

  // Replace the version placeholder with actual version
  content = content.replace(
    /(<meta name="app-version" content=")([^"]*)/g,
    `$1${version}`
  );

  fs.writeFileSync(indexPath, content, 'utf-8');
  console.log(`[Version Inject] ✓ Version injected into index.html`);
} catch (error) {
  console.error('[Version Inject] ✗ Error injecting version:', error.message);
  process.exit(1);
}
