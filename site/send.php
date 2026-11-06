<?php
/**
 * SYPRAMED — Envoi du formulaire de contact (hébergé sur Genious)
 * -------------------------------------------------------------
 * Le site et la boîte contact@sypramed.ma sont sur le même serveur :
 * on utilise la fonction mail() locale de cPanel (fiable, sans SMTP ni
 * mot de passe). Le message part DE contact@sypramed.ma VERS contact@sypramed.ma,
 * avec l'e-mail du visiteur en "Répondre à".
 */

$MAIL_TO   = 'contact@sypramed.ma';   // destinataire des demandes
$MAIL_FROM = 'contact@sypramed.ma';   // expéditeur (compte local du domaine)

header('Content-Type: application/json; charset=utf-8');

if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') {
  http_response_code(405);
  echo json_encode(['success' => false, 'message' => 'Méthode non autorisée']); exit;
}

// ---- Anti-spam : honeypot ----
if (!empty($_POST['botcheck'])) { echo json_encode(['success' => true]); exit; }

// ---- Champs ----
function field($k) { return trim((string)($_POST[$k] ?? '')); }
$nom = field('nom'); $societe = field('societe'); $email = field('email');
$tel = field('tel'); $sujet = field('sujet'); $message = field('message');

$errors = [];
if ($nom === '')     $errors[] = 'nom';
if ($tel === '')     $errors[] = 'téléphone';
if ($message === '') $errors[] = 'message';
if (!filter_var($email, FILTER_VALIDATE_EMAIL)) $errors[] = 'email';
if ($errors) {
  http_response_code(422);
  echo json_encode(['success' => false, 'message' => 'Champs invalides : ' . implode(', ', $errors)]); exit;
}

// Empêche l'injection d'en-têtes via l'email du visiteur
$replyTo = preg_replace('/[\r\n]+/', ' ', $email);

$subject = 'Site SYPRAMED — ' . ($sujet ?: 'Nouvelle demande') . ' — ' . $nom;
$body = implode("\n", [
  "Nouvelle demande depuis le formulaire du site :", "",
  "Nom      : $nom",
  "Société  : " . ($societe ?: '—'),
  "Email    : $email",
  "Téléphone: $tel",
  "Sujet    : " . ($sujet ?: '—'),
  "", "Message :", $message, "",
  "---", "Envoyé automatiquement depuis sypramed.ma",
]);

$encSubject = '=?UTF-8?B?' . base64_encode($subject) . '?=';
$headers  = "From: SYPRAMED <$MAIL_FROM>\r\n";
$headers .= "Reply-To: $replyTo\r\n";
$headers .= "MIME-Version: 1.0\r\n";
$headers .= "Content-Type: text/plain; charset=UTF-8\r\n";
$headers .= "Content-Transfer-Encoding: 8bit\r\n";

// -f fixe l'expéditeur d'enveloppe (meilleure délivrabilité / SPF)
$ok = @mail($MAIL_TO, $encSubject, $body, $headers, '-f ' . $MAIL_FROM);

if ($ok) {
  echo json_encode(['success' => true, 'message' => 'Message envoyé']);
} else {
  http_response_code(502);
  echo json_encode(['success' => false, 'message' => "L'envoi a échoué côté serveur. Réessayez ou écrivez à $MAIL_TO."]);
}
