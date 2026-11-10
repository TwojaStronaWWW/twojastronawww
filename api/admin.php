<?php
declare(strict_types=1);

require_once __DIR__ . '/bootstrap.php';

header('X-Robots-Tag: noindex, nofollow, noarchive');
header('Cache-Control: no-store, no-cache, must-revalidate');
header('Pragma: no-cache');

// [REF-05] Blokada żądań międzywitrynowych Cross-Site (OWASP Fetch Metadata)
if (isset($_SERVER['HTTP_SEC_FETCH_SITE']) && strtolower(trim((string)$_SERVER['HTTP_SEC_FETCH_SITE'])) === 'cross-site') {
    @session_write_close();
    http_response_code(403);
    exit('Niedozwolone żądanie międzywitrynowe (Cross-Site Request Blocked).');
}

$clientIp = get_client_ip();
if (is_client_ip_banned($clientIp)) {
    @session_write_close();
    http_response_code(403);
    exit('Dostęp tymczasowo zablokowany (15-min IP Penalty Box). Spróbuj ponownie później.');
}

// 1. Bezpieczne wylogowanie przez POST z weryfikacją tokenu CSRF (hash_equals)
if (($_SERVER['REQUEST_METHOD'] ?? '') === 'POST' && ($_POST['action'] ?? '') === 'logout') {
    $postedCsrf = (string)($_POST['csrf_token'] ?? '');
    $sessionCsrf = (isset($_SESSION['csrf_token']) && is_string($_SESSION['csrf_token'])) ? $_SESSION['csrf_token'] : '';
    if ($sessionCsrf === '' || $postedCsrf === '' || !hash_equals($sessionCsrf, $postedCsrf)) {
        @session_write_close();
        http_response_code(403);
        exit('Błąd weryfikacji tokenu bezpieczeństwa (CSRF).');
    }

    $_SESSION = [];
    if (ini_get('session.use_cookies')) {
        $params = session_get_cookie_params();
        setcookie(
            session_name(),
            '',
            time() - 42000,
            $params['path'],
            $params['domain'] ?? '',
            (bool)$params['secure'],
            (bool)$params['httponly']
        );
    }
    @session_destroy();
    @session_write_close();
    header('Location: admin.php');
    exit;
}

// 2. Obsługa POST (Logowanie chronione przez Rate Limit + 15-min IP Penalty Box + CSRF)
$error = '';
if (($_SERVER['REQUEST_METHOD'] ?? '') === 'POST' && ($_POST['action'] ?? 'login') === 'login') {
    if (!rate_limit('admin_login_' . $clientIp, 5, 300)) {
        ban_client_ip($clientIp, 900, 'admin_login_bruteforce');
        @session_write_close();
        http_response_code(429);
        exit('Zbyt wiele nieudanych prób logowania. Adres IP został zablokowany na 15 minut.');
    }

    if (!csrf_check((string)($_POST['csrf_token'] ?? ''))) {
        http_response_code(403);
        $error = 'Sesja formularza wygasła (CSRF). Spróbuj ponownie.';
    } else {
        $pin = (string)($_POST['pin'] ?? '');
        $passHash = get_env_secret('ADMIN_PASSWORD_HASH');
        $valid = false;

        if ($passHash !== '' && $pin !== '' && password_verify($pin, $passHash)) {
            $valid = true;
        } elseif (APP_PIN !== '' && $pin !== '' && hash_equals(APP_PIN, $pin)) {
            $valid = true;
        }

        if ($valid) {
            session_regenerate_id(true);
            $_SESSION['auth'] = true;
            $_SESSION['auth_at'] = time();
            unset($_SESSION['csrf_token']);
            @session_write_close();
            header('Location: admin.php');
            exit;
        }

        http_response_code(401);
        $error = 'Nieprawidłowy PIN lub hasło.';
    }
}

