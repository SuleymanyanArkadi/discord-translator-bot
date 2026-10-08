// Импортирует все модули src/ (кроме точек входа, которые сразу подключаются к Discord)
// и проверяет, что они загружаются без ошибок. Точки входа проверяются через `node --check`.
import { execFileSync } from 'node:child_process';
import { readdirSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const src = path.join(root, 'src');
const ENTRYPOINTS = new Set(['index.js', 'deploy-commands.js'].map((f) => path.join(src, f)));

function walk(dir) {
  return readdirSync(dir).flatMap((name) => {
    const full = path.join(dir, name);
    return statSync(full).isDirectory() ? walk(full) : full.endsWith('.js') ? [full] : [];
  });
}

let failed = 0;
for (const file of walk(src)) {
  const rel = path.relative(root, file);
  try {
    if (ENTRYPOINTS.has(file)) execFileSync(process.execPath, ['--check', file]);
    else await import(pathToFileURL(file).href);
    console.log(`ok   ${rel}`);
  } catch (err) {
    failed++;
    console.error(`FAIL ${rel}: ${err.message}`);
  }
}
if (failed) {
  console.error(`\n${failed} модул(ей) с ошибками`);
  process.exit(1);
}
console.log('\nВсе модули импортируются без ошибок');
