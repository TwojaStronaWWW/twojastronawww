import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.join(__dirname, '..', '..');

describe('Integralność i składnia arkuszy stylów CSS (assets/css/style.css)', () => {
  const cssPath = path.join(ROOT_DIR, 'assets', 'css', 'style.css');
  const cssContent = fs.existsSync(cssPath) ? fs.readFileSync(cssPath, 'utf-8') : '';

  it('główny arkusz stylów style.css powinien istnieć i posiadać zbalansowane nawiasy klamrowe {} oraz okrągłe ()', () => {
    assert.ok(cssContent.length > 500, 'Brak lub pusty plik assets/css/style.css');
    const clean = cssContent.replace(/\/\*[\s\S]*?\*\//g, '');
    const openBraces = (clean.match(/\{/g) || []).length;
    const closeBraces = (clean.match(/\}/g) || []).length;
    assert.strictEqual(openBraces, closeBraces, `Niezbalansowane nawiasy {}: otwarte=${openBraces}, zamknięte=${closeBraces}`);

    const openParens = (clean.match(/\(/g) || []).length;
    const closeParens = (clean.match(/\)/g) || []).length;
    assert.strictEqual(openParens, closeParens, `Niezbalansowane nawiasy (): otwarte=${openParens}, zamknięte=${closeParens}`);
  });

  it('główny arkusz powinien definiować zmienne CSS w :root oraz wspierać responsywność (@media)', () => {
    assert.match(cssContent, /:root\s*\{/i);
    assert.match(cssContent, /@media/i);
  });
});
