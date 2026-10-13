#!/usr/bin/env node
/**
 * Temporary model capture server.
 *
 * Usage:
 *   node scripts/capture-models.mjs              # listens on 127.0.0.1:4545
 *   PORT=9999 node scripts/capture-models.mjs
 *   (bun scripts/capture-models.mjs works too)
 *
 * Then open any game page (dev server or the deployed site) and paste
 * scripts/capture-snippet.js into the browser console. Each game's stored
 * models are POSTed here and written under:
 *
 *   saved-models/<game>/<storage-key>.json     one file per storage key
 *   saved-models/manifest.jsonl                one line per saved key
 *
 * Ctrl-C when done.
 */

import { createServer } from 'node:http';
import {
  appendFileSync,
  existsSync,
  mkdirSync,
  readdirSync,
  statSync,
  writeFileSync,
} from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const PORT = Number(process.env.PORT || 4545);
const HOST = '127.0.0.1';
const OUT_DIR = join(dirname(fileURLToPath(import.meta.url)), '..', 'saved-models');
const GAMES = ['circuit', 'cave', 'highway', 'climb'];
const MAX_BODY = 64 * 1024 * 1024; // 64 MB: localStorage payloads are ~5 MB

/** Storage keys double as file names, so only allow plain key characters. */
const SAFE_KEY = /^[a-z0-9]+(?:_[a-z0-9]+)*$/;

const server = createServer((req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Access-Control-Max-Age', '86400');
  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }
  if (req.method === 'GET' && (req.url === '/' || req.url === '/status')) {
    send(res, 200, { ok: true, outDir: OUT_DIR, games: status() });
    return;
  }
  if (req.method === 'POST' && req.url === '/capture') {
    let body = '';
    req.on('data', (chunk) => {
      body += chunk;
      if (body.length > MAX_BODY) {
        send(res, 413, { ok: false, error: 'payload too large' });
        req.destroy();
      }
    });
    req.on('end', () => handleCapture(body, res));
    return;
  }
  send(res, 404, { ok: false, error: 'unknown route' });
});

function handleCapture(body, res) {
  let data;
  try {
    data = JSON.parse(body);
  } catch {
    send(res, 400, { ok: false, error: 'invalid JSON' });
    return;
  }
  const { game, savedAt, models } = data ?? {};
  if (!GAMES.includes(game)) {
    send(res, 400, { ok: false, error: `unknown game: ${game}` });
    return;
  }
  if (!models || typeof models !== 'object' || Array.isArray(models)) {
    send(res, 400, { ok: false, error: 'models must be a Record<key, model[]>' });
    return;
  }
  const gameDir = join(OUT_DIR, game);
  mkdirSync(gameDir, { recursive: true });
  const files = [];
  console.log(`\n📥 ${game}  (savedAt ${savedAt ?? 'unknown'})`);
  for (const [key, list] of Object.entries(models)) {
    if (!SAFE_KEY.test(key)) {
      console.warn(`  skipping suspicious key: ${key}`);
      continue;
    }
    const file = join(gameDir, `${key}.json`);
    writeFileSync(file, JSON.stringify(list, null, 2));
    const count = Array.isArray(list) ? list.length : null;
    appendFileSync(
      join(OUT_DIR, 'manifest.jsonl'),
      JSON.stringify({ game, key, savedAt, count, at: new Date().toISOString() }) + '\n',
    );
    files.push(`${game}/${key}.json`);
    console.log(`  ${key}.json  ${count ?? '?'} models  ${statSync(file).size} bytes`);
  }
  send(res, 200, { ok: true, files });
}

function status() {
  if (!existsSync(OUT_DIR)) return {};
  const out = {};
  for (const dir of readdirSync(OUT_DIR, { withFileTypes: true })) {
    if (!dir.isDirectory()) continue;
    out[dir.name] = readdirSync(join(OUT_DIR, dir.name)).filter((f) =>
      f.endsWith('.json'),
    );
  }
  return out;
}

function send(res, code, payload) {
  const text = JSON.stringify(payload);
  res.writeHead(code, { 'Content-Type': 'application/json' });
  res.end(text);
}

server.listen(PORT, HOST, () => {
  console.log(`📡 model capture server on http://${HOST}:${PORT}`);
  console.log(`   saving to ${OUT_DIR}`);
  console.log('   paste scripts/capture-snippet.js into a game page console');
});
