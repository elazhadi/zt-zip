<?php
/**
 * SYPRAMED — Point d'envoi du formulaire de contact
 * -------------------------------------------------------------
 * À héberger sur Genious (PHP), PAS sur GitHub Pages.
 * Reçoit le formulaire (POST) et envoie un e-mail via le compte
 * SMTP contact@sypramed.ma, vers contact@sypramed.ma.
 *
 * Sécurité : le mot de passe reste ici, sur le serveur, et n'est
 * jamais visible côté visiteur. Ne publiez PAS ce fichier sur GitHub
 * avec le vrai mot de passe.
 */

// ============================================================
//  CONFIGURATION — à compléter directement sur le serveur Genious
// ============================================================
$SMTP_HOST = 'mail.sypramed.ma';
$SMTP_PORT = 465;                       // 465 = SSL (recommandé). 587 = TLS.
$SMTP_SECURE = 'ssl';                   // 'ssl' pour 465, 'tls' pour 587
$SMTP_USER = 'contact@sypramed.ma';     // identifiant du compte mail
$SMTP_PASS = 'A_REMPLACER_SUR_LE_SERVEUR'; // ⚠️ mettez le mot de passe ICI, sur le serveur

$MAIL_TO   = 'contact@sypramed.ma';     // destinataire des demandes
$MAIL_FROM = 'contact@sypramed.ma';     // expéditeur (doit = compte SMTP)

// Origine autorisée à appeler ce script (votre site)
$ALLOWED_ORIGINS = [
  'https://www.sypramed.ma',
  'https://sypramed.ma',
];
// ============================================================

// ---- CORS ----
$origin = $_SERVER['HTTP_ORIGIN'] ?? '';
if (in_array($origin, $ALLOWED_ORIGINS, true)) {
  header('Access-Control-Allow-Origin: ' . $origin);
}
header('Vary: Origin');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');
header('Content-Type: application/json; charset=utf-8');

if (($_SERVER['REQUEST_METHOD'] ?? '') === 'OPTIONS') { http_response_code(204); exit; }
if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') {
  http_response_code(405); echo json_encode(['success' => false, 'message' => 'Méthode non autorisée']); exit;
}

// ---- Anti-spam : honeypot ----
if (!empty($_POST['botcheck'])) { echo json_encode(['success' => true]); exit; } // robot -> on ignore

// ---- Récupération & nettoyage des champs ----
function field($k) { return trim((string)($_POST[$k] ?? '')); }
$nom     = field('nom');
$societe = field('societe');
$email   = field('email');
$tel     = field('tel');
$sujet   = field('sujet');
$message = field('message');

// ---- Validation ----
$errors = [];
if ($nom === '')     $errors[] = 'nom';
if ($tel === '')     $errors[] = 'téléphone';
if ($message === '') $errors[] = 'message';
if (!filter_var($email, FILTER_VALIDATE_EMAIL)) $errors[] = 'email';
if ($errors) {
  http_response_code(422);
  echo json_encode(['success' => false, 'message' => 'Champs invalides : ' . implode(', ', $errors)]);
  exit;
}

// ---- Construction du message ----
$subject = 'Site SYPRAMED — ' . ($sujet ?: 'Nouvelle demande') . ' — ' . $nom;
$bodyLines = [
  "Nouvelle demande depuis le formulaire du site :", "",
  "Nom      : $nom",
  "Société  : " . ($societe ?: '—'),
  "Email    : $email",
  "Téléphone: $tel",
  "Sujet    : " . ($sujet ?: '—'),
  "", "Message :", $message, "",
  "---", "Envoyé automatiquement depuis www.sypramed.ma",
];
$body = implode("\r\n", $bodyLines);

