/* Flasheur STK500v1 pour Arduino Nano (ATmega328P) via Web Serial.
 * Gère les deux bootloaders : nouveau (115200 bauds) et ancien (57600 bauds).
 * Aucune dépendance : fonctionne hors ligne. */
(function (root) {
  'use strict';

  const PAGE = 128;            // taille de page de l'ATmega328P (octets)
  const MAX_FLASH = 30720;     // 32 Ko moins la place de l'ancien bootloader (2 Ko)
  const INSYNC = 0x14, OK = 0x10;
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

  /* ---------- Lecture du fichier Intel HEX ---------- */
  function parseHex(text) {
    const mem = new Uint8Array(MAX_FLASH).fill(0xff);
    let ext = 0, max = 0;
    for (const raw of text.split(/\r?\n/)) {
      const line = raw.trim();
      if (!line) continue;
      if (line[0] !== ':') throw new Error('Fichier HEX invalide');
      const len = parseInt(line.substr(1, 2), 16);
      const addr = parseInt(line.substr(3, 4), 16);
      const type = parseInt(line.substr(7, 2), 16);
      const bytes = [];
      for (let i = 0; i < len; i++) bytes.push(parseInt(line.substr(9 + i * 2, 2), 16));
      let sum = len + (addr >> 8) + (addr & 255) + type;
      for (const b of bytes) sum += b;
      const chk = parseInt(line.substr(9 + len * 2, 2), 16);
      if (((sum + chk) & 255) !== 0) throw new Error('Somme de contrôle HEX incorrecte');
      if (type === 0) {
        const base = ext + addr;
        if (base + len > MAX_FLASH) throw new Error('Programme trop grand pour la Nano');
        for (let i = 0; i < len; i++) mem[base + i] = bytes[i];
        max = Math.max(max, base + len);
      } else if (type === 2) {
        ext = ((bytes[0] << 8) | bytes[1]) * 16;
      } else if (type === 4) {
        ext = ((bytes[0] << 8) | bytes[1]) * 65536;
      } else if (type === 1) {
        break;
      }
    }
    if (max === 0) throw new Error('Fichier HEX vide');
    const padded = Math.ceil(max / PAGE) * PAGE;
    return mem.slice(0, padded);
  }

  /* ---------- Protocole STK500v1 ---------- */
  class Stk500 {
    constructor(io) { this.io = io; this.seen = []; }

    noteBytes(r) { for (let i = 0; i < r.length && this.seen.length < 8; i++) this.seen.push(r[i]); }

    async cmd(bytes, respLen = 0, timeout = 600) {
      await this.io.write(Uint8Array.from(bytes));
      const r = await this.io.read(respLen + 2, timeout);
      this.noteBytes(r);
      if (r.length < respLen + 2) throw new Error('Pas de réponse de la carte');
      if (r[0] !== INSYNC || r[r.length - 1] !== OK) throw new Error('Réponse inattendue de la carte');
      return r.slice(1, 1 + respLen);
    }

    async sync(tries) {
      for (let i = 0; i < tries; i++) {
        this.io.flush();
        try { await this.cmd([0x30, 0x20], 0, 150); return true; } catch (e) { /* on réessaie */ }
        await sleep(50);
      }
      return false;
    }

    async loadAddress(byteAddr) {
      const w = byteAddr >> 1; // adresse en mots
      await this.cmd([0x55, w & 255, (w >> 8) & 255, 0x20]);
    }

    async upload(data, onProgress) {
      const pages = data.length / PAGE;
      await this.cmd([0x50, 0x20]); // entrer en mode programmation
      for (let p = 0; p < pages; p++) {
        const off = p * PAGE;
        await this.loadAddress(off);
        await this.cmd([0x64, 0x00, PAGE, 0x46, ...data.subarray(off, off + PAGE), 0x20], 0, 1500);
        if (onProgress) onProgress((p + 1) / (pages * 2));
      }
      for (let p = 0; p < pages; p++) { // vérification
        const off = p * PAGE;
        await this.loadAddress(off);
        const back = await this.cmd([0x74, 0x00, PAGE, 0x46, 0x20], PAGE, 1500);
        for (let i = 0; i < PAGE; i++) {
          if (back[i] !== data[off + i]) throw new Error('Vérification échouée à l\'octet ' + (off + i));
        }
        if (onProgress) onProgress(0.5 + (p + 1) / (pages * 2));
      }
      await this.cmd([0x51, 0x20]); // quitter : la carte démarre le programme
    }
  }

  /* ---------- Port série du navigateur ---------- */
  class WebSerialIO {
    constructor(port) { this.port = port; this.buf = []; }

    async open(baud) {
      await this.port.open({ baudRate: baud });
      this.writer = this.port.writable.getWriter();
      this.reader = this.port.readable.getReader();
      this.buf.length = 0;
      this._pump();
    }
    async _pump() {
      try {
        for (;;) {
          const { value, done } = await this.reader.read();
          if (done) break;
          if (value) for (const b of value) this.buf.push(b);
        }
      } catch (e) { /* port fermé */ }
    }
    async write(u8) { await this.writer.write(u8); }
    async read(n, timeout) {
      const end = Date.now() + timeout;
      while (this.buf.length < n && Date.now() < end) await sleep(2);
      return Uint8Array.from(this.buf.splice(0, Math.min(n, this.buf.length)));
    }
    flush() { this.buf.length = 0; }
    async reset() {
      await this.port.setSignals({ dataTerminalReady: false, requestToSend: false });
      await sleep(250);
      await this.port.setSignals({ dataTerminalReady: true, requestToSend: true });
      await sleep(50);
    }
    async close() {
      try { await this.reader.cancel(); } catch (e) {}
      try { this.reader.releaseLock(); } catch (e) {}
      try { this.writer.releaseLock(); } catch (e) {}
      try { await this.port.close(); } catch (e) {}
    }
  }

  /* ---------- Fonction principale ---------- */
  async function flashNano(port, hexText, log, onProgress) {
    log = log || function () {};
    const data = parseHex(hexText);
    const io = new WebSerialIO(port);
    const hex = (a) => Array.from(a).map((b) => b.toString(16).padStart(2, '0')).join(' ');
    let seen = [];
    for (const manual of [false, true]) {
      for (const baud of [115200, 57600]) {
        log('Connexion à la carte (' + baud + ' bauds)'
          + (manual ? ' : appuie sur le bouton RESET de la carte maintenant (8 secondes)' : '') + '…');
        await io.open(baud);
        const stk = new Stk500(io);
        if (!manual) await io.reset();
        if (await stk.sync(manual ? 40 : 12)) {
          log('Carte détectée, envoi du programme (' + data.length + ' octets)…');
          try { await stk.upload(data, onProgress); } finally { await io.close(); }
          return { baud: baud, bytes: data.length };
        }
        seen = seen.concat(stk.seen);
        await io.close();
      }
    }
    throw new Error('La carte ne répond pas. '
      + (seen.length
        ? 'Octets reçus de la carte : ' + hex(seen.slice(0, 8)) + ' (vitesse ou type de carte non compatible ?).'
        : 'Aucun octet reçu : mauvais port, câble sans transmission de données, ou carte non reconnue par Windows.'));
  }

  const api = { parseHex, Stk500, WebSerialIO, flashNano, PAGE };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.Flasher = api;
})(typeof window !== 'undefined' ? window : globalThis);
