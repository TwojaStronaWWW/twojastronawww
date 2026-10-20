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

  test('Sekcja <head> zawiera kodowanie UTF-8, meta viewport oraz tagi SEO (robots, canonical, manifest, Schema.org)', () => {
    for (const [name, content] of [['index.html', indexContent], ['jak-pracuje.html', jakPracujeContent]]) {
      assert.match(content, /<meta\s+charset=["']?utf-8/i, `Brak deklaracji UTF-8 w ${name}`);
      assert.match(content, /<meta\s+name=["']viewport["']/i, `Brak meta viewport w ${name}`);
      assert.match(content, /<title>[^<]+<\/title>/i, `Brak tagu <title> w ${name}`);
      assert.match(content, /<meta\s+name=["']description["']/i, `Brak meta description w ${name}`);
      assert.match(content, /<meta\s+name=["']robots["']\s+content=["']index,\s*follow["']/i, `Brak poprawnego meta robots (index, follow) w ${name}`);
      assert.match(content, /<link\s+rel=["']canonical["']/i, `Brak linku canonical w ${name}`);
      assert.match(content, /<link\s+rel=["']manifest["']/i, `Brak manifestu PWA w ${name}`);
      assert.match(content, /<script\s+type=["']application\/ld\+json["']/i, `Brak danych strukturalnych Schema.org w ${name}`);
    }
  });

  test('Formularz kontaktowy w index.html zawiera wymagane pola (name, email, message, honeypot) oraz wyrównany do lewej checkbox zgody', () => {
    assert.match(indexContent, /<form[^>]*id=["']contactForm["']/i, 'Brak formularza #contactForm w index.html');
    assert.match(indexContent, /name=["']name["']/i, 'Brak pola name w formularzu');
    assert.match(indexContent, /name=["']email["']/i, 'Brak pola email w formularzu');
    assert.match(indexContent, /name=["']message["']/i, 'Brak pola message w formularzu');
    // Honeypot field
    assert.match(indexContent, /name=["']website_url["']/i, 'Brak pola honeypot website_url chroniącego przed botami');
    // Checkbox alignment in CSS
    const styleCssPath = path.join(ROOT_DIR, 'assets', 'css', 'style.css');
    const styleCssContent = fs.readFileSync(styleCssPath, 'utf8');
    assert.match(styleCssContent, /:not\(\[type=["']checkbox["']\]\)/i, 'Selektor inputów w .contact-form musi wykluczać checkboxy (:not([type="checkbox"])), aby nie nadawać im width: 100%');
    assert.match(styleCssContent, /\.form-consent-label\s*\{[^}]*justify-content:\s*flex-start/is, 'Klasa .form-consent-label musi wyrównywać checkbox i tekst do lewej (justify-content: flex-start)');
  });

  test('Skrypty JS (w tym asystent AI) i style CSS są poprawnie podpięte w index.html i jak-pracuje.html', () => {
    assert.match(indexContent, /href=["'][^"']*style\.css(?:\?[^"']*)?["']/i, 'Brak podpięcia style.css w index.html');
    assert.match(indexContent, /src=["'][^"']*contact\.js(?:\?[^"']*)?["']/i, 'Brak podpięcia contact.js w index.html');
    assert.match(indexContent, /src=["'][^"']*main\.js(?:\?[^"']*)?["']/i, 'Brak podpięcia main.js w index.html');
    assert.match(indexContent, /src=["'][^"']*ai-widget\.js["']/i, 'Brak podpięcia ai-widget.js w index.html');

    assert.match(jakPracujeContent, /href=["'][^"']*style\.css(?:\?[^"']*)?["']/i, 'Brak podpięcia style.css w jak-pracuje.html');
    assert.match(jakPracujeContent, /src=["'][^"']*main\.js(?:\?[^"']*)?["']/i, 'Brak podpięcia main.js w jak-pracuje.html');
    assert.match(jakPracujeContent, /src=["'][^"']*ai-widget\.js["']/i, 'Brak podpięcia ai-widget.js w jak-pracuje.html');
    assert.doesNotMatch(jakPracujeContent, /script\.js/i, 'Wykryto martwe odwołanie do script.js w jak-pracuje.html');

    const htaccess = fs.readFileSync(path.join(ROOT_DIR, '.htaccess'), 'utf8');
    assert.match(htaccess, /microphone=\(self\)/, 'Nagłówek Permissions-Policy w .htaccess musi zezwalać na microphone=(self) dla dyktowania głosowego w Asystencie AI');
  });

  test('Pliki HTML są czyste i nie zawierają wiszących śmieciowych komentarzy testowych', () => {
    assert.doesNotMatch(indexContent, /<!--p ltleklsuyuk/i, 'index.html zawiera śmieciowy komentarz');
    assert.doesNotMatch(jakPracujeContent, /<!-- test,/i, 'jak-pracuje.html zawiera śmieciowy komentarz testowy');
  });

  test('jak-pracuje.html posiada kompletną strukturę etapów procesu, SLA, bezpieczeństwa i FAQ', () => {
    assert.match(jakPracujeContent, /id=["']proces["']/i, 'Brak sekcji procesu #proces w jak-pracuje.html');
    assert.match(jakPracujeContent, /id=["']stack["']/i, 'Brak sekcji stacku #stack w jak-pracuje.html');
    assert.match(jakPracujeContent, /id=["']bezpieczenstwo["']/i, 'Brak sekcji bezpieczeństwa #bezpieczenstwo');
    assert.match(jakPracujeContent, /id=["']faq["']/i, 'Brak sekcji #faq w jak-pracuje.html');
    assert.match(jakPracujeContent, /application\/ld\+json/i, 'Brak danych strukturalnych Schema.org w jak-pracuje.html');
    assert.match(jakPracujeContent, /rel=["']canonical["']/i, 'Brak linku canonical w jak-pracuje.html');
  });

  test('pliki HTML używają wektorowego favicona SVG i nie zawierają surowych kolorowych emoji', () => {
    for (const [name, content] of [['index.html', indexContent], ['jak-pracuje.html', jakPracujeContent]]) {
      assert.match(content, /href=["'][^"']*favicon\.svg["']/i, `Brak podpięcia favicon.svg w ${name}`);
      const rawEmojis = content.match(/[\p{Extended_Pictographic}]/ug);
      assert.strictEqual(rawEmojis, null, `Wykryto niedozwolone surowe emoji w ${name}: ${rawEmojis?.join(' ')}`);
    }
  });

  test('Sekcja .hero posiada wkomponowane tło studyjne z efektem Motion Blur (hero-motion-bg.jpg) z maską gradientową', () => {
    const heroBgPath = path.join(ROOT_DIR, 'assets', 'img', 'hero-motion-bg.jpg');
    assert.ok(fs.existsSync(heroBgPath), 'Brak pliku grafiki tła assets/img/hero-motion-bg.jpg');
    const stats = fs.statSync(heroBgPath);
    assert.ok(stats.size > 10000 && stats.size < 250000, 'Plik hero-motion-bg.jpg powinien być zoptymalizowany pod kątem LCP (< 250 KB)');

    const styleCssPath = path.join(ROOT_DIR, 'assets', 'css', 'style.css');
    const styleCssContent = fs.readFileSync(styleCssPath, 'utf8');
    assert.match(styleCssContent, /\.hero::after\s*\{[^}]*hero-motion-bg\.jpg/is, 'Brak osadzenia hero-motion-bg.jpg w .hero::after w style.css');
    assert.match(styleCssContent, /\.hero::after\s*\{[^}]*mask-image:\s*radial-gradient/is, 'Brak maski radial-gradient na .hero::after w style.css');
  });

  test('Pływająca ikonka wiadomości (.sticky-call-btn) nad czatem jest usunięta, a widok mobilny zabezpieczony przed poziomym przesunięciem', () => {
    assert.doesNotMatch(indexContent, /sticky-call-btn/i, 'index.html nie powinien zawierać zduplikowanej ikonki wiadomości nad czatem (.sticky-call-btn)');
    assert.doesNotMatch(jakPracujeContent, /sticky-call-btn/i, 'jak-pracuje.html nie powinien zawierać zduplikowanej ikonki wiadomości nad czatem (.sticky-call-btn)');

    const styleCssPath = path.join(ROOT_DIR, 'assets', 'css', 'style.css');
    const styleCssContent = fs.readFileSync(styleCssPath, 'utf8');
    assert.doesNotMatch(styleCssContent, /\.sticky-call-btn/i, 'style.css nie powinien zawierać martwych reguł .sticky-call-btn');
    assert.match(styleCssContent, /html\s*\{[^}]*overflow-x:\s*hidden/is, 'Tag html w style.css musi mieć overflow-x: hidden, aby zablokować poziomy scroll na telefonie');
    assert.match(styleCssContent, /\.hero-btns\s*\{[^}]*flex-wrap:\s*wrap/is, '.hero-btns musi posiadać flex-wrap: wrap, aby przyciski nie rozpychały ekranu mobilnego w prawo');
  });
});

