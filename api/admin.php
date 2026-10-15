<?php
declare(strict_types=1);

require_once __DIR__ . '/bootstrap.php';

// Konfiguracja TTL (30 min)
$SESSION_TTL = 1800;

// 1. Wylogowanie
if (isset($_GET['logout'])) {
    session_destroy();
    header("Location: admin.php");
    exit;
}

// 2. Obsługa POST (Logowanie)
$error = '';
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $pin = $_POST['pin'] ?? '';
    if (hash_equals(APP_PIN, (string)$pin)) {
        session_regenerate_id(true);
        $_SESSION['auth'] = true;
        $_SESSION['auth_at'] = time();
        header("Location: admin.php");
        exit;
    } else {
        $error = "Nieprawidłowy PIN.";
        sleep(2);
    }
}

// 3. Sprawdzenie Sesji
if (!empty($_SESSION['auth']) && $_SESSION['auth'] === true) {
    if (time() - ($_SESSION['auth_at'] ?? 0) > $SESSION_TTL) {
        session_destroy();
        $error = "Sesja wygasła. Zaloguj się ponownie.";
    } else {
        $_SESSION['auth_at'] = time();

        $leads = read_leads(false);
        $newsletterCount = count(array_filter($leads, fn($l) => ($l[7] ?? 'NIE') === 'TAK'));
        $csrf = csrf_token();
        ?>
<!doctype html>
<html lang="pl">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Panel Leadów i Zgód | TwojaStronaWWW</title>
<style>
body { font-family: system-ui, sans-serif; padding: 20px; background: #0f172a; color: #f8fafc; }
h1, h2 { color: #f8fafc; }
table { border-collapse: collapse; width: 100%; max-width: 1320px; background: #1e293b; box-shadow: 0 4px 12px rgba(0,0,0,0.3); border-radius: 8px; overflow: hidden; }
th, td { border: 1px solid #334155; padding: 12px; text-align: left; font-size: 14px; }
th { background: #0f172a; color: #94a3b8; font-weight: 600; }
tr:hover { background: #26354d; }
.small { color: #94a3b8; font-size: 14px; margin-bottom: 20px; }
.logout { float: right; color: #f87171; text-decoration: none; font-weight: bold; }
.btn-del { background: #ef4444; color: white; border: none; padding: 6px 12px; border-radius: 4px; cursor: pointer; font-size: 12px; }
.btn-del:hover { background: #dc2626; }
.badge-yes { background: rgba(16, 185, 129, 0.2); color: #34d399; padding: 3px 8px; border-radius: 999px; font-weight: 600; font-size: 12px; }
.badge-no { background: rgba(148, 163, 184, 0.15); color: #94a3b8; padding: 3px 8px; border-radius: 999px; font-size: 12px; }
</style>
</head>
<body>

<a href="?logout=1" class="logout">Wyloguj się</a>
<h1>Panel Leadów i Zgód (RODO Ready)</h1>

<p class="small">
Status: Zalogowano | Wszystkie zapytania: <strong><?= count($leads) ?></strong> | Zgody na Newsletter (TAK): <strong><?= $newsletterCount ?></strong>
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
    $msg = (string)($l[4] ?? '');
    $phone = (string)($l[6] ?? '-');
    $newsletter = (string)($l[7] ?? 'NIE');
    $id = lead_id($l);
?>
<tr>
    <td><?= htmlspecialchars($l[0] . ' ' . $l[1]) ?></td>
    <td><?= htmlspecialchars((string)$l[2]) ?></td>
    <td><?= htmlspecialchars((string)$l[3]) ?></td>
    <td><?= htmlspecialchars($phone) ?></td>
    <td>
        <?php if ($newsletter === 'TAK'): ?>
            <span class="badge-yes">TAK</span>
        <?php else: ?>
            <span class="badge-no">NIE</span>
        <?php endif; ?>
    </td>
    <td><?= htmlspecialchars(mb_substr($msg, 0, 120)) ?></td>
    <td>
        <form method="post" action="delete-lead.php" onsubmit="return confirm('Czy na pewno usunąć ten wpis zgodnie z prawem do bycia zapomnianym (RODO)?');">
            <input type="hidden" name="id" value="<?= $id ?>">
            <input type="hidden" name="csrf_token" value="<?= $csrf ?>">
            <button type="submit" class="btn-del">Usuń</button>
        </form>
    </td>
</tr>
<?php endforeach; ?>
</table>

</body>
</html>
        <?php
        exit;
    }
}
?>
<!doctype html>
<html lang="pl">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Logowanie | TwojaStronaWWW</title>
<style>
body { display: flex; align-items: center; justify-content: center; height: 100vh; font-family: system-ui, sans-serif; background: #0f172a; color: #f8fafc; margin: 0; }
.login-box { background: #1e293b; padding: 40px; border-radius: 12px; border: 1px solid #334155; box-shadow: 0 10px 25px rgba(0,0,0,0.4); text-align: center; width: 100%; max-width: 320px; }
input { width: 100%; padding: 12px; margin: 12px 0; border: 1px solid #334155; background: #0f172a; color: #fff; border-radius: 6px; box-sizing: border-box; }
button { width: 100%; padding: 12px; background: #2563eb; color: white; border: none; border-radius: 6px; cursor: pointer; font-size: 16px; font-weight: 600; }
button:hover { background: #1d4ed8; }
.error { color: #f87171; margin-bottom: 10px; font-size: 14px; }
</style>
</head>
<body>
<div class="login-box">
    <h2>Dostęp Chroniony</h2>
    <?php if ($error): ?><p class="error"><?= htmlspecialchars($error) ?></p><?php endif; ?>
    <form method="POST">
        <input type="password" name="pin" placeholder="Wprowadź PIN" required autofocus>
        <button type="submit">Zaloguj</button>
    </form>
</div>
</body>
</html>
