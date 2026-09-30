# Déploiement du site sur Genious (auto-déploiement + formulaire)

Le site est **hébergé sur Genious** et **redéployé automatiquement** à chaque
push GitHub (via FTP). Le formulaire de contact (`send.php`) tourne sur le même
serveur : il envoie les demandes via le compte SMTP **contact@sypramed.ma**.

```
git push ──► GitHub Actions ──(FTP)──► Genious /public_html ──► www.sypramed.ma
Formulaire ──► send.php (même serveur) ──(SMTP)──► boîte contact@sypramed.ma
```

## A. DNS (rien à faire de spécial)
Le domaine `sypramed.ma` utilise déjà les **nameservers Genious**
(`hamza.genious.net`, `omar.genious.net`) → il pointe donc **par défaut vers
Genious**. 

> ❌ N'ajoutez PAS les enregistrements GitHub (`185.199.x.x`) ni le sous-domaine
> `api`. Si vous les aviez déjà créés, **supprimez-les** et laissez `@` et `www`
> pointer vers le serveur Genious (`41.77.118.57`). Ne touchez pas aux `MX`.

## B. Auto-déploiement FTP — secrets GitHub (une fois)
Dans le dépôt GitHub → **Settings → Secrets and variables → Actions →
New repository secret**, créez :

| Nom du secret  | Valeur                                   |
|----------------|------------------------------------------|
| `FTP_SERVER`   | `41.77.118.57` (ou `ftp.sypramed.ma`)    |
| `FTP_USERNAME` | `sypramed`                               |
| `FTP_PASSWORD` | votre mot de passe FTP/cPanel (le nouveau) |

Ensuite, onglet **Actions → « Déploiement FTP vers Genious » → Run workflow**
(ou faites un push). Le site part dans `public_html/`.

> Si les fichiers arrivent au mauvais endroit, ajustez `server-dir` dans
> `.github/workflows/deploy-ftp.yml` (`./public_html/` pour le compte principal).

## C. Formulaire de contact — mot de passe SMTP (une fois)
`send.php` est déployé automatiquement, **mais pas le mot de passe** (pour ne
jamais l'exposer sur GitHub). Créez-le une seule fois sur le serveur :

1. cPanel → **Gestionnaire de fichiers** → `public_html`.
2. Créez un fichier **`mail-config.php`** (voir `mail-config.sample.php`) avec :
   ```php
   <?php
   $SMTP_PASS = 'le_mot_de_passe_de_contact@sypramed.ma';
   ```
3. Enregistrez. Ce fichier n'est jamais écrasé par les déploiements (il est
   exclu). Le formulaire enverra alors les demandes vers contact@sypramed.ma.

## D. HTTPS
cPanel → **SSL/TLS Status** → *Run AutoSSL* pour `sypramed.ma` et
`www.sypramed.ma` (cadenas 🔒).

## Sécurité
- Le mot de passe SMTP vit **uniquement** dans `public_html/mail-config.php`.
- Le mot de passe FTP/cPanel vit **uniquement** dans les *Secrets* GitHub.
- Changez ces mots de passe s'ils ont été communiqués en clair.
