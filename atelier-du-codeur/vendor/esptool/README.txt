esp-flasher.js : assemblage (esbuild) de esptool-js 0.7.0 (Espressif Systems, licence Apache-2.0, voir LICENSE-esptool-js.txt)
et du pont build/entry.js. Reconstruction : npm i esptool-js esbuild, puis
npx esbuild build/entry.js --bundle --minify --format=iife --outfile=esp-flasher.js
