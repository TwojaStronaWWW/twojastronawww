import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.join(__dirname, '..', '..');

describe('Integralność semantyczna i standardy HTML5 (TwojaStronaWWW.pl)', () => {
  const indexHtmlPath = path.join(ROOT_DIR, 'index.html');
  const indexContent = fs.existsSync(indexHtmlPath) ? fs.readFileSync(indexHtmlPath, 'utf8') : '';

  const jakPracujeHtmlPath = path.join(ROOT_DIR, 'jak-pracuje.html');
  const jakPracujeContent = fs.existsSync(jakPracujeHtmlPath) ? fs.readFileSync(jakPracujeHtmlPath, 'utf8') : '';

  test('Pliki index.html oraz jak-pracuje.html istnieją i nie są puste', () => {
    assert.ok(indexContent.length > 100, 'index.html powinien zawierać pełny kod strony');
    assert.ok(jakPracujeContent.length > 100, 'jak-pracuje.html powinien zawierać pełny kod strony');
  });

  test('Pliki HTML posiadają poprawny DOCTYPE i atrybut lang="pl"', () => {
    for (const [name, content] of [['index.html', indexContent], ['jak-pracuje.html', jakPracujeContent]]) {
      assert.match(content, /<!DOCTYPE html>/i, `Brak <!DOCTYPE html> w ${name}`);
      assert.match(content, /<html\s+[^>]*lang=["']pl["']/i, `Tag <html> w ${name} musi posiadać lang="pl"`);
    }
  });

  test('Sekcja <head> zawiera kodowanie UTF-8, meta viewport oraz tagi SEO', () => {
    for (const [name, content] of [['index.html', indexContent], ['jak-pracuje.html', jakPracujeContent]]) {
      assert.match(content, /<meta\s+charset=["']?utf-8/i, `Brak deklaracji UTF-8 w ${name}`);
      assert.match(content, /<meta\s+name=["']viewport["']/i, `Brak meta viewport w ${name}`);
      assert.match(content, /<title>[^<]+<\/title>/i, `Brak tagu <title> w ${name}`);
      assert.match(content, /<meta\s+name=["']description["']/i, `Brak meta description w ${name}`);
    }
  });

  test('Formularz kontaktowy w index.html zawiera wymagane pola (name, email, message, honeypot)', () => {
    assert.match(indexContent, /<form[^>]*id=["']contactForm["']/i, 'Brak formularza #contactForm w index.html');
    assert.match(indexContent, /name=["']name["']/i, 'Brak pola name w formularzu');
    assert.match(indexContent, /name=["']email["']/i, 'Brak pola email w formularzu');
    assert.match(indexContent, /name=["']message["']/i, 'Brak pola message w formularzu');
    // Honeypot field
    assert.match(indexContent, /name=["']website_url["']/i, 'Brak pola honeypot website_url chroniącego przed botami');
  });

  test('Skrypty JS i style CSS są poprawnie podpięte', () => {
    assert.match(indexContent, /href=["'][^"']*style\.css(?:\?[^"']*)?["']/i, 'Brak podpięcia style.css w index.html');
    assert.match(indexContent, /src=["'][^"']*contact\.js(?:\?[^"']*)?["']/i, 'Brak podpięcia contact.js w index.html');
  });
});