// ---- Envoi SMTP (sans dépendance) ----
function smtp_send($host, $port, $secure, $user, $pass, $from, $to, $replyTo, $subject, $body, &$err) {
  $remote = ($secure === 'ssl' ? 'ssl://' : '') . $host . ':' . $port;
  $ctx = stream_context_create(['ssl' => ['verify_peer' => true, 'verify_peer_name' => true]]);
  $fp = @stream_socket_client($remote, $errno, $errstr, 20, STREAM_CLIENT_CONNECT, $ctx);
  if (!$fp) { $err = "Connexion SMTP impossible ($errstr)"; return false; }
  stream_set_timeout($fp, 20);

  $read = function () use ($fp) {
    $data = '';
    while (($line = fgets($fp, 515)) !== false) {
      $data .= $line;
      if (isset($line[3]) && $line[3] === ' ') break; // dernière ligne (code suivi d'un espace)
    }
    return $data;
  };
  $cmd = function ($c) use ($fp, $read) { fwrite($fp, $c . "\r\n"); return $read(); };
  $code = function ($resp) { return (int)substr(trim($resp), 0, 3); };

  if ($code($read()) !== 220) { $err = 'Pas de réponse du serveur'; fclose($fp); return false; }
  $ehlo = $cmd('EHLO sypramed.ma');
  if ($code($ehlo) !== 250) { $err = 'EHLO refusé'; fclose($fp); return false; }

  // STARTTLS si port 587
  if ($secure === 'tls') {
    if ($code($cmd('STARTTLS')) !== 220) { $err = 'STARTTLS refusé'; fclose($fp); return false; }
    if (!stream_socket_enable_crypto($fp, true, STREAM_CRYPTO_METHOD_TLS_CLIENT)) { $err = 'TLS impossible'; fclose($fp); return false; }
    $cmd('EHLO sypramed.ma');
  }

  if ($code($cmd('AUTH LOGIN')) !== 334) { $err = 'AUTH non supporté'; fclose($fp); return false; }
  if ($code($cmd(base64_encode($user))) !== 334) { $err = 'Utilisateur refusé'; fclose($fp); return false; }
  if ($code($cmd(base64_encode($pass))) !== 235) { $err = 'Authentification échouée'; fclose($fp); return false; }

  if ($code($cmd("MAIL FROM:<$from>")) !== 250) { $err = 'MAIL FROM refusé'; fclose($fp); return false; }
  if (!in_array($code($cmd("RCPT TO:<$to>")), [250, 251], true)) { $err = 'RCPT TO refusé'; fclose($fp); return false; }
  if ($code($cmd('DATA')) !== 354) { $err = 'DATA refusé'; fclose($fp); return false; }

  $encSubject = '=?UTF-8?B?' . base64_encode($subject) . '?=';
  $headers  = "From: SYPRAMED <$from>\r\n";
  $headers .= "To: <$to>\r\n";
  $headers .= "Reply-To: <$replyTo>\r\n";
  $headers .= "Subject: $encSubject\r\n";
  $headers .= "MIME-Version: 1.0\r\n";
  $headers .= "Content-Type: text/plain; charset=UTF-8\r\n";
  $headers .= "Content-Transfer-Encoding: 8bit\r\n";
  $headers .= 'Date: ' . date('r') . "\r\n";
  $headers .= 'Message-ID: <' . bin2hex(random_bytes(8)) . "@sypramed.ma>\r\n";

  // Échappement des lignes commençant par un point (RFC 5321)
  $safeBody = preg_replace('/^\./m', '..', $body);
  $data = $headers . "\r\n" . $safeBody . "\r\n.";
  if ($code($cmd($data)) !== 250) { $err = "Message refusé à l'envoi"; fclose($fp); return false; }

  $cmd('QUIT');
  fclose($fp);
  return true;
}

$err = '';
$ok = smtp_send($SMTP_HOST, $SMTP_PORT, $SMTP_SECURE, $SMTP_USER, $SMTP_PASS,
                $MAIL_FROM, $MAIL_TO, $email, $subject, $body, $err);

if ($ok) {
  echo json_encode(['success' => true, 'message' => 'Message envoyé']);
} else {
  http_response_code(502);
  echo json_encode(['success' => false, 'message' => "Échec de l'envoi : $err"]);
}
