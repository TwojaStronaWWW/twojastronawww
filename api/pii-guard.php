<?php
declare(strict_types=1);

/**
 * Guardrail Anonimizacji Danych Wrażliwych RODO / Zero-PII (Port wzorca z polanon / GalAnonim).
 *
 * Cel w ekosystemie TwojaStronaWWW:
 * - Chroni przed przypadkowym wyciekiem danych szczególnych kategorii / identyfikatorów państwowych
 *   (PESEL z walidacją sumy kontrolnej wagami 1-3-7-9, numery dowodów osobistych, IBAN PL, karty płatnicze)
 *   do zewnętrznych dostawców LLM lub logów diagnostycznych.
 * - Celowo NIE maskuje zwykłego telefonu i adresu e-mail w formularzu kontaktowym / Lead Extractorze,
 *   ponieważ są one wymagane biznesowo do kontaktu z klientem (powiadomienie 1-Klik Ntfy.sh).
 */

/**
 * Weryfikuje poprawność 11-cyfrowego numeru PESEL za pomocą oficjalnych wag kontrolnych.
 */
function is_valid_pesel(string $digits): bool
{
    if (preg_match('/^\d{11}$/', $digits) !== 1) {
        return false;
    }

    $weights = [1, 3, 7, 9, 1, 3, 7, 9, 1, 3];
    $sum = 0;
    for ($i = 0; $i < 10; $i++) {
        $sum += ((int)$digits[$i]) * $weights[$i];
    }

    $control = (10 - ($sum % 10)) % 10;
    return $control === (int)$digits[10];
}

/**
 * Maskuje w tekście polskie identyfikatory wrażliwe (PESEL z sumą kontrolną, IBAN PL,
 * serie dowodów osobistych, karty płatnicze, NIP poprzedzony etykietą oraz polskie adresy uliczne)
 * tokenami `<TYP_N>`.
 *
 * Zwraca tablicę:
 * - `masked`: tekst po maskowaniu,
 * - `replacements`: mapa `<TOKEN_N> => oryginał` (do opcjonalnego odtworzenia lokalnego),
 * - `count`: liczba zamaskowanych encji.
 *
 * @return array{masked: string, replacements: array<string, string>, count: int}
 */
function mask_sensitive_pl_pii(string $text): array
{
    if ($text === '') {
        return ['masked' => '', 'replacements' => [], 'count' => 0];
    }

    $counters = [];
    $replacements = [];
    $reverseMap = [];

    $nextToken = static function (string $type, string $original) use (&$counters, &$replacements, &$reverseMap): string {
        $normKey = $type . ':' . mb_strtolower(trim($original), 'UTF-8');
        if (isset($reverseMap[$normKey])) {
            return $reverseMap[$normKey];
        }
        $counters[$type] = ($counters[$type] ?? 0) + 1;
        $token = '<' . $type . '_' . $counters[$type] . '>';
        $replacements[$token] = $original;
        $reverseMap[$normKey] = $token;
        return $token;
    };

    // 1. IBAN PL (PL + 26 cyfr z opcjonalnymi spacjami)
    $working = (string)preg_replace_callback(
        '/\bPL\s*(?:\d[\s-]*){26}\b/i',
        static fn(array $m): string => $nextToken('IBAN', $m[0]),
        $text
    );

    // 2. PESEL (11 cyfr zweryfikowanych wagami kontrolnymi)
    $working = (string)preg_replace_callback(
        '/\b(\d{11})\b/',
        static function (array $m) use ($nextToken): string {
            if (is_valid_pesel($m[1])) {
                return $nextToken('PESEL', $m[1]);
            }
            return $m[0];
        },
        $working
    );

    // 3. Polski dowód osobisty (3 litery + 6 cyfr, gdy poprzedzony kontekstem lub z odstępem)
    $working = (string)preg_replace_callback(
        '/\b(?:dow[oó]d(?:\s+osobisty)?|seria\s+i\s+numer|nr\s+dowodu)[:\s#-]*([A-Z]{3}\s?\d{6})\b/iu',
        static function (array $m) use ($nextToken): string {
            $token = $nextToken('DOWOD', $m[1]);
            return str_replace($m[1], $token, $m[0]);
        },
        $working
    );

    // 4. Karta płatnicza (16 cyfr w blokach po 4)
    $working = (string)preg_replace_callback(
        '/\b(?:\d{4}[ -]){3}\d{4}\b/',
        static fn(array $m): string => $nextToken('KARTA', $m[0]),
        $working
    );

    // 5. Polskie adresy uliczne (ul. / al. / os. / pl. + nazwa ulicy max 1-6 słów + numer domu/lokalu, odporne na ReDoS)
    $working = (string)preg_replace_callback(
        '/\b(?:ul\.|ulica|al\.|aleja|os\.|osiedle|pl\.|plac)\s+[A-ZĄĆĘŁŃÓŚŹŻ0-9][\wĄĆĘŁŃÓŚŹŻąćęłńóśźż.\'-]{1,30}(?:\s+[A-ZĄĆĘŁŃÓŚŹŻ0-9][\wĄĆĘŁŃÓŚŹŻąćęłńóśźż.\'-]{1,30}){0,5}\s+\d{1,4}[a-zA-Z]?(?:\s*(?:\/|m\.?|lok\.?)\s*\d{1,4})?\b/u',
        static fn(array $m): string => $nextToken('ADRES', $m[0]),
        $working
    );

    return [
        'masked' => $working,
        'replacements' => $replacements,
        'count' => count($replacements),
    ];
}

/**
 * Odtwarza oryginalne wartości w strumieniu tekstu (chunk-by-chunk),
 * przechowując niedomknięty fragment tokenu `<...` w buforze `$carryBuffer`
 * pomiędzy kolejnymi ramkami SSE (wzorzec StreamRestorer z polanon).
 *
 * @param string $chunk Nowy fragment tekstu ze strumienia SSE
 * @param string &$carryBuffer Bufor przeniesienia między chunkami (modyfikowany przez referencję)
 * @param array<string, string> $replacements Mapa `<TOKEN_N> => oryginał`
 */
function restore_stream_chunk(string $chunk, string &$carryBuffer, array $replacements): string
{
    $combined = $carryBuffer . $chunk;
    $carryBuffer = '';

    if ($combined === '' || $replacements === []) {
        return $combined;
    }

    $lastOpen = strrpos($combined, '<');
    if ($lastOpen !== false) {
        $lastClose = strrpos($combined, '>');
        if ($lastClose === false || $lastClose < $lastOpen) {
            $tail = substr($combined, $lastOpen);
            // Jeśli końcówka wygląda jak początek naszego tokenu `<PESEL_1>` (max 24 znaki)
            if (strlen($tail) <= 24 && preg_match('/^<[A-Z_0-9]*$/i', $tail) === 1) {
                $carryBuffer = $tail;
                $combined = substr($combined, 0, $lastOpen);
            }
        }
    }

    return strtr($combined, $replacements);
}

/**
 * Opróżnia bufor przeniesienia po zakończeniu strumienia SSE.
 *
 * @param string &$carryBuffer
 * @param array<string, string> $replacements
 */
function flush_stream_restorer(string &$carryBuffer, array $replacements): string
{
    if ($carryBuffer === '') {
        return '';
    }
    $flushed = strtr($carryBuffer, $replacements);
    $carryBuffer = '';
    return $flushed;
}
