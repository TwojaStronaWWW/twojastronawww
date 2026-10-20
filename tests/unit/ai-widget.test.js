import { test, describe, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { setupMockDom } from '../helpers/mock-dom.js';
import { formatMarkdown, getLocalFallbackAnswer, initAiWidget } from '../../assets/js/ai-widget.js';

describe('Widget Asystenta AI (assets/js/ai-widget.js)', () => {
  let dom;

  beforeEach(() => {
    dom = setupMockDom();
    const scriptTag = dom.mockDocument.createElement('script');
    scriptTag.setAttribute('data-site-id', 'twojastronawww');
    scriptTag.setAttribute('data-title', 'Asystent TwojaStronaWWW');
    dom.elements.set('ai-script', scriptTag);
  });

  test('formatMarkdown bezpiecznie escapuje HTML (ochrona XSS) i formatuje pogrubienia, listy oraz linki', () => {
    const xss = '<script>alert("xss")</script> **2 499 PLN netto** kontakt@twojastronawww.pl https://twojastronawww.pl\n- Punkt 1\n- Punkt 2';
    const html = formatMarkdown(xss);

    assert.equal(html.includes('<script>'), false);
    assert.ok(html.includes('&lt;script&gt;'));
    assert.ok(html.includes('<strong>2 499 PLN netto</strong>'));
    assert.ok(html.includes('href="mailto:kontakt@twojastronawww.pl"'));
    assert.ok(html.includes('href="https://twojastronawww.pl"'));
    assert.ok(html.includes('<ul class="tsw-ai-list"><li>Punkt 1</li><li>Punkt 2</li></ul>'));
  });

  test('getLocalFallbackAnswer zwraca dopasowane odpowiedzi z bazy wiedzy TwojaStronaWWW.pl', () => {
    assert.match(getLocalFallbackAnswer('Ile kosztuje strona WWW?'), /2 499 PLN netto/);
    assert.match(getLocalFallbackAnswer('Dlaczego kod zamiast WordPressa?'), /Flat-File/);
    assert.match(getLocalFallbackAnswer('Wdrożenie czatbota AI'), /900 PLN netto/);
    assert.match(getLocalFallbackAnswer('Jak wygląda współpraca i ile trwa?'), /7–14 dni roboczych/);
    assert.match(getLocalFallbackAnswer('Pokaż portfolio i realizacje'), /Raricart\.pl/);
    assert.match(getLocalFallbackAnswer('Jaki jest kontakt?'), /kontakt@twojastronawww\.pl/);
  });

  test('initAiWidget tworzy strukturę DOM, obsługuje otwieranie/zamykanie (w tym Escape) i chroni przed duplikacją', () => {
    const widget = initAiWidget(dom.mockDocument, dom.mockWindow);
    assert.ok(widget);
    assert.equal(widget.toggleBtn.getAttribute('aria-expanded'), 'false');

    // Druga próba inicjalizacji zwraca null (ochrona przed duplikacją)
    assert.equal(initAiWidget(dom.mockDocument, dom.mockWindow), null);

    // Otwarcie czatu
    widget.toggleChat();
    assert.equal(widget.chatWindow.classList.contains('tsw-open'), true);
    assert.equal(widget.toggleBtn.getAttribute('aria-expanded'), 'true');

    // Zamknięcie klawiszem Escape
    dom.mockDocument.dispatchEvent({ type: 'keydown', key: 'Escape' });
    assert.equal(widget.chatWindow.classList.contains('tsw-open'), false);
    assert.equal(widget.toggleBtn.getAttribute('aria-expanded'), 'false');
  });

  test('sendQuestion obsługuje odpowiedź z VPS AI Routera oraz fallback przy błędzie sieci', async () => {
    dom.mockWindow.fetch = async () => ({
      ok: true,
      json: async () => ({
        success: true,
        answer: 'Pakiet Strona Firmowa kosztuje **5 499 PLN netto**.'
      })
    });

    const widget = initAiWidget(dom.mockDocument, dom.mockWindow);
    await widget.sendQuestion('Ile kosztuje strona firmowa?');

    assert.equal(widget.getHistory().length, 2);
    assert.equal(widget.getHistory()[0].text, 'Ile kosztuje strona firmowa?');
    assert.match(widget.getHistory()[1].text, /5 499 PLN netto/);

    // Test awarii sieci -> automatyczny fallback bazy wiedzy
    dom.mockWindow.fetch = async () => {
      throw new Error('Network error');
    };
    await widget.sendQuestion('Wdrożenie czatbota AI');
    assert.equal(widget.getHistory().length, 4);
    assert.match(widget.getHistory()[3].text, /900 PLN netto/);

    // Wyczyszczenie historii rozmowy
    widget.clearBtn.dispatchEvent({ type: 'click' });
    assert.equal(widget.getHistory().length, 0);
  });

  test('Response Cache zwraca powtórzone pytanie bez wywołania fetch, ale omija cache dla leadów kontaktowych (telefon/e-mail)', async () => {
    let fetchCalls = 0;
    dom.mockWindow.fetch = async () => {
      fetchCalls++;
      return {
        ok: true,
        json: async () => ({
          success: true,
          answer: 'Dziękuję! Zapisałem kontakt i oddzwonię.'
        })
      };
    };

    const widget = initAiWidget(dom.mockDocument, dom.mockWindow);

    // Zwykłe pytanie -> trafia do cache
    const res1 = await widget.sendQuestion('Ile kosztuje wdrożenie sklepu?');
    assert.equal(fetchCalls, 1);
    assert.equal(res1.cached, false);

    const res2 = await widget.sendQuestion('Ile kosztuje wdrożenie sklepu?');
    assert.equal(fetchCalls, 1);
    assert.equal(res2.cached, true);

    // Lead z telefonem i e-mailem -> omija cache, aby wyzwolić Ntfy 1-Klik na VPS
    await widget.sendQuestion('Proszę o telefon: +48 (600) 700 800 lub mail jan@firma.pl');
    assert.equal(fetchCalls, 2);
    assert.equal(widget.getCachedAnswer('Proszę o telefon: +48 (600) 700 800 lub mail jan@firma.pl'), null);

    await widget.sendQuestion('Proszę o telefon: +48 (600) 700 800 lub mail jan@firma.pl');
    assert.equal(fetchCalls, 3);
  });

  test('Dyktowanie głosowe (Web Speech API — Tryb Bezpieczny): rozpoznaje mowę po polsku na żywo do pola tekstowego bez automatycznego wysyłania', () => {
    let lastInstance = null;
    dom.mockWindow.webkitSpeechRecognition = class MockSpeechRecognition {
      constructor() {
        this.lang = '';
        this.continuous = true;
        this.interimResults = false;
        this.maxAlternatives = 1;
        this.started = false;
        lastInstance = this;
      }
      start() {
        this.started = true;
        if (typeof this.onstart === 'function') this.onstart();
      }
      stop() {
        this.started = false;
        if (typeof this.onend === 'function') this.onend();
      }
    };

    const widget = initAiWidget(dom.mockDocument, dom.mockWindow);

    assert.ok(widget.voiceBtn, 'Przycisk mikrofonu #tswAiVoiceBtn musi istnieć w formularzu czatu');
    assert.equal(widget.voiceBtn.getAttribute('aria-pressed'), 'false');
    assert.equal(widget.isVoiceListening(), false);

    // 1. Kliknięcie mikrofonu uruchamia nasłuchiwanie pl-PL z interimResults=true
    widget.voiceBtn.click();
    assert.ok(lastInstance, 'Instancja SpeechRecognition powinna zostać utworzona');
    assert.equal(lastInstance.lang, 'pl-PL');
    assert.equal(lastInstance.interimResults, true);
    assert.equal(lastInstance.continuous, false);
    assert.equal(widget.isVoiceListening(), true);
    assert.equal(widget.voiceBtn.getAttribute('aria-pressed'), 'true');
    assert.equal(widget.voiceBtn.classList.contains('tsw-listening'), true);

    // 2. Transkrypcja na żywo (interim) wpisuje tekst do pola #tswAiInput
    lastInstance.onresult({
      results: [
        Object.assign([{ transcript: 'Ile kosztuje ' }], { isFinal: true }),
        Object.assign([{ transcript: 'strona firmowa' }], { isFinal: false })
      ]
    });
    assert.equal(widget.chatInput.value, 'Ile kosztuje strona firmowa');

    // 3. Zakończenie wypowiedzi wyłącza mikrofon, ale zostawia tekst w polu do weryfikacji przed wysłaniem
    lastInstance.stop();
    assert.equal(widget.isVoiceListening(), false);
    assert.equal(widget.voiceBtn.getAttribute('aria-pressed'), 'false');
    assert.equal(widget.voiceBtn.classList.contains('tsw-listening'), false);
    assert.equal(widget.chatInput.value, 'Ile kosztuje strona firmowa');
    assert.equal(widget.getHistory().length, 0, 'Tryb bezpieczny nie może wysłać wiadomości automatycznie bez kliknięcia Wyślij');
  });

  test('Cookieless Web Analytics wysyła beacon jako string JSON (Simple Request bez CORS preflight Blob) przy otwarciu czatu i interakcjach', () => {
    const beacons = [];
    dom.mockWindow.navigator = {
      sendBeacon: (url, body) => {
        beacons.push({ url, body });
        return true;
      }
    };

    const widget = initAiWidget(dom.mockDocument, dom.mockWindow);
    widget.toggleChat();

    assert.equal(beacons.length, 1);
    assert.equal(typeof beacons[0].body, 'string', 'Payload sendBeacon musi być stringiem (text/plain Simple Request), aby uniknąć blokady CORS preflight');
    const parsed = JSON.parse(beacons[0].body);
    assert.equal(parsed.site_id, 'twojastronawww');
    assert.equal(parsed.type, 'event');
    assert.equal(parsed.event, 'chat_open');
  });
});

