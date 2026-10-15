import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.join(__dirname, '..', '..');

describe('Weryfikacja skryptu obsługi formularza (assets/js/contact.js)', () => {
  const jsPath = path.join(ROOT_DIR, 'assets', 'js', 'contact.js');
  const jsContent = fs.existsSync(jsPath) ? fs.readFileSync(jsPath, 'utf8') : '';

  test('Plik contact.js istnieje i posiada niezerowy rozmiar', () => {
    assert.ok(jsContent.length > 50, 'contact.js nie powinien być pusty');
  });

  test('Pobiera token CSRF z dedykowanego endpointu api/get-csrf-token.php', () => {
    assert.match(jsContent, /get-csrf-token\.php/i, 'contact.js powinien pobierać token CSRF przed wysłaniem formularza');
  });

  test('Obsługuje wysyłanie formularza metodą POST w formacie JSON z nagłówkiem Content-Type', () => {
    assert.match(jsContent, /fetch\s*\(\s*API_BASE\s*\+\s*['"]contact\.php['"]/i, 'contact.js powinien wysyłać zapytanie do API_BASE + contact.php');
    assert.match(jsContent, /Content-Type['"]?\s*:\s*['"]application\/json['"]/i, 'Powinien deklarować Content-Type application/json');
  });

  test('Obsługuje zgodny z RODO zapis szkicu w localStorage oraz blokadę podwójnego kliknięcia (disabled button)', () => {
    assert.match(jsContent, /localStorage\.setItem/i, 'contact.js powinien zapisywać szkic formularza lokalnie w localStorage (zgodność z RODO)');
    assert.match(jsContent, /localStorage\.getItem/i, 'contact.js powinien przywracać szkic formularza z localStorage');
    assert.match(jsContent, /submission_seconds/i, 'contact.js powinien mierzyć czas interakcji submission_seconds (ochrona Anty-Bot)');
    assert.match(jsContent, /disabled\s*=\s*true/i, 'Przycisk submit powinien być blokowany podczas wysyłania zapytania');
  });
});
