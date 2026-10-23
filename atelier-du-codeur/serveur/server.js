/* Serveur de compilation Arduino Nano (arduino-cli) + service de la page web.
 * Aucune dépendance npm : Node.js 18+ suffit.
 *   POST /compile  { code, board:"nano" }  ->  { hex }  ou  { error }
 *   GET  /health   ->  { ok:true }
 *   GET  /*        ->  fichiers du dossier public/
 */
'use strict';
const http = require('http');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { execFile } = require('child_process');

const PORT = Number(process.env.PORT) || 3000;
const HOST = process.env.HOST || '127.0.0.1';          // 0.0.0.0 pour ouvrir au réseau local
const CLI = process.env.ARDUINO_CLI || 'arduino-cli';
const ORIGIN = process.env.ALLOWED_ORIGIN || '*';       // restreins-le si le serveur est exposé
const FQBN = 'arduino:avr:nano:cpu=atmega328';
const MAX_CODE = 64 * 1024;
const MAX_PARALLEL = Number(process.env.MAX_PARALLEL) || 2;
const MAX_QUEUE = 20;
const TIMEOUT_MS = 90 * 1000;
const RATE_PER_MIN = Number(process.env.RATE_PER_MIN) || 30;
const PUBLIC = path.join(__dirname, 'public');

/* ---------- Limites : file d'attente et débit par adresse ---------- */
let running = 0;
const waiting = [];
function acquire() {
  if (running < MAX_PARALLEL) { running++; return Promise.resolve(); }
  if (waiting.length >= MAX_QUEUE) return Promise.reject(Object.assign(new Error('Serveur occupé, réessaie dans un instant.'), { status: 503 }));
  return new Promise((res) => waiting.push(res));
}
function release() {
  const next = waiting.shift();
  if (next) next(); else running--;
}
const hits = new Map();
function rateLimited(ip) {
  const now = Date.now();
  const list = (hits.get(ip) || []).filter((t) => now - t < 60000);
  list.push(now);
  hits.set(ip, list);
  return list.length > RATE_PER_MIN;
}
setInterval(() => { const now = Date.now(); for (const [ip, l] of hits) if (!l.some((t) => now - t < 60000)) hits.delete(ip); }, 60000).unref();

/* ---------- Validation du code reçu ---------- */
/* Seule la bibliothèque Servo est autorisée : pas d'inclusion de fichiers arbitraires du serveur. */
function checkCode(code) {
  if (typeof code !== 'string' || !code.trim()) return 'Aucun code reçu.';
  if (code.length > MAX_CODE) return 'Programme trop long.';
  if (code.indexOf('%:') >= 0) return 'Code non autorisé.';
  if (/\b(__)?asm(__)?\b/.test(code)) return 'Code non autorisé.';
  for (const line of code.split(/\r?\n/)) {
    const t = line.trim();
    if (t[0] === '#' && !/^#include\s*<Servo\.h>$/.test(t)) return 'Directive non autorisée : ' + t.slice(0, 40);
  }
  return null;
}

/* ---------- Compilation ---------- */
function run(cmd, args, timeout) {
  return new Promise((resolve, reject) => {
    execFile(cmd, args, { timeout: timeout || TIMEOUT_MS, maxBuffer: 2 * 1024 * 1024 }, (err, stdout, stderr) => {
      if (err) { err.stdout = stdout; err.stderr = stderr; reject(err); } else resolve(stdout);
    });
  });
}

async function compile(code) {
  const dir = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'blocs-'));
  const sketch = path.join(dir, 'sketch');
  const out = path.join(dir, 'out');
  try {
    await fs.promises.mkdir(sketch);
    await fs.promises.writeFile(path.join(sketch, 'sketch.ino'), code, 'utf8');
    try {
      await run(CLI, ['compile', '--fqbn', FQBN, '--output-dir', out, sketch]);
    } catch (e) {
      if (e.code === 'ENOENT') throw Object.assign(new Error('arduino-cli est introuvable sur le serveur.'), { status: 500 });
      if (e.killed) throw Object.assign(new Error('La compilation a pris trop de temps.'), { status: 504 });
      const msg = String(e.stderr || e.stdout || e.message).split(dir).join('').replace(/\/sketch\//g, '').trim();
      throw Object.assign(new Error(msg.slice(0, 3000) || 'Échec de la compilation.'), { status: 400 });
    }
    return await fs.promises.readFile(path.join(out, 'sketch.ino.hex'), 'utf8');
  } finally {
    fs.promises.rm(dir, { recursive: true, force: true }).catch(() => {});
  }
}

