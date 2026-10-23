/* Pont entre la page et les bibliothèques officielles de la fondation micro:bit (MIT) :
   - @microbit/microbit-fs : insère main.py dans le runtime MicroPython (V1 ou V2) ;
   - @microbit/microbit-universal-hex : un seul fichier valable pour V1 et V2 ;
   - @microbit/microbit-connection : envoi USB direct (WebUSB / DAPLink). */
import { MicropythonFsHex } from '@microbit/microbit-fs';
import { microbitBoardId } from '@microbit/microbit-universal-hex';
import { createUSBConnection } from '@microbit/microbit-connection/usb';

const ID = { V1: microbitBoardId.V1, V2: microbitBoardId.V2 };

function fsFor(script) {
  const H = window.MICROPYTHON_HEX || {};
  if (!H.V1 || !H.V2) throw new Error('Les fichiers MicroPython (micropython-v1.js / micropython-v2.js) ne sont pas chargés.');
  const fs = new MicropythonFsHex([{ boardId: ID.V1, hex: H.V1 }, { boardId: ID.V2, hex: H.V2 }], { maxFsSize: 20 * 1024 });
  fs.write('main.py', script);
  return fs;
}

let conn = null;
const api = {
  /* board : 'V1' | 'V2' | 'universal' */
  buildHex(script, board) {
    const fs = fsFor(script);
    return board === 'universal' ? fs.getUniversalHex() : fs.getIntelHex(ID[board]);
  },
  usbSupported() { return typeof navigator !== 'undefined' && !!navigator.usb && window.isSecureContext; },
  /* Envoi direct : la bibliothèque détecte V1/V2 et fournit le bon hex. onProgress(0..1, partiel) */
  async flashUSB(script, onProgress) {
    const fs = fsFor(script);
    if (!conn) { conn = createUSBConnection(); await conn.initialize(); }
    await conn.connect();
    const version = conn.getBoardVersion();
    await conn.flash(async (v) => fs.getIntelHex(ID[v]), {
      partial: true,
      progress: (stage, value) => { if (onProgress && value !== undefined) onProgress(value, stage); },
    });
    return version;
  },
  async disconnect() { if (conn) { try { await conn.disconnect(); } catch (e) { /* déjà débranchée */ } } },
};
window.MicrobitTools = api;
