import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { setupMockDom } from '../helpers/mock-dom.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.join(__dirname, '..', '..');

describe('Interakcje interfejsu użytkownika i moduł UI (assets/js/main.js)', () => {
  const mainJsPath = path.join(ROOT_DIR, 'assets', 'js', 'main.js');
  assert.ok(fs.existsSync(mainJsPath), 'Plik assets/js/main.js musi istnieć');
  const mainJsContent = fs.readFileSync(mainJsPath, 'utf-8');

  it('plik main.js zawiera moduły initMobileNav, initTechStackExplorer oraz initSmoothScroll', () => {
    assert.match(mainJsContent, /function\s+initMobileNav/i, 'Brak funkcji initMobileNav');
    assert.match(mainJsContent, /function\s+initTechStackExplorer/i, 'Brak funkcji initTechStackExplorer');
    assert.match(mainJsContent, /function\s+initSmoothScroll/i, 'Brak funkcji initSmoothScroll');
  });

  it('baza TECH_DATABASE zawiera kompletne definicje z rolami i korzyściami dla klienta', () => {
    assert.match(mainJsContent, /const\s+TECH_DATABASE\s*=/i, 'Brak obiektu TECH_DATABASE');
    const expectedKeys = ['html_css', 'vanilla_js', 'php_flatfile', 'automation', 'seo_vitals', 'git_security'];
    for (const key of expectedKeys) {
      assert.ok(mainJsContent.includes(`${key}:`), `Brak klucza ${key} w TECH_DATABASE`);
    }
  });

  it('treści marketingowe w main.js są zgodne z zasadą Anti-Jargon (brak LOCK_EX w benefitach)', () => {
    // Sprawdzamy, czy w benefitach dla klienta nie ma technicznego slangu typu LOCK_EX
    const benefitMatches = mainJsContent.match(/benefit:\s*['"][^'"]+['"]/g) || [];
    assert.ok(benefitMatches.length > 0, 'Powinny istnieć opisy korzyści dla klienta');
    for (const benefit of benefitMatches) {
      assert.strictEqual(
        benefit.includes('LOCK_EX'),
        false,
        `Opis korzyści nie może zawierać flagi LOCK_EX: ${benefit}`
      );
    }
  });

  it('helper Mock DOM prawidłowo symuluje środowisko przeglądarkowe w Node.js', () => {
    const { mockWindow, mockDocument, MockElement } = setupMockDom();
    assert.ok(mockWindow, 'MockWindow musi zostać zainicjalizowane');
    assert.ok(mockDocument, 'MockDocument musi zostać zainicjalizowane');
    const elem = new MockElement('div', 'test-id', 'test-class');
    assert.strictEqual(elem.tagName, 'DIV');
    assert.strictEqual(elem.id, 'test-id');
    assert.ok(elem.classList.contains('test-class'));
  });
});