/* ---------- État de la chaîne d'outils (pour l'assistant d'installation de la page) ---------- */
let healthCache = { t: 0, v: null };
async function toolchainStatus() {
  const age = Date.now() - healthCache.t;
  const v0 = healthCache.v;
  if (v0 && age < (v0.cli && v0.avr ? 15000 : 2000)) return v0;
  let cli = false, avr = false;
  try { await run(CLI, ['version'], 8000); cli = true; } catch (e) { /* arduino-cli absent */ }
  if (cli) {
    try { avr = /^arduino:avr\s/m.test(await run(CLI, ['core', 'list'], 15000)); } catch (e) { /* noyau absent */ }
  }
  healthCache = { t: Date.now(), v: { ok: true, cli: cli, avr: avr } };
  return healthCache.v;
}

/* ---------- HTTP ---------- */
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.json': 'application/json', '.png': 'image/png', '.gif': 'image/gif', '.svg': 'image/svg+xml', '.mp3': 'audio/mpeg',
  '.ogg': 'audio/ogg', '.wav': 'audio/wav' };

function send(res, status, body, headers) {
  const isObj = typeof body === 'object' && !Buffer.isBuffer(body);
  res.writeHead(status, Object.assign({
    'Access-Control-Allow-Origin': ORIGIN,
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Private-Network': 'true',
    'X-Content-Type-Options': 'nosniff',
  }, isObj ? { 'Content-Type': 'application/json' } : {}, headers));
  res.end(isObj ? JSON.stringify(body) : body);
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let size = 0, tooBig = false;
    const chunks = [];
    req.on('data', (c) => {
      if (tooBig) return;                 // on ignore la suite, sans la garder en mémoire
      size += c.length;
      if (size > MAX_CODE + 1024) { tooBig = true; chunks.length = 0; reject(Object.assign(new Error('Requête trop grande.'), { status: 413 })); }
      else chunks.push(c);
    });
    req.on('end', () => { if (!tooBig) resolve(Buffer.concat(chunks).toString('utf8')); });
    req.on('error', reject);
  });
}

async function handleCompile(req, res) {
  if (rateLimited(req.socket.remoteAddress)) return send(res, 429, { error: 'Trop de demandes, patiente une minute.' });
  let data;
  try { data = JSON.parse(await readBody(req)); } catch (e) {
    return send(res, e.status || 400, { error: e.status ? e.message : 'JSON invalide.' }, e.status === 413 ? { Connection: 'close' } : {});
  }
  if (data.board && data.board !== 'nano') return send(res, 400, { error: 'Carte non prise en charge : ' + data.board });
  const problem = checkCode(data.code);
  if (problem) return send(res, 400, { error: problem });
  try {
    await acquire();
  } catch (e) { return send(res, e.status, { error: e.message }); }
  try {
    send(res, 200, { hex: await compile(data.code) });
  } catch (e) {
    send(res, e.status || 500, { error: e.message });
  } finally {
    release();
  }
}

const WELCOME = '<!doctype html><html lang="fr"><meta charset="utf-8"><title>Serveur de L\'atelier du codeur</title>'
  + '<body style="font:18px/1.5 system-ui,sans-serif;max-width:34em;margin:12vh auto;padding:0 1em;color:#2b2d42">'
  + '<h1 style="color:#0b6e75">Le serveur fonctionne ✔</h1>'
  + '<p>C\'est lui qui compile tes programmes pour la carte. Laisse-le allumé, puis retourne sur la page de '
  + '<b>L\'atelier du codeur</b> : elle va le trouver toute seule.</p></body></html>';

function handleStatic(req, res) {
  let rel;
  try { rel = decodeURIComponent(new URL(req.url, 'http://x').pathname); } catch (e) { return send(res, 400, 'Requête invalide'); }
  if (rel.endsWith('/')) rel += 'index.html';
  const file = path.join(PUBLIC, path.normalize(rel));
  if (file !== PUBLIC && !file.startsWith(PUBLIC + path.sep)) return send(res, 403, 'Interdit');
  fs.readFile(file, (err, buf) => {
    if (err && /(^|[\\/])index\.html$/.test(file)) return send(res, 200, WELCOME, { 'Content-Type': 'text/html; charset=utf-8' });
    if (err) return send(res, 404, 'Introuvable');
    send(res, 200, buf, { 'Content-Type': TYPES[path.extname(file).toLowerCase()] || 'application/octet-stream' });
  });
}

const server = http.createServer((req, res) => {
  const pathname = req.url.split('?')[0];
  if (req.method === 'OPTIONS') return send(res, 204, '');
  if (req.method === 'POST' && pathname === '/compile') return handleCompile(req, res);
  if (req.method === 'GET' && pathname === '/health') return toolchainStatus().then((v) => send(res, 200, v));
  if (req.method === 'GET') return handleStatic(req, res);
  send(res, 405, { error: 'Méthode non autorisée.' });
});

if (require.main === module) {
  server.listen(PORT, HOST, () => console.log('L\'atelier du codeur : http://' + (HOST === '0.0.0.0' ? 'localhost' : HOST) + ':' + PORT));
}
module.exports = { server, checkCode };
