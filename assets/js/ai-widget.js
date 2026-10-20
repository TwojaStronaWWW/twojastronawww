/**
 * TwojaStronaWWW.pl - Moduł Asystenta AI (Universal Embeddable AI Agent Widget v3.0)
 *
 * Architektura Platform-First & Zero-Bloat (Vanilla ES6+):
 * - Komunikacja z centralnym routerem AI na VPS (https://ai.twojastronawww.pl/chat-router.php)
 * - Obsługa 11-modelowej kaskady High-Availability (6 dostawców API) po stronie VPS
 * - Priorytetowe przekazywanie leadów kontaktowych (telefon / e-mail omija cache i wyzwala Ntfy 1-Klik)
 * - Dwupoziomowy Response Cache (pamięć podręczna zapytań < 5 ms) z inwalidacją kbVersion
 * - Pamięć rozmowy Multi-Turn (do 8 ostatnich wiadomości w sessionStorage)
 * - Bezpieczny mikro-parser Markdown (100% odporny na XSS)
 * - Szybkie podpowiedzi pytań (Quick Prompts)
 * - Lokalny merytoryczny fallback (Zero-Downtime Knowledge Base) na wypadek braku połączenia z VPS
 */

export const QUICK_PROMPTS_MAP = {
  twojastronawww: [
    'Ile kosztuje strona WWW?',
    'Dlaczego kod zamiast WordPressa?',
    'Wdrożenie czatbota AI',
    'Jak wygląda współpraca?'
  ],
  fuegolingua: [
    'Bezpłatna lekcja próbna',
    'Ile kosztuje kurs hiszpańskiego?',
    'Zajęcia indywidualne czy grupowe?'
  ],
  katosalsahub: [
    'Ile kosztuje karnet?',
    'Czy akceptujecie Multisport?',
    'Kursy od podstaw (P0)'
  ]
};

const CATEGORY_LABELS_PL = {
  steps: 'Kroki (Podstawy)',
  figures: 'Figury (Casino / Rueda)',
  dance: 'Taniec',
  styles: 'Style Tańca',
  music: 'Muzyka',
  instruments: 'Instrumenty',
  bands: 'Zespoły i Artyści',
  history: 'Historia',
  gods: 'Bogowie (Orishas)',
  instructors: 'Instruktorzy',
  schools: 'Szkoły Tańca'
};

/**
 * Normalizuje tekst zapytania do klucza pamięci podręcznej (Response Cache)
 * @param {string} text
 * @returns {string}
 */
