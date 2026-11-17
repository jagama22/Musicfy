// expo-modules-jsi compila su xcframework con un `xcodebuild` anidado lanzado con `env -i`,
// así que no hereda CODE_SIGNING_ALLOWED=NO del build principal. En un runner de CI sin
// certificados de Apple ese build anidado falla. Este script añade las opciones de "sin firma".
// Uso: node dev/patch-jsi-signing.mjs [ruta-al-script]
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const file = process.argv[2] ?? path.join(root, 'node_modules/expo-modules-jsi/apple/scripts/build-xcframework.sh');
const src = fs.readFileSync(file, 'utf8');
const MARK = 'CODE_SIGNING_ALLOWED=NO';

if (src.includes(MARK)) {
  console.log('Ya parcheado:', file);
  process.exit(0);
}

const re = /^([ \t]+)SKIP_INSTALL=NO \\\r?\n/m;
const m = src.match(re);
if (!m) {
  console.error('No se encontró la línea SKIP_INSTALL=NO en', file);
  process.exit(1);
}
const indent = m[1];
const out = src.replace(re, `${m[0]}${indent}CODE_SIGNING_ALLOWED=NO CODE_SIGNING_REQUIRED=NO CODE_SIGN_IDENTITY= \\\n`);
fs.writeFileSync(file, out);
console.log('Parcheado:', file);