// 3. Sprawdzenie aktywnej sesji oraz TTL (SESSION_TTL = 1800s)
if (!empty($_SESSION['auth']) && $_SESSION['auth'] === true) {
    $authAt = isset($_SESSION['auth_at']) ? (int)$_SESSION['auth_at'] : 0;
    if ($authAt <= 0 || (time() - $authAt) > SESSION_TTL) {
        $_SESSION = [];
        @session_destroy();
        $error = 'Sesja wygasła po 30 minutach bezczynności. Zaloguj się ponownie.';
    } else {
        $_SESSION['auth_at'] = time();
        $csrf = csrf_token();
        @session_write_close();

        $leads = read_leads(false);
        $newsletterCount = count(array_filter($leads, static fn(array $l): bool => ($l[7] ?? 'NIE') === 'TAK'));
        ?>
<!doctype html>
<html lang="pl">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex, nofollow, noarchive">
<title>Panel Leadów i Zgód | TwojaStronaWWW</title>
<style>
body { font-family: system-ui, sans-serif; padding: 20px; background: #0f172a; color: #f8fafc; margin: 0; }
h1, h2 { color: #f8fafc; }
.topbar { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 12px; max-width: 1320px; margin-bottom: 12px; }
.actions-bar { display: flex; flex-wrap: wrap; align-items: center; gap: 10px; }
table { border-collapse: collapse; width: 100%; max-width: 1320px; background: #1e293b; box-shadow: 0 4px 12px rgba(0,0,0,0.3); border-radius: 8px; overflow: hidden; }
th, td { border: 1px solid #334155; padding: 12px; text-align: left; font-size: 14px; }
th { background: #0f172a; color: #94a3b8; font-weight: 600; }
tr:hover { background: #26354d; }
.small { color: #94a3b8; font-size: 14px; margin-bottom: 20px; }
.btn-export { display: inline-block; background: #1e293b; color: #34d399; border: 1px solid #334155; padding: 7px 12px; border-radius: 6px; text-decoration: none; font-size: 13px; font-weight: 600; }
.btn-export:hover { border-color: #34d399; }
.btn-logout { background: transparent; color: #f87171; border: 1px solid #f87171; padding: 7px 14px; border-radius: 6px; cursor: pointer; font-weight: 700; font-size: 13px; }
.btn-logout:hover { background: rgba(248, 113, 113, 0.12); }
.btn-del { background: #ef4444; color: #ffffff; border: none; padding: 6px 12px; border-radius: 4px; cursor: pointer; font-size: 12px; font-weight: 600; }
.btn-del:hover { background: #dc2626; }
.badge-yes { background: rgba(16, 185, 129, 0.2); color: #34d399; padding: 3px 8px; border-radius: 999px; font-weight: 600; font-size: 12px; }
.badge-no { background: rgba(148, 163, 184, 0.15); color: #94a3b8; padding: 3px 8px; border-radius: 999px; font-size: 12px; }
.inline-form { display: inline; margin: 0; }
</style>
</head>
<body>

<div class="topbar">
    <h1>Panel Leadów i Zgód (RODO Ready)</h1>
    <div class="actions-bar">
        <a href="export-leads.php" class="btn-export">Eksportuj CSV (Wszystkie)</a>
        <a href="export-leads.php?newsletter=1" class="btn-export">Eksportuj CSV (Newsletter)</a>
        <form method="post" action="admin.php" class="inline-form">
            <input type="hidden" name="action" value="logout">
            <input type="hidden" name="csrf_token" value="<?= htmlspecialchars($csrf, ENT_QUOTES, 'UTF-8') ?>">
            <button type="submit" class="btn-logout">Wyloguj się</button>
        </form>
    </div>
</div>

<p class="small">
Status: Zalogowano | Wszystkie zapytania: <strong><?= (int)count($leads) ?></strong> | Zgody na Newsletter (TAK): <strong><?= (int)$newsletterCount ?></strong>
</p>

<h2>Zebrane zapytania z formularza</h2>
<table>
<tr>
    <th>Data</th>
    <th>Imię</th>
    <th>E-mail</th>
    <th>Telefon</th>
    <th>Newsletter</th>
    <th>Wiadomość</th>
    <th>Akcja (RODO)</th>
</tr>
<?php foreach ($leads as $l):
    $dateStr = (string)($l[0] ?? '') . ' ' . (string)($l[1] ?? '');
    $leadName = (string)($l[2] ?? '');
    $leadEmail = (string)($l[3] ?? '');
    $msg = (string)($l[4] ?? '');
    $phone = (string)($l[6] ?? '-');
    $newsletter = (string)($l[7] ?? 'NIE');
    $id = lead_id($l);
?>
<tr>
    <td><?= htmlspecialchars($dateStr, ENT_QUOTES, 'UTF-8') ?></td>
    <td><?= htmlspecialchars($leadName, ENT_QUOTES, 'UTF-8') ?></td>
    <td><?= htmlspecialchars($leadEmail, ENT_QUOTES, 'UTF-8') ?></td>
    <td><?= htmlspecialchars($phone, ENT_QUOTES, 'UTF-8') ?></td>
    <td>
        <?php if ($newsletter === 'TAK'): ?>
            <span class="badge-yes">TAK</span>
        <?php else: ?>
            <span class="badge-no">NIE</span>
        <?php endif; ?>
    </td>
    <td><?= htmlspecialchars(mb_substr($msg, 0, 120), ENT_QUOTES, 'UTF-8') ?></td>
    <td>
        <form method="post" action="delete-lead.php" class="inline-form js-delete-lead-form">
            <input type="hidden" name="id" value="<?= htmlspecialchars($id, ENT_QUOTES, 'UTF-8') ?>">
            <input type="hidden" name="csrf_token" value="<?= htmlspecialchars($csrf, ENT_QUOTES, 'UTF-8') ?>">
            <button type="submit" class="btn-del">Usuń</button>
        </form>
    </td>
</tr>
<?php endforeach; ?>
</table>

<script>
document.querySelectorAll('.js-delete-lead-form').forEach(function (form) {
    form.addEventListener('submit', function (event) {
        if (!window.confirm('Czy na pewno usunąć ten wpis zgodnie z prawem do bycia zapomnianym (RODO)?')) {
            event.preventDefault();
        }
    });
});
</script>
</body>
</html>
        <?php
        exit;
    }
}

$loginCsrf = csrf_token();
@session_write_close();
?>
<!doctype html>
<html lang="pl">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex, nofollow, noarchive">
<title>Logowanie | TwojaStronaWWW</title>
<style>
body { display: flex; align-items: center; justify-content: center; height: 100vh; font-family: system-ui, sans-serif; background: #0f172a; color: #f8fafc; margin: 0; }
.login-box { background: #1e293b; padding: 40px; border-radius: 12px; border: 1px solid #334155; box-shadow: 0 10px 25px rgba(0,0,0,0.4); text-align: center; width: 100%; max-width: 320px; }
input[type="password"] { width: 100%; padding: 12px; margin: 12px 0; border: 1px solid #334155; background: #0f172a; color: #fff; border-radius: 6px; box-sizing: border-box; }
button { width: 100%; padding: 12px; background: #2563eb; color: white; border: none; border-radius: 6px; cursor: pointer; font-size: 16px; font-weight: 600; }
button:hover { background: #1d4ed8; }
.error { color: #f87171; margin-bottom: 10px; font-size: 14px; }
.sr-only { position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px; overflow: hidden; clip: rect(0, 0, 0, 0); white-space: nowrap; border: 0; }
</style>
</head>
<body>
<div class="login-box">
    <h2>Dostęp Chroniony</h2>
    <?php if ($error !== ''): ?><p class="error" role="alert"><?= htmlspecialchars($error, ENT_QUOTES, 'UTF-8') ?></p><?php endif; ?>
    <form method="post" action="admin.php">
        <input type="hidden" name="action" value="login">
        <input type="hidden" name="csrf_token" value="<?= htmlspecialchars($loginCsrf, ENT_QUOTES, 'UTF-8') ?>">
        <label for="adminPinInput" class="sr-only">Kod PIN lub hasło administratora</label>
        <input type="password" id="adminPinInput" name="pin" placeholder="Wprowadź PIN" required autofocus autocomplete="current-password">
        <button type="submit">Zaloguj</button>
    </form>
</div>
</body>
</html>
