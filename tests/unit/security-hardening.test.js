import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.join(__dirname, '..', '..');

function readRepoFile(relPath) {
  return fs.readFileSync(path.join(ROOT_DIR, relPath), 'utf8');
}

describe('Threat Protection, OWASP ASVS ([REF-05]) & Zero-Bloat Regression Suite', () => {
  it('api/admin.php posiada Rate Limit + 15-min Penalty Box, Sec-Fetch-Site, POST CSRF logout, X-Robots-Tag, no-store i pełne escapowanie XSS', () => {
    const adminPhp = readRepoFile('api/admin.php');

    assert.match(adminPhp, /X-Robots-Tag:\s*noindex,\s*nofollow,\s*noarchive/i);
    assert.match(adminPhp, /Cache-Control:\s*no-store,\s*no-cache,\s*must-revalidate/i);
    assert.match(adminPhp, /HTTP_SEC_FETCH_SITE/);
    assert.match(adminPhp, /cross-site/);
    assert.match(adminPhp, /is_client_ip_banned\s*\(/);
    assert.match(adminPhp, /rate_limit\s*\(\s*'admin_login_'/);
    assert.match(adminPhp, /ban_client_ip\s*\(\s*\$clientIp,\s*900/);
    assert.doesNotMatch(adminPhp, /\$_GET\s*\[\s*['"]logout['"]\s*\]/, 'Wylogowanie nie może odbywać się przez GET (CSRF logout protection)');
    assert.match(adminPhp, /action['"]\s*\]\s*\?\?\s*['"]['"]\)\s*===\s*['"]logout['"]/);
    assert.match(adminPhp, /hash_equals\s*\(/);
    assert.match(adminPhp, /ENT_QUOTES,\s*'UTF-8'/);
    assert.doesNotMatch(adminPhp, /\s(?:style|onclick|onsubmit)=["']/i, 'api/admin.php nie może zawierać inline style/onclick/onsubmit');
  });

  it('api/export-leads.php i api/delete-lead.php (oraz całe api/) nie przyjmują PIN-u w $_GET, wymuszają SESSION_TTL, POST+CSRF i CSV Formula Injection guard', () => {
    const apiDir = path.join(ROOT_DIR, 'api');
    const phpFiles = fs.readdirSync(apiDir).filter((f) => f.endsWith('.php'));

    for (const file of phpFiles) {
      const content = fs.readFileSync(path.join(apiDir, file), 'utf8');
      assert.doesNotMatch(
        content,
        /\$_(?:GET|REQUEST)\s*\[\s*['"]pin['"]\s*\]/i,
        `Wykryto niebezpieczne przekazywanie PIN-u w URL w pliku api/${file}!`
      );
    }

    const exportPhp = readRepoFile('api/export-leads.php');
    assert.match(exportPhp, /SESSION_TTL/, 'api/export-leads.php musi weryfikować wygasanie sesji SESSION_TTL');
    assert.match(exportPhp, /HTTP_SEC_FETCH_SITE/);
    assert.match(exportPhp, /sanitize_csv_cell\s*\(/, 'api/export-leads.php musi neutralizować CSV Formula Injection');
    assert.match(exportPhp, /fputcsv\s*\([^;]+,\s*','\s*,\s*'"'\s*,\s*''\s*\)/, 'fputcsv musi posiadać jawny parametr escape dla PHP 8.5');

    const deletePhp = readRepoFile('api/delete-lead.php');
    assert.match(deletePhp, /REQUEST_METHOD['"]\s*\]\s*\?\?\s*['"]['"]\)\s*!==\s*['"]POST['"]/);
    assert.match(deletePhp, /SESSION_TTL/);
    assert.match(deletePhp, /csrf_check\s*\(/);
    assert.match(deletePhp, /HTTP_SEC_FETCH_SITE/);
  });

  it('api/bootstrap.php i api/rate-limit.php egzekwują limit 65536 B (HTTP 413), json depth 16, cookie_secure, use_strict_mode, wrapper unregister i Zero-PII Penalty Box', () => {
    const bootstrapPhp = readRepoFile('api/bootstrap.php');
    assert.match(bootstrapPhp, /65536/);
    assert.match(bootstrapPhp, /413/);
    assert.match(bootstrapPhp, /file_get_contents\s*\(\s*'php:\/\/input',\s*false,\s*null,\s*0,\s*65536\s*\)/);
    assert.match(bootstrapPhp, /json_decode\s*\(\s*\$rawBody,\s*true,\s*16\s*\)/);
    assert.match(bootstrapPhp, /session\.cookie_secure/);
    assert.match(bootstrapPhp, /session\.use_strict_mode/);

    const rateLimitPhp = readRepoFile('api/rate-limit.php');
    for (const wrapper of ['phar', 'ftp', 'ftps', 'expect']) {
      assert.match(rateLimitPhp, new RegExp(`'${wrapper}'`), `Brak wyrejestrowania wrappera ${wrapper} w api/rate-limit.php`);
    }
    assert.match(rateLimitPhp, /function\s+mask_ip\s*\(/);
    assert.match(rateLimitPhp, /function\s+ban_client_ip\s*\(/);
    assert.match(rateLimitPhp, /function\s+is_client_ip_banned\s*\(/);
    assert.match(rateLimitPhp, /rate_'\s*\.\s*\$action\s*\.\s*'_'/, 'Nazwy plików rate-limit muszą mieć format Zero-PII rate_<akcja>_<sha256>.json');
  });

  it('api/contact.php i api/MediaService.php posiadają WAF L7 -> Penalty Box, ochronę CRLF telefonu, mask_ip, RFC 2047, NTFY_BASE_URL/NTFY_TOKEN, osTicket HTTPS i strażnika bomby GD', () => {
    const contactPhp = readRepoFile('api/contact.php');
    assert.match(contactPhp, /detect_waf_l7_attack\s*\(/);
    assert.match(contactPhp, /ban_client_ip\s*\(\s*\$ip,\s*900/);
    assert.match(contactPhp, /preg_replace\s*\(\s*'\/\[\^0-9\+\\- \(\)\]\/'/);
    assert.doesNotMatch(contactPhp, /\[\^0-9\+\\s\\-\(\)\]/, 'Regex telefonu nie może zawierać \\s przepuszczającego \\r\\n (CRLF Injection)');
    assert.match(contactPhp, /mask_ip\s*\(\s*\$ip\s*\)/);
    assert.match(contactPhp, /=\?UTF-8\?B\?/);
    assert.match(contactPhp, /NTFY_BASE_URL/);
    assert.match(contactPhp, /NTFY_TOKEN/);
    assert.match(contactPhp, /https:\/\/hd\.twojastronawww\.pl\/ticket_hook\.php/);
    assert.doesNotMatch(contactPhp, /\b(?:curl_close|finfo_close|imagedestroy)\s*\(/, 'Kompatybilność PHP 8.5: zakaz wywoływania zdeprecjonowanych funkcji zamykających');

    const mediaPhp = readRepoFile('api/MediaService.php');
    assert.match(mediaPhp, /getimagesize\s*\(/);
    assert.match(mediaPhp, /MAX_IMAGE_DIMENSION\s*=\s*8000/);
    assert.match(mediaPhp, /MAX_IMAGE_PIXELS\s*=\s*32000000/);
    assert.doesNotMatch(mediaPhp, /\b(?:finfo_close|imagedestroy)\s*\(/);
  });

  it('Zero-Bloat, .htaccess, CI/CD i LF: brak śmieciowych plików, pełne blokady Apache, zsynchronizowane workflowy i czyste LF w .githooks/*', () => {
    assert.equal(fs.existsSync(path.join(ROOT_DIR, 'docs', 'audits')), false, 'Katalog docs/audits/ musi być usunięty');

    const gitignore = readRepoFile('.gitignore');
    assert.match(gitignore, /docs\/audits\//);

    const removedBloat = [
      'assets/img/hardware-internals-art.jpg',
      'assets/img/telemetry-matrix-art.jpg',
      'assets/img/hero-console-art.jpg',
      'assets/img/logo-512.png',
      'dokumentacja_systemu.md',
      'tests/test_live_csrf.php'
    ];
    for (const rel of removedBloat) {
      assert.equal(fs.existsSync(path.join(ROOT_DIR, rel)), false, `Nieużywany plik ${rel} powinien być usunięty`);
    }

    const aiConfig = JSON.parse(readRepoFile('assets/data/ai-config.json'));
    assert.equal(aiConfig.enabled, true);
    assert.equal(aiConfig.siteId, 'twojastronawww');

    const npmrc = readRepoFile('.npmrc');
    assert.match(npmrc, /ignore-scripts=true/);

    const rootHtaccess = readRepoFile('.htaccess');
    assert.match(rootHtaccess, /mod_brotli\.c/);
    assert.match(rootHtaccess, /mod_deflate\.c/);
    assert.match(rootHtaccess, /image\/avif/);
    assert.match(rootHtaccess, /<Files\s+"sw\.js">/);
    assert.match(rootHtaccess, /expect:\/\//);
    for (const token of ['sqlite', 'db', 'pem', 'key', 'kdbx', 'package', 'npmrc', 'gitleaks']) {
      assert.match(rootHtaccess, new RegExp(token), `Brak blokady ${token} w głównym .htaccess`);
    }

    const apiHtaccess = readRepoFile('api/.htaccess');
    assert.match(apiHtaccess, /expect:\/\//);
    for (const token of ['sqlite', 'db', 'pem', 'key', 'kdbx', 'package', 'npmrc', 'gitleaks']) {
      assert.match(apiHtaccess, new RegExp(token), `Brak blokady ${token} w api/.htaccess`);
    }

    const deployYml = readRepoFile('.github/workflows/deploy.yml');
    const dependabotYml = readRepoFile('.github/workflows/dependabot-automerge.yml');
    const deployNameMatch = deployYml.match(/^name:\s*"([^"]+)"/m);
    assert.ok(deployNameMatch, 'Brak nazwy workflowu w deploy.yml');
    assert.ok(
      dependabotYml.includes(`workflows: ["${deployNameMatch[1]}"]`),
      'Nazwa workflowu w dependabot-automerge.yml musi dokładnie odpowiadać nazwie w deploy.yml'
    );

    const aiReviewYml = readRepoFile('.github/workflows/ai-security-review.yml');
    assert.match(aiReviewYml, /author_association/);
    assert.match(aiReviewYml, /OWNER/);
    assert.match(aiReviewYml, /MEMBER/);
    assert.match(aiReviewYml, /COLLABORATOR/);
    assert.match(aiReviewYml, /gemini-3\.5-flash/);
    assert.doesNotMatch(aiReviewYml, /cache:\s*['"]?npm['"]?/);

    // Weryfikacja czystego LF (\n) w .githooks/* oraz ewentualnych *.sh
    const githooksDir = path.join(ROOT_DIR, '.githooks');
    for (const hook of fs.readdirSync(githooksDir)) {
      const raw = fs.readFileSync(path.join(githooksDir, hook), 'utf8');
      assert.equal(raw.includes('\r\n'), false, `Plik .githooks/${hook} nie może mieć końców linii CRLF!`);
    }
  });
});