export function normalizeCacheQuery(text) {
  if (!text) return '';
  return String(text)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/ł/g, 'l')
    .replace(/[?!.,;:()"'«»„”`~[\]{}/\\|_+-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Usuwa znaki diakrytyczne (PL / ES) i upraszcza tekst do wyszukiwania pełnotekstowego
 * @param {string} text
 * @returns {string}
 */
export function normalizeSearchText(text) {
  if (!text) return '';
  const map = {
    ą: 'a', ć: 'c', ę: 'e', ł: 'l', ń: 'n', ó: 'o', ś: 's', ź: 'z', ż: 'z',
    á: 'a', é: 'e', í: 'i', ú: 'u', ü: 'u', ñ: 'n'
  };
  return String(text)
    .toLowerCase()
    .replace(/[ąćęłńóśźżáéíúüñ]/g, (ch) => map[ch] || ch)
    .replace(/[^a-z0-9\s-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Szybki, deterministyczny skrót wersji bazy wiedzy (FNV-1a 32-bit + rozmiar bazy).
 * @param {Array<Object>} entries
 * @returns {string}
 */
export function computeKnowledgeVersion(entries) {
  if (!Array.isArray(entries) || entries.length === 0) {
    return 'kb_v0_empty';
  }
  let hash = 0x811c9dc5;
  for (let i = 0; i < entries.length; i++) {
    const item = entries[i] || {};
    const cats = Array.isArray(item.category) ? item.category.join(',') : String(item.category || '');
    const record = `${item.id || ''}|${item.term || ''}|${item.definition || ''}|${cats}|${item.status || ''}|${item.verification_count || 0}|${item.last_updated || ''}`;
    for (let j = 0; j < record.length; j++) {
      hash ^= record.charCodeAt(j);
      hash = Math.imul(hash, 0x01000193) >>> 0;
    }
  }
  return `kb_v${entries.length}_${hash.toString(16)}`;
}

/**
 * Przeszukuje dynamiczną bazę wiedzy pod kątem zapytania użytkownika.
 * @param {string} question
 * @param {Array<Object>} entries
 * @param {number} limit
 * @returns {Array<Object>}
 */
export function searchKnowledgeEntries(question, entries, limit = 5) {
  if (!question || !Array.isArray(entries) || entries.length === 0) return [];

  const qNorm = normalizeSearchText(question);
  if (!qNorm) return [];

  const stopWords = new Set([
    'co', 'to', 'jest', 'sa', 'jak', 'jaki', 'jaka', 'jakie', 'gdzie', 'kiedy',
    'czy', 'na', 'w', 'we', 'z', 'ze', 'do', 'od', 'po', 'o', 'i', 'a', 'oraz',
    'lub', 'albo', 'mi', 'sie', 'tym', 'ten', 'ta', 'te', 'oznacza', 'znaczy',
    'opowiedz', 'wyjasnij', 'powiedz', 'czym', 'kim', 'kto', 'mozna', 'jakis'
  ]);

  const rawTokens = qNorm.split(' ').filter((t) => t.length >= 2 && !stopWords.has(t));
  const stems = rawTokens.map((t) => {
    if (t.length >= 6) return t.replace(/(ach|ami|owi|iem|om|ie|ow|ej|ym|im|ia|iu|ek|ka|ki|ce|ke|y|a|e|i|u|o)$/, '');
    if (t.length >= 5) return t.replace(/(ie|ow|ej|ym|ia|ka|ki|ce|y|a|e|i|u)$/, '');
    return t;
  }).filter((s) => s.length >= 3);

  const scored = [];
  for (let i = 0; i < entries.length; i++) {
    const entry = entries[i];
    if (!entry || !entry.term) continue;

    const termNorm = normalizeSearchText(entry.term);
    const termClean = termNorm.replace(/\([^)]*\)/g, '').trim();
    const defNorm = normalizeSearchText(entry.definition || '');

    let score = 0;
    if (termNorm && qNorm === termNorm) {
      score += 120;
    } else if (termClean && termClean.length >= 3 && qNorm.includes(termClean)) {
      score += 85;
    } else if (termNorm && termNorm.length >= 3 && qNorm.includes(termNorm)) {
      score += 80;
    }

    for (const token of rawTokens) {
      if (termNorm.split(' ').includes(token)) {
        score += 45;
      } else if (token.length >= 3 && termNorm.includes(token)) {
        score += 30;
      }
      if (token.length >= 3 && defNorm.includes(token)) {
        score += 10;
      }
    }

    for (const stem of stems) {
      if (stem.length >= 3 && termNorm.includes(stem)) {
        score += 22;
      }
      if (stem.length >= 4 && defNorm.includes(stem)) {
        score += 6;
      }
    }

    if (score > 0) {
      scored.push({ entry, score });
    }
  }

  scored.sort((a, b) => b.score - a.score || String(a.entry.term).localeCompare(String(b.entry.term), 'pl'));
  return scored.slice(0, limit).map((item) => item.entry);
}

/**
 * Buduje zwięzły kontekst RAG z dynamicznej bazy wiedzy do przesłania do routera AI
 * @param {string} question
 * @param {Array<Object>} entries
 * @returns {string}
 */
export function buildDynamicContext(question, entries) {
  if (!Array.isArray(entries) || entries.length === 0) return '';
  const matched = searchKnowledgeEntries(question, entries, 6);
  let context = `[AKTUALNY STAN BAZY WIEDZY (${computeKnowledgeVersion(entries)})]: Łącznie ${entries.length} haseł.\n`;
  if (matched.length > 0) {
    context += 'Najbardziej pasujące hasła na stronie:\n';
    for (const m of matched) {
      const catsLabel = (Array.isArray(m.category) ? m.category : [m.category])
        .map((c) => CATEGORY_LABELS_PL[c] || c)
        .join(', ');
      context += `- **${m.term}** [Kategoria: ${catsLabel}]: ${m.definition}\n`;
    }
  }
  return context.trim();
}

/**
 * Bezpieczny mikro-parser Markdown (100% odporny na XSS)
 * @param {string} rawText
 * @returns {string}
 */
export function formatMarkdown(rawText) {
  if (!rawText) return '';
  let safe = String(rawText)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');

  // Pogrubienia **tekst**
  safe = safe.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');

  // Klikalne adresy URL (https://...)
  safe = safe.replace(
    /(https?:\/\/[^\s<)]+)/g,
    '<a href="$1" target="_blank" rel="noopener noreferrer" class="tsw-ai-link">$1</a>'
  );

  // Klikalne adresy e-mail
  safe = safe.replace(
    /([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/g,
    '<a href="mailto:$1" class="tsw-ai-link">$1</a>'
  );

  const lines = safe.split(/\r?\n/);
  let html = '';
  let inList = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    const bulletMatch = line.match(/^[-*•]\s+(.+)$/);
    if (bulletMatch) {
      if (!inList) {
        html += '<ul class="tsw-ai-list">';
        inList = true;
      }
      html += '<li>' + bulletMatch[1] + '</li>';
    } else {
      if (inList) {
        html += '</ul>';
        inList = false;
      }
      if (line !== '') {
        html += (html && !html.endsWith('</ul>') ? '<br>' : '') + line;
      } else if (html && !html.endsWith('<br>')) {
        html += '<br>';
      }
    }
  }
  if (inList) {
    html += '</ul>';
  }
  return html;
}

/**
 * Lokalna odpowiedź awaryjna oparta na oficjalnej bazie wiedzy TwojaStronaWWW.pl
 * (gwarantuje ciągłość obsługi klienta przy chwilowej niedostępności sieci/tunelu VPS)
 * @param {string} question
 * @param {string} siteId
 * @returns {string}
 */
export function getLocalFallbackAnswer(question, siteId = 'twojastronawww') {
  const q = String(question || '').toLowerCase();

  if (q.includes('wordpress') || q.includes('wtyczk') || q.includes('kod') || q.includes('sql') || q.includes('szybk')) {
    return 'Tworzę strony w **czystym kodzie (architektura Flat-File)** zamiast ciężkiego WordPressa z dziesiątkami wtyczek:\n- **Waga poniżej 100 KB** i ładowanie **< 0.6s** (Google PageSpeed **95–100/100**)\n- **Brak bazy SQL** = zero ryzyka ataków SQL Injection i awarii po aktualizacjach\n- **100% kodu na własność** w repozytorium Git i brak ukrytych abonamentów.';
  }

  if (q.includes('ai') || q.includes('czat') || q.includes('bot') || q.includes('asystent') || q.includes('rag')) {
    return 'Wdrażam dedykowanych **Asystentów AI (RAG)** trenowanych wyłącznie na bazie wiedzy Twojej firmy (kaskada 11 modeli LLM, cache `< 5 ms`):\n- Koszt wdrożenia: **od 900 PLN netto** (jednorazowa konfiguracja)\n- Działa **24/7**, odpowiada w ułamku sekundy z pamięci podręcznej i korzysta z darmowych pul API\n- Automatycznie przesyła powiadomienia na Twój telefon (z numerem telefonu i e-mailem na samej górze wiadomości), gdy klient zostawi namiar kontaktowy.';
  }

  if (q.includes('współprac') || q.includes('wspolprac') || q.includes('proces') || q.includes('etap') || q.includes('czas') || q.includes('ile trwa') || q.includes('umow') || q.includes('krok')) {
    return 'Standardowe wdrożenie trwa **7–14 dni roboczych** w 5 przejrzystych etapach:\n- **Dzień 1–2**: Analiza potrzeb, brief i stała wycena bez gwiazdek\n- **Dzień 3–5**: Indywidualny projekt graficzny UX/UI\n- **Dzień 6–9**: Programowanie w czystym kodzie (HTML5/CSS3/JS/PHP Flat-File)\n- **Dzień 10–11**: Optymalizacja PageSpeed 95+ i testy bezpieczeństwa ISO 27001\n- **Dzień 12–14**: Uruchomienie na domenie i **30 dni gwarancji**\nSzczegóły znajdziesz na podstronie https://twojastronawww.pl/jak-pracuje.html';
  }

  if (q.includes('cen') || q.includes('koszt') || q.includes('ile ') || q.includes('pakiet') || q.includes('wycen')) {
    return 'Oto pakiety bazowe w **TwojaStronaWWW.pl** (kwoty netto):\n- **Wizytówka / Landing Page**: **2 499 PLN netto** (indywidualny projekt, czysty kod RWD, SEO, formularz z ochroną anty-spam)\n- **Strona Firmowa**: **5 499 PLN netto** (do 10 podstron + blog, autorski CMS Flat-File bez SQL, zaawansowane SEO, PageSpeed 90+)\n- **E-commerce / Aplikacja Webowa**: **od 10 000+ PLN netto** (projekty szyte na miarę i automatyzacje API)\n- **Wdrożenie Czatbota AI**: **od 900 PLN netto**\nKażdy pakiet zawiera **30 dni bezpłatnego wsparcia** i pełne prawa do kodu.';
  }

  if (q.includes('realizacj') || q.includes('portfolio') || q.includes('przykład') || q.includes('projekt')) {
    return 'Przykładowe wdrożenia z wynikami **Google PageSpeed 98–100/100**:\n- **Raricart.pl** (branża eventowa) – ładowanie skrócone z 4.2s do **0.6s** i automatyzacja rezerwacji\n- **KatoSalsaHub.pl** & **DancePuls** – automatyczny agregator i generator wydarzeń oszczędzający 6h pracy tygodniowo\n- **FuegoLingua.pl** – ultra-lekka strona (45 KB) bez bazy SQL z wirtualnym doradcą AI.';
  }

  if (q.includes('kontakt') || q.includes('telefon') || q.includes('mail') || q.includes('oddzwon') || q.includes('wiadomo')) {
    return 'Pracujesz bezpośrednio ze mną (inżynierem, bez pośredników). Możesz:\n- Zostawić swój **numer telefonu lub e-mail bezpośrednio tutaj na czacie** – od razu dostanę powiadomienie\n- Wypełnić szybki formularz w sekcji **#contact** na dole strony\n- Napisać na: kontakt@twojastronawww.pl\nOdpowiadam i przygotowuję niezobowiązującą wycenę w ciągu **24h**.';
  }

  return `Jestem wirtualnym doradcą serwisu **${siteId}**. Mogę opowiedzieć o **cenach pakietów (od 2 499 PLN netto)**, przewadze **czystego kodu nad WordPressem**, wdrożeniu **czatbota AI** lub **5-etapowym procesie współpracy**.\nMożesz też zostawić tutaj swój numer telefonu lub napisać na kontakt@twojastronawww.pl – przygotuję bezpłatną wycenę w **24h**.`;
}

/**
 * Inicjalizuje widget czatu AI w drzewie DOM
 * @param {Document} doc
 * @param {Window} win
 * @param {Object} options
 */
export function initAiWidget(doc = document, win = globalThis.window, options = {}) {
  if (!doc || !doc.body) return null;
  if (doc.getElementById('tsw-ai-widget-root')) return null;

  const scriptEl =
    doc.currentScript ||
    doc.querySelector('script[data-site-id]') ||
    doc.querySelector('script[src*="ai-widget.js"]') ||
    doc.querySelector('script[src*="widget.js"]');

  const siteId = (
    options.siteId ||
    scriptEl?.getAttribute('data-site-id') ||
    'twojastronawww'
  ).toLowerCase();
  const isLocalhost =
    win?.location?.hostname === 'localhost' || win?.location?.hostname === '127.0.0.1';
  const defaultRouterUrl = isLocalhost
    ? 'http://localhost:8085/chat-router.php'
    : 'https://ai.twojastronawww.pl/chat-router.php';
  const routerUrl =
    options.routerUrl || scriptEl?.getAttribute('data-router-url') || defaultRouterUrl;
  const title =
    options.title || scriptEl?.getAttribute('data-title') || 'Asystent TwojaStronaWWW';
  const storageKey = 'tsw_ai_history_' + siteId;
  const cacheStorageKey = 'tsw_ai_cache_' + siteId;
  const cacheTtlMs = Number(options.cacheTtlMs) || 24 * 60 * 60 * 1000;
  const quickPrompts = QUICK_PROMPTS_MAP[siteId] || QUICK_PROMPTS_MAP.twojastronawww;

  let knowledgeEntries = Array.isArray(options.initialKnowledge)
    ? [...options.initialKnowledge]
    : [];
  let kbVersion = computeKnowledgeVersion(knowledgeEntries);
  let responseCache = { kbVersion, entries: {} };

  function loadResponseCache() {
    try {
      const storage = win?.localStorage || win?.sessionStorage;
      const raw = storage?.getItem(cacheStorageKey);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === 'object' && parsed.entries) {
          if (knowledgeEntries.length > 0 && parsed.kbVersion !== kbVersion) {
            responseCache = { kbVersion, entries: {} };
            saveResponseCache();
          } else {
            responseCache = {
              kbVersion: parsed.kbVersion || kbVersion,
              entries: parsed.entries || {}
            };
          }
        }
      }
    } catch (_) {
      responseCache = { kbVersion, entries: {} };
    }
  }

  function saveResponseCache() {
    try {
      const storage = win?.localStorage || win?.sessionStorage;
      storage?.setItem(cacheStorageKey, JSON.stringify(responseCache));
    } catch (_) {}
  }

  function hasContactPii(text) {
    const s = String(text || '');
    const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/;
    const phoneRegex = /(?:\+?48[\s.\-()]*)?(?:\d[\s.\-()]*){8}\d/;
    return emailRegex.test(s) || phoneRegex.test(s);
  }

  function getCachedAnswer(question) {
    const normQ = normalizeCacheQuery(question);
    if (!normQ || hasContactPii(question)) return null;

    if (knowledgeEntries.length > 0 && responseCache.kbVersion !== kbVersion) {
      responseCache = { kbVersion, entries: {} };
      saveResponseCache();
      return null;
    }

    const item = responseCache.entries?.[normQ];
    if (!item || !item.answer) return null;

    const now = Date.now();
    if (item.ts && now - item.ts > cacheTtlMs) {
      delete responseCache.entries[normQ];
      saveResponseCache();
      return null;
    }

    return item.answer;
  }

  function setCachedAnswer(question, answer, source = 'ai') {
    const normQ = normalizeCacheQuery(question);
    if (!normQ || !answer || hasContactPii(question)) return;
    if (!responseCache.entries || responseCache.kbVersion !== kbVersion) {
      responseCache = { kbVersion, entries: {} };
    }
    responseCache.kbVersion = kbVersion;
    responseCache.entries[normQ] = {
      answer: String(answer),
      kbVersion,
      source,
      ts: Date.now()
    };
    saveResponseCache();
  }

  const style = doc.createElement('style');
  style.id = 'tsw-ai-widget-styles';
  style.textContent = `
    .tsw-ai-btn {
      position: fixed;
      bottom: 24px;
      right: 24px;
      width: 60px;
      height: 60px;
      border-radius: 50%;
      background: linear-gradient(135deg, #10b981 0%, #06b6d4 100%);
      color: #020617;
      box-shadow: 0 8px 26px rgba(16, 185, 129, 0.42);
      border: 2px solid rgba(52, 211, 153, 0.75);
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 999999;
      transition: transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1), box-shadow 0.2s;
    }
    .tsw-ai-btn:hover,
    .tsw-ai-btn:focus-visible {
      transform: scale(1.08);
      box-shadow: 0 12px 32px rgba(6, 182, 212, 0.55);
      outline: 3px solid #34d399;
      outline-offset: 2px;
    }
    .tsw-ai-btn svg {
      width: 27px;
      height: 27px;
      fill: currentColor;
    }
    .tsw-ai-window {
      position: fixed;
      bottom: 96px;
      right: 24px;
      width: 395px;
      max-width: calc(100vw - 32px);
      height: 550px;
      max-height: calc(100vh - 120px);
      background: #091024;
      border: 1px solid rgba(52, 211, 153, 0.28);
      border-radius: 18px;
      box-shadow: 0 22px 48px rgba(0, 0, 0, 0.72);
      z-index: 999999;
      display: flex;
      flex-direction: column;
      overflow: hidden;
      font-family: 'Space Grotesk', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      transition: opacity 0.25s, transform 0.25s, visibility 0.25s;
      opacity: 0;
      transform: translateY(16px) scale(0.96);
      visibility: hidden;
      pointer-events: none;
    }
    .tsw-ai-window.tsw-open {
      opacity: 1;
      transform: translateY(0) scale(1);
      visibility: visible;
      pointer-events: auto;
    }
    @media (max-width: 600px) {
      .tsw-ai-btn {
        bottom: 16px;
        right: 16px;
        width: 54px;
        height: 54px;
      }
      .tsw-ai-window {
        bottom: 80px;
        right: 12px;
        left: 12px;
        width: auto;
        max-width: none;
        height: min(500px, calc(100vh - 100px));
        max-height: calc(100dvh - 100px);
      }
    }
    .tsw-ai-header {
      background: linear-gradient(135deg, #0f172a 0%, #132238 100%);
      padding: 14px 16px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      border-bottom: 1px solid rgba(52, 211, 153, 0.18);
    }
    .tsw-ai-header-title {
      font-size: 15px;
      font-weight: 700;
      color: #f8fafc;
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .tsw-ai-status-dot {
      width: 9px;
      height: 9px;
      border-radius: 50%;
      background: #34d399;
      box-shadow: 0 0 8px #34d399;
    }
    .tsw-ai-header-actions {
      display: flex;
      align-items: center;
      gap: 6px;
    }
    .tsw-ai-icon-btn {
      background: transparent;
      border: none;
      color: #cbd5e1;
      cursor: pointer;
      font-size: 16px;
      padding: 4px 8px;
      border-radius: 6px;
      line-height: 1;
      transition: color 0.15s, background 0.15s;
    }
    .tsw-ai-icon-btn:hover,
    .tsw-ai-icon-btn:focus-visible {
      color: #34d399;
      background: rgba(255, 255, 255, 0.08);
    }
    .tsw-ai-messages {
      flex: 1;
      overflow-y: auto;
      padding: 16px;
      display: flex;
      flex-direction: column;
      gap: 12px;
    }
    .tsw-ai-msg {
      max-width: 88%;
      padding: 11px 14px;
      border-radius: 14px;
      font-size: 14px;
      line-height: 1.5;
      word-wrap: break-word;
    }
    .tsw-ai-msg strong {
      color: #34d399;
      font-weight: 700;
    }
    .tsw-ai-list {
      margin: 6px 0 4px 18px;
      padding: 0;
      list-style: disc;
    }
    .tsw-ai-list li {
      margin-bottom: 4px;
    }
    .tsw-ai-link {
      color: #38bdf8;
      text-decoration: underline;
      word-break: break-all;
    }
    .tsw-ai-msg-bot {
      background: #131f37;
      color: #f1f5f9;
      align-self: flex-start;
      border-bottom-left-radius: 4px;
      border: 1px solid rgba(255, 255, 255, 0.08);
    }
    .tsw-ai-msg-user {
      background: linear-gradient(135deg, #10b981 0%, #06b6d4 100%);
      color: #020617;
      font-weight: 600;
      align-self: flex-end;
      border-bottom-right-radius: 4px;
    }
    .tsw-ai-msg-user strong {
      color: #020617;
    }
    .tsw-ai-chips {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
      padding: 0 16px 10px;
    }
    .tsw-ai-chips.tsw-hidden {
      display: none !important;
    }
    .tsw-ai-chip {
      background: rgba(16, 185, 129, 0.12);
      border: 1px solid rgba(52, 211, 153, 0.35);
      color: #d1fae5;
      border-radius: 999px;
      padding: 6px 12px;
      font-size: 12px;
      font-weight: 600;
      cursor: pointer;
      transition: background 0.15s, border-color 0.15s, transform 0.1s;
    }
    .tsw-ai-chip:hover,
    .tsw-ai-chip:focus-visible {
      background: rgba(16, 185, 129, 0.28);
      border-color: #34d399;
      color: #ffffff;
      transform: translateY(-1px);
    }
    .tsw-ai-input-bar {
      padding: 12px;
      background: #0f172a;
      border-top: 1px solid rgba(52, 211, 153, 0.16);
      display: flex;
      gap: 8px;
    }
    .tsw-ai-input {
      flex: 1;
      background: #020617;
      border: 1px solid rgba(255, 255, 255, 0.16);
      border-radius: 10px;
      padding: 10px 14px;
      color: #ffffff;
      font-size: 14px;
      outline: none;
    }
    .tsw-ai-input::placeholder {
      color: #94a3b8;
    }
    .tsw-ai-input:focus {
      border-color: #34d399;
    }
    .tsw-ai-input.tsw-input-listening {
      border-color: #ef4444;
      box-shadow: 0 0 0 2px rgba(239, 68, 68, 0.25);
    }
    .tsw-ai-voice-btn {
      width: 40px;
      min-width: 40px;
      height: 40px;
      border-radius: 10px;
      background: rgba(255, 255, 255, 0.07);
      border: 1px solid rgba(255, 255, 255, 0.16);
      color: #cbd5e1;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      padding: 0;
      flex-shrink: 0;
      transition: background 0.15s, color 0.15s, border-color 0.15s, box-shadow 0.15s;
    }
    .tsw-ai-voice-btn:hover,
    .tsw-ai-voice-btn:focus-visible {
      background: rgba(52, 211, 153, 0.14);
      border-color: #34d399;
      color: #34d399;
      outline: none;
    }
    .tsw-ai-voice-btn svg {
      width: 18px;
      height: 18px;
      fill: currentColor;
      pointer-events: none;
    }
    .tsw-ai-voice-btn.tsw-listening {
      background: linear-gradient(135deg, #ef4444 0%, #f97316 100%);
      border-color: rgba(255, 255, 255, 0.5);
      color: #ffffff;
      animation: tswVoicePulse 1.3s infinite ease-in-out;
    }
    @keyframes tswVoicePulse {
      0% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.65); }
      70% { box-shadow: 0 0 0 8px rgba(239, 68, 68, 0); }
      100% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0); }
    }
    .tsw-ai-send {
      background: linear-gradient(135deg, #10b981 0%, #06b6d4 100%);
      border: 1px solid rgba(52, 211, 153, 0.5);
      border-radius: 10px;
      padding: 0 16px;
      color: #020617;
      font-weight: 700;
      cursor: pointer;
      transition: opacity 0.2s, transform 0.15s;
    }
    .tsw-ai-send:hover:not(:disabled) {
      transform: translateY(-1px);
    }
    .tsw-ai-send:disabled {
      opacity: 0.55;
      cursor: not-allowed;
    }
    .tsw-ai-typing {
      font-size: 12px;
      color: #94a3b8;
      font-style: italic;
    }
  `;
  (doc.head || doc.documentElement || doc.body).appendChild(style);

  const root = doc.createElement('div');
  root.id = 'tsw-ai-widget-root';
  root.setAttribute('data-nosnippet', '');
  root.innerHTML = `
    <button type="button" class="tsw-ai-btn" id="tswAiToggleBtn" aria-label="Otwórz czat z asystentem TwojaStronaWWW" aria-expanded="false" aria-controls="tswAiWindow">
      <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14H6l-2 2V4h16v12z"/></svg>
    </button>

    <div class="tsw-ai-window" id="tswAiWindow" role="dialog" aria-label="${title}">
      <div class="tsw-ai-header">
        <div class="tsw-ai-header-title">
          <span class="tsw-ai-status-dot" aria-hidden="true"></span>
          <span>${title}</span>
        </div>
        <div class="tsw-ai-header-actions">
          <button type="button" class="tsw-ai-icon-btn" id="tswAiClearBtn" title="Nowa rozmowa" aria-label="Nowa rozmowa">&#x21bb;</button>
          <button type="button" class="tsw-ai-icon-btn" id="tswAiCloseBtn" title="Zamknij czat" aria-label="Zamknij czat">&times;</button>
        </div>
      </div>

      <div class="tsw-ai-messages" id="tswAiMessages" aria-live="polite"></div>
      <div class="tsw-ai-chips" id="tswAiChips"></div>

      <form class="tsw-ai-input-bar" id="tswAiForm">
        <input type="text" class="tsw-ai-input" id="tswAiInput" placeholder="Zapytaj o wycenę, czas realizacji lub AI..." aria-label="Zadaj pytanie asystentowi" maxlength="500" required autocomplete="off" />
        <button type="button" class="tsw-ai-voice-btn" id="tswAiVoiceBtn" title="Zadaj pytanie głosem (mikrofon)" aria-label="Zadaj pytanie głosem" aria-pressed="false">
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3zm5.91-3c-.49 0-.9.36-.98.85C16.52 14.2 14.47 16 12 16s-4.52-1.8-4.93-4.15c-.08-.49-.49-.85-.98-.85-.61 0-1.09.54-1 1.14.49 3 2.89 5.35 5.91 5.78V20c0 .55.45 1 1 1s1-.45 1-1v-2.08c3.02-.43 5.42-2.78 5.91-5.78.1-.6-.39-1.14-1-1.14z"/></svg>
        </button>
        <button type="submit" class="tsw-ai-send" id="tswAiSendBtn">Wyślij</button>
      </form>
    </div>
  `;
  doc.body.appendChild(root);

  const toggleBtn = doc.getElementById('tswAiToggleBtn');
  const closeBtn = doc.getElementById('tswAiCloseBtn');
  const clearBtn = doc.getElementById('tswAiClearBtn');
  const chatWindow = doc.getElementById('tswAiWindow');
  const chatForm = doc.getElementById('tswAiForm');
  const chatInput = doc.getElementById('tswAiInput');
  const voiceBtn = doc.getElementById('tswAiVoiceBtn');
  const messagesContainer = doc.getElementById('tswAiMessages');
  const chipsContainer = doc.getElementById('tswAiChips');
  const sendBtn = doc.getElementById('tswAiSendBtn');

  // Obsługa dyktowania głosowego (Web Speech API — Tryb Bezpieczny: tekst trafia na żywo do pola tekstowego)
  const defaultPlaceholder = chatInput?.getAttribute('placeholder') || 'Zapytaj o wycenę, czas realizacji lub AI...';
  const SpeechRecognitionCtor = win?.SpeechRecognition || win?.webkitSpeechRecognition || null;
  let recognition = null;
  let isListening = false;
  let voiceBaseText = '';
  let lastVoiceErrorPlaceholder = '';

  function setVoiceListeningState(active, customPlaceholder = '') {
    isListening = Boolean(active);
    if (voiceBtn) {
      voiceBtn.classList.toggle('tsw-listening', isListening);
      voiceBtn.setAttribute('aria-pressed', String(isListening));
      voiceBtn.setAttribute(
        'title',
        isListening ? 'Zatrzymaj dyktowanie (Słucham...)' : 'Zadaj pytanie głosem (mikrofon)'
      );
      voiceBtn.setAttribute(
        'aria-label',
        isListening ? 'Zatrzymaj dyktowanie głosowe' : 'Zadaj pytanie głosem'
      );
    }
    if (chatInput) {
      chatInput.classList.toggle('tsw-input-listening', isListening);
      chatInput.setAttribute(
        'placeholder',
        customPlaceholder || (isListening ? '🎙️ Słucham... mów teraz po polsku' : defaultPlaceholder)
      );
    }
  }

  function stopVoiceRecognition() {
    lastVoiceErrorPlaceholder = '';
    if (recognition && isListening) {
      try {
        recognition.stop();
      } catch (_) {}
    }
    setVoiceListeningState(false);
  }

  function toggleVoiceRecognition() {
    if (isListening) {
      stopVoiceRecognition();
      chatInput?.focus?.();
      return false;
    }

    const Ctor = win?.SpeechRecognition || win?.webkitSpeechRecognition || SpeechRecognitionCtor;
    if (typeof Ctor !== 'function') {
      setVoiceListeningState(false, 'Dyktowanie głosowe wymaga Chrome, Edge lub Safari');
      chatInput?.focus?.();
      return false;
    }

    try {
      if (!recognition) {
        recognition = new Ctor();
        recognition.lang = 'pl-PL';
        recognition.continuous = false;
        recognition.interimResults = true;
        recognition.maxAlternatives = 1;

        recognition.onstart = () => {
          lastVoiceErrorPlaceholder = '';
          setVoiceListeningState(true);
        };

        recognition.onresult = (event) => {
          if (!chatInput || !event || !event.results) return;
          lastVoiceErrorPlaceholder = '';
          let finalChunk = '';
          let interimChunk = '';
          for (let i = 0; i < event.results.length; i++) {
            const res = event.results[i];
            const transcript = res && res[0] && res[0].transcript ? String(res[0].transcript) : '';
            if (res.isFinal) {
              finalChunk += transcript;
            } else {
              interimChunk += transcript;
            }
          }
          const spoken = (finalChunk + interimChunk).replace(/\s+/g, ' ').trim();
          const combined = [voiceBaseText, spoken].filter(Boolean).join(' ').slice(0, 500);
          chatInput.value = combined;
        };

        recognition.onerror = (event) => {
          const code = event?.error || '';
          if (code === 'not-allowed' || code === 'service-not-allowed') {
            lastVoiceErrorPlaceholder = '⚠️ Zezwól na mikrofon (ikona obok adresu URL)';
          } else if (code === 'audio-capture') {
            lastVoiceErrorPlaceholder = '⚠️ Nie wykryto mikrofonu w urządzeniu';
          } else if (code === 'no-speech') {
            lastVoiceErrorPlaceholder = '🎙️ Nie usłyszałem głosu — kliknij mikrofon ponownie';
          } else if (code === 'network') {
            lastVoiceErrorPlaceholder = '⚠️ Przeglądarka blokuje usługę mowy (np. tarcza Brave)';
          } else {
            lastVoiceErrorPlaceholder = defaultPlaceholder;
          }
          setVoiceListeningState(false, lastVoiceErrorPlaceholder);
        };

        recognition.onend = () => {
          setVoiceListeningState(false, lastVoiceErrorPlaceholder || defaultPlaceholder);
          if (chatInput?.value) {
            chatInput?.focus?.();
          }
        };
      }

      lastVoiceErrorPlaceholder = '';
      voiceBaseText = String(chatInput?.value || '').trim();
      setVoiceListeningState(true);
      recognition.start();
      return true;
    } catch (_) {
      setVoiceListeningState(false);
      return false;
    }
  }

  voiceBtn?.addEventListener('click', toggleVoiceRecognition);

  let conversationHistory = [];
  try {
    const saved = win?.sessionStorage?.getItem(storageKey);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed)) conversationHistory = parsed.slice(-8);
    }
  } catch (_) {}

  loadResponseCache();

  function saveHistory() {
    try {
      win?.sessionStorage?.setItem(storageKey, JSON.stringify(conversationHistory.slice(-8)));
    } catch (_) {}
  }

  function updateKnowledgeEntries(newEntries) {
    if (!Array.isArray(newEntries)) return kbVersion;
    const prevVersion = kbVersion;
    knowledgeEntries = [...newEntries];
    kbVersion = computeKnowledgeVersion(knowledgeEntries);
    if (prevVersion !== kbVersion) {
      responseCache = { kbVersion, entries: {} };
      saveResponseCache();
    }
    return kbVersion;
  }

  function appendMessageElement(role, text) {
    if (!messagesContainer) return null;
    const msg = doc.createElement('div');
    msg.className = 'tsw-ai-msg ' + (role === 'user' ? 'tsw-ai-msg-user' : 'tsw-ai-msg-bot');
    if (role === 'user') {
      msg.textContent = text;
    } else {
      msg.innerHTML = formatMarkdown(text);
    }
    messagesContainer.appendChild(msg);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
    return msg;
  }

  function setChipsVisible(visible) {
    if (!chipsContainer) return;
    chipsContainer.classList?.toggle('tsw-hidden', !visible);
    chipsContainer.style.display = visible ? 'flex' : 'none';
  }

  const analyticsUrl = routerUrl.replace(/\/chat-router\.php.*$/, '/analytics');

  function sendAnalyticsBeacon(extra) {
    try {
      const nav = win?.navigator || (typeof navigator !== 'undefined' ? navigator : null);
      if (!nav || typeof nav.sendBeacon !== 'function' || nav.doNotTrack === '1' || win?.doNotTrack === '1') {
        return;
      }
      const loc = win?.location || {};
      const params = new URLSearchParams(loc.search || '');
      const rawPath = (loc.pathname || '/') + (loc.hash || '');
      const payload = Object.assign({
        site_id: siteId,
        type: 'pageview',
        path: rawPath || '/',
        referrer: doc?.referrer || '',
        utm_source: params.get('utm_source') || '',
        utm_term: params.get('utm_term') || params.get('q') || ''
      }, extra || {});
      const blob = new Blob([JSON.stringify(payload)], { type: 'application/json' });
      nav.sendBeacon(analyticsUrl, blob);
    } catch (_) {}
  }

  function renderChips() {
    if (!chipsContainer) return;
    chipsContainer.innerHTML = '';
    if (conversationHistory.length > 0) {
      setChipsVisible(false);
      return;
    }
    setChipsVisible(true);
    quickPrompts.forEach((promptText) => {
      const chip = doc.createElement('button');
      chip.type = 'button';
      chip.className = 'tsw-ai-chip';
      chip.textContent = promptText;
      chip.addEventListener('click', () => {
        sendAnalyticsBeacon({ type: 'event', event: 'quick_prompt_click' });
        sendQuestion(promptText);
      });
      chipsContainer.appendChild(chip);
    });
  }

  function renderInitialView() {
    if (!messagesContainer) return;
    messagesContainer.innerHTML = '';
    appendMessageElement(
      'model',
      'Cześć! Jestem wirtualnym doradcą **TwojaStronaWWW.pl**. Pomogę Ci dobrać pakiet strony, policzyć orientacyjny koszt lub zaplanować automatyzację i czatbota AI. O co chcesz zapytać?'
    );
    for (let i = 0; i < conversationHistory.length; i++) {
      appendMessageElement(conversationHistory[i].role, conversationHistory[i].text);
    }
    renderChips();
  }

  function toggleChat() {
    if (!chatWindow || !toggleBtn) return;
    const isOpen = chatWindow.classList.toggle('tsw-open');
    toggleBtn.setAttribute('aria-expanded', String(isOpen));
    if (isOpen) {
      chatInput?.focus?.();
      sendAnalyticsBeacon({ type: 'event', event: 'chat_open' });
    } else {
      stopVoiceRecognition();
    }
  }

  function closeChat() {
    if (!chatWindow || !toggleBtn) return;
    stopVoiceRecognition();
    chatWindow.classList.remove('tsw-open');
    toggleBtn.setAttribute('aria-expanded', 'false');
    toggleBtn.focus?.();
  }

  toggleBtn?.addEventListener('click', toggleChat);
  closeBtn?.addEventListener('click', closeChat);
  clearBtn?.addEventListener('click', () => {
    stopVoiceRecognition();
    conversationHistory = [];
    saveHistory();
    renderInitialView();
  });

  doc.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && chatWindow?.classList.contains('tsw-open')) {
      closeChat();
    }
  });

  async function sendQuestion(text) {
    const trimmed = String(text || '').trim();
    if (!trimmed || sendBtn?.disabled) return;

    stopVoiceRecognition();

    setChipsVisible(false);
    appendMessageElement('user', trimmed);
    if (chatInput) chatInput.value = '';

    const cachedAnswer = getCachedAnswer(trimmed);
    if (cachedAnswer) {
      appendMessageElement('model', cachedAnswer);
      conversationHistory.push({ role: 'user', text: trimmed });
      conversationHistory.push({ role: 'model', text: cachedAnswer });
      conversationHistory = conversationHistory.slice(-8);
      saveHistory();
      if (messagesContainer) messagesContainer.scrollTop = messagesContainer.scrollHeight;
      return { answer: cachedAnswer, cached: true, kbVersion };
    }

    const typingMsg = doc.createElement('div');
    typingMsg.className = 'tsw-ai-msg tsw-ai-msg-bot tsw-ai-typing';
    typingMsg.textContent = 'Asystent pisze...';
    messagesContainer?.appendChild(typingMsg);
    if (messagesContainer) messagesContainer.scrollTop = messagesContainer.scrollHeight;

    if (sendBtn) sendBtn.disabled = true;

    const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
    const timeoutId = controller ? setTimeout(() => controller.abort(), 9000) : null;
    const dynamicContext = buildDynamicContext(trimmed, knowledgeEntries);

    try {
      const fetchFn = win?.fetch || globalThis.fetch;
      const res = await fetchFn(routerUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        ...(controller ? { signal: controller.signal } : {}),
        body: JSON.stringify({
          site_id: siteId,
          question: trimmed,
          kb_version: kbVersion,
          dynamic_context: dynamicContext,
          history: conversationHistory.slice(-8)
        })
      });

      const data = await res.json();
      typingMsg.remove?.();

      if (res.ok && data && data.success && data.answer) {
        appendMessageElement('model', data.answer);
        setCachedAnswer(trimmed, data.answer, 'ai');
        conversationHistory.push({ role: 'user', text: trimmed });
        conversationHistory.push({ role: 'model', text: data.answer });
        conversationHistory = conversationHistory.slice(-8);
        saveHistory();
        return { answer: data.answer, cached: Boolean(data.cached), kbVersion };
      } else {
        const fallback = getLocalFallbackAnswer(trimmed, siteId);
        appendMessageElement('model', fallback);
        setCachedAnswer(trimmed, fallback, 'fallback');
        conversationHistory.push({ role: 'user', text: trimmed });
        conversationHistory.push({ role: 'model', text: fallback });
        conversationHistory = conversationHistory.slice(-8);
        saveHistory();
        return { answer: fallback, cached: false, kbVersion };
      }
    } catch (_) {
      typingMsg.remove?.();
      const fallback = getLocalFallbackAnswer(trimmed, siteId);
      appendMessageElement('model', fallback);
      setCachedAnswer(trimmed, fallback, 'fallback');
      conversationHistory.push({ role: 'user', text: trimmed });
      conversationHistory.push({ role: 'model', text: fallback });
      conversationHistory = conversationHistory.slice(-8);
      saveHistory();
      return { answer: fallback, cached: false, kbVersion };
    } finally {
      if (timeoutId) clearTimeout(timeoutId);
      if (sendBtn) sendBtn.disabled = false;
      if (messagesContainer) messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }
  }

  chatForm?.addEventListener('submit', (e) => {
    if (typeof e.preventDefault === 'function') e.preventDefault();
    sendQuestion(chatInput?.value || '');
  });

  renderInitialView();

  if (win && !win.__TSW_ANALYTICS_ACTIVE__ && typeof win.navigator?.sendBeacon === 'function') {
    win.__TSW_ANALYTICS_ACTIVE__ = true;
    let lcpMeasured = 0;
    try {
      if (typeof PerformanceObserver !== 'undefined') {
        const po = new PerformanceObserver((list) => {
          const entries = list.getEntries();
          if (entries && entries.length > 0) {
            lcpMeasured = Math.round(entries[entries.length - 1].startTime || 0);
          }
        });
        po.observe({ type: 'largest-contentful-paint', buffered: true });
      }
    } catch (_) {}

    setTimeout(() => {
      sendAnalyticsBeacon(lcpMeasured > 0 ? { type: 'pageview', lcp_ms: lcpMeasured } : { type: 'pageview' });
    }, 600);

    win.addEventListener?.('hashchange', () => {
      sendAnalyticsBeacon({ type: 'pageview' });
    });

    setTimeout(() => {
      if (doc.visibilityState !== 'hidden') {
        sendAnalyticsBeacon({ type: 'engaged' });
      }
    }, 15000);

    doc.addEventListener?.('click', (e) => {
      const target = e?.target?.closest ? e.target : null;
      if (!target) return;
      const link = target.closest('a[href]');
      if (link) {
        const href = String(link.getAttribute('href') || '');
        if (href.startsWith('tel:')) {
          sendAnalyticsBeacon({ type: 'event', event: 'cta_phone_click' });
        } else if (href.startsWith('mailto:')) {
          sendAnalyticsBeacon({ type: 'event', event: 'cta_email_click' });
        }
      }
    });

    doc.addEventListener?.('submit', (e) => {
      const form = e?.target;
      if (form && form.id !== 'tsw-ai-form' && (form.id === 'contactForm' || form.classList?.contains?.('contact-form'))) {
        sendAnalyticsBeacon({ type: 'event', event: 'contact_form_submit' });
      }
    });
  }

  return {
    root,
    toggleBtn,
    closeBtn,
    clearBtn,
    chatWindow,
    chatForm,
    chatInput,
    voiceBtn,
    messagesContainer,
    chipsContainer,
    sendBtn,
    toggleChat,
    closeChat,
    sendQuestion,
    toggleVoiceRecognition,
    stopVoiceRecognition,
    isVoiceListening: () => isListening,
    getHistory: () => conversationHistory,
    getKnowledgeVersion: () => kbVersion,
    getKnowledgeEntries: () => knowledgeEntries,
    updateKnowledgeEntries,
    getCachedAnswer,
    clearCache: () => {
      responseCache = { kbVersion, entries: {} };
      saveResponseCache();
    }
  };
}

if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => initAiWidget(document, globalThis.window));
  } else {
    initAiWidget(document, globalThis.window);
  }
}
