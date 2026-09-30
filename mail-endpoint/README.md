# Point d'envoi e-mail du formulaire (`send.php`)

Le site est hébergé sur **GitHub Pages** (statique) : il ne peut pas envoyer
d'e-mail par SMTP lui-même. Ce petit script **PHP** s'en charge et doit être
hébergé sur **Genious** (qui exécute le PHP et héberge le compte mail).

Le formulaire du site (`contact.html`) envoie les données à ce script, qui les
expédie via le compte **contact@sypramed.ma** (SMTP `mail.sypramed.ma`) vers
**contact@sypramed.ma**.

```
Visiteur ──(POST)──►  https://api.sypramed.ma/send.php  ──(SMTP)──►  boîte contact@sypramed.ma
 (site GitHub Pages)        (hébergé sur Genious)
```

## Mise en place (une seule fois)

### 1. Créer un sous-domaine sur Genious
Dans **cPanel → Sous-domaines**, créez `api.sypramed.ma`
(dossier racine par ex. `public_html/api`).

> DNS : comme `sypramed.ma` / `www` pointent vers GitHub, ajoutez dans la zone
> DNS un enregistrement **A** : `api` → `196.32.220.154` (l'IP de votre serveur
> Genious). Le sous-domaine `api` reste ainsi sur Genious.

### 2. Téléverser le script
Copiez **`send.php`** dans le dossier du sous-domaine (`public_html/api/`).

### 3. Renseigner le mot de passe (sur le serveur uniquement)
Éditez `send.php` sur le serveur et remplacez :
```php
$SMTP_PASS = 'A_REMPLACER_SUR_LE_SERVEUR';
```
par le mot de passe du compte `contact@sypramed.ma`.
⚠️ Ne remettez jamais ce fichier (avec le mot de passe) sur GitHub.

### 4. Activer le HTTPS du sous-domaine
cPanel → **SSL/TLS Status** → *Run AutoSSL* pour `api.sypramed.ma`.

### 5. Tester
Ouvrez `https://www.sypramed.ma/contact.html`, envoyez une demande :
elle doit arriver dans la boîte **contact@sypramed.ma**.

## Réglages
- Port : `465` (SSL) par défaut. Si bloqué, passez à `587` avec `$SMTP_SECURE = 'tls'`.
- `$ALLOWED_ORIGINS` : liste des domaines autorisés à appeler le script (déjà
  réglé sur www.sypramed.ma et sypramed.ma).
- Anti-spam : honeypot vérifié côté serveur ; le captcha est vérifié côté site.

## Repli automatique
Tant que `send.php` n'est pas en ligne, le bouton « Envoyer » du site ouvre
automatiquement le client mail du visiteur, pré-rempli vers contact@sypramed.ma.
L'URL de l'endpoint est configurable en haut de `site/assets/js/main.js`
(`MAIL_ENDPOINT`).

## Sécurité
- Le mot de passe SMTP reste **uniquement** dans `send.php` sur Genious.
- Changez le mot de passe du compte s'il a été communiqué en clair.
