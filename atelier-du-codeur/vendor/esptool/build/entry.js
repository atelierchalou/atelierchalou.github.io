/* Pont vers esptool-js (Espressif, Apache-2.0) : envoi d'un fichier .bin « fusionné » dans une ESP32 par Web Serial. */
import { ESPLoader, Transport } from 'esptool-js';

async function flash(port, bin, onProgress, onLog) {
  const say = (m) => { if (onLog) onLog(m); };
  const transport = new Transport(port, false);
  const terminal = { clean() {}, writeLine(l) { if (/Chip is|Connecting|Erasing|Hash of data|Wrote/i.test(l)) say(String(l).trim()); }, write() {} };
  const loader = new ESPLoader({ transport: transport, baudrate: 460800, romBaudrate: 115200, terminal: terminal });
  try {
    say('Connexion à l\'ESP32… (si rien ne se passe, maintiens le bouton BOOT de la carte)');
    const chip = await loader.main('default_reset');
    say('Carte détectée : ' + chip);
    await loader.writeFlash({
      fileArray: [{ data: bin, address: 0 }],
      flashMode: 'keep', flashFreq: 'keep', flashSize: 'keep', eraseAll: false, compress: true,
      reportProgress: (i, written, total) => { if (onProgress) onProgress(total ? written / total : 0); },
    });
    await loader.after('hard_reset');
    return { bytes: bin.length, chip: chip };
  } finally {
    try { await transport.disconnect(); } catch (e) { /* déjà fermé */ }
  }
}
window.EspFlasher = { flash: flash };
