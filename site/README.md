# SYPRAMED — Site web

Site vitrine de **SYPRAMED**, distributeur agréé **STRUGAL** — comptoir de
vente de profilés aluminium et accessoires au Maroc.

Le design s'inspire des sites de distributeurs aluminium concurrents
(ex. alunionprofil.com) tout en reprenant l'identité visuelle de SYPRAMED
(logo, couleurs rouge / gris anthracite extraites du devis officiel).

## Structure

```
site/
├── index.html        # Accueil (hero, valeurs, gammes, services, avis, CTA)
├── produits.html     # Catalogue : coulissants, battants, accessoires, finitions
├── a-propos.html     # Présentation de la société, mission, valeurs
├── contact.html      # Coordonnées, formulaire de devis, carte
└── assets/
    ├── css/style.css # Design system complet (responsive)
    ├── js/main.js    # Nav mobile, scroll-reveal, compteurs, formulaire
    └── img/          # Logo, illustrations SVG
```

## Informations société

- **Raison sociale** : SYPRAMED — Impo & Export Aluminium
- **Statut** : Distributeur agréé STRUGAL
- **Adresse** : Lot Al Kasr N° 12 – Skhirat (région de Témara), Maroc
- **Téléphone** : +212 5 37 61 19 11 (fixe) · +212 6 61 91 08 93 (mobile / WhatsApp)
- **Email** : contact@sypramed.ma
- **Web** : spra-med.com
- **Activité** : Comptoir de vente des profilés aluminium & accessoires
- **Google Maps** : https://maps.app.goo.gl/2XUcbgRXSbeirVFe7

## Contenus intégrés

- **Gamme STRUGAL complète** sur `produits.html` : coulissants, battants /
  oscillo-battants, portes, mur rideau & façades, volets & brise-soleil,
  garde-corps, accessoires & quincaillerie, finitions — plus un tableau
  récapitulatif des systèmes (S40, S46, S53 RPT, S70, S90, S88 RP, etc.).
- **Vidéo YouTube** STRUGAL intégrée sur l'accueil + liens vers la
  **chaîne officielle** https://youtube.com/@strugalaluminium (icônes sociales).
- **Photos produits** : voir `assets/img/products/README.md` pour ajouter les
  vraies photos du catalogue Strugal (repli automatique sur illustration SVG).

## Aperçu local

Aucune dépendance / build : ouvrez simplement `index.html` dans un navigateur,
ou servez le dossier :

```bash
cd site
python3 -m http.server 8080
# puis http://localhost:8080
```

## Référencement (SEO)

Bonnes pratiques mises en place sur chaque page :

- **Balises `<title>` et `<meta description>`** uniques et descriptives.
- **URL canoniques** (`rel="canonical"`) → domaine **https://www.sypramed.ma**.
- **Open Graph + Twitter Cards** (partage réseaux) avec image dédiée
  `assets/img/og-image.jpg` (1200×630).
- **Données structurées JSON-LD** : `HardwareStore` (NAP, horaires, géoloc,
  marque STRUGAL) sur l'accueil et la page contact ; `BreadcrumbList` sur les
  pages intérieures → éligible aux résultats enrichis Google.
- **`robots.txt`** + **`sitemap.xml`** (4 pages).
- **Favicons** carrés (`favicon-32.png`, `apple-touch-icon.png`) + `theme-color`.
- HTML5 sémantique, `lang="fr"`, `alt` sur les images, un seul `<h1>` par page.
- Balises `geo.*` (Skhirat, Témara) pour le SEO local.

> ⚠️ **À faire avant la mise en ligne :**
> 1. Déployer le site **à la racine** du domaine `www.sypramed.ma` (les URL
>    canoniques/sitemap pointent vers la racine, pas vers `/site/`).
> 2. Vérifier les **coordonnées GPS exactes** dans le JSON-LD (`geo`) — la
>    valeur actuelle (33.8567, -7.0333) est une approximation de Skhirat.
> 3. Déclarer le site dans **Google Search Console** et y soumettre le sitemap
>    `https://www.sypramed.ma/sitemap.xml`.
> 4. Créer la **fiche Google Business Profile** (essentiel pour le SEO local).

## Technique

- HTML5 sémantique + CSS moderne (variables, grid, flexbox), 100 % responsive.
- Aucune dépendance JS externe (vanilla JS).
- Polices Google Fonts (Inter / Sora).
- Illustrations en SVG inline (pas d'images lourdes), chargement rapide.
## Formulaire de contact (envoi e-mail + anti-spam)

Les demandes sont envoyées à **Sypramed@gmail.com**. Le site étant statique
(sans serveur), l'envoi passe par **Web3Forms** (gratuit, sans backend).

Protection anti-spam intégrée :
- **Captcha** mathématique simple (ex. « 3 + 4 ? ») validé avant l'envoi ;
- **Honeypot** caché (`botcheck`) qui piège les robots.

### Activer l'envoi réel (1 étape, ~30 s)

1. Allez sur **https://web3forms.com**, saisissez `Sypramed@gmail.com`,
   récupérez la **clé d'accès** (Access Key) reçue par e-mail.
2. Dans `assets/js/main.js`, remplacez :
   ```js
   const WEB3FORMS_KEY = "REPLACE_WITH_YOUR_ACCESS_KEY";
   ```
   par votre clé. C'est tout — les demandes arrivent dans la boîte Gmail.

> Tant que la clé n'est pas renseignée, le bouton « Envoyer » ouvre
> automatiquement le **client mail** du visiteur (mailto) prérempli vers
> Sypramed@gmail.com : le formulaire reste donc fonctionnel par défaut.

Alternatives possibles (au lieu de Web3Forms) : Formspree, EmailJS, ou un
petit backend PHP `mail()` — il suffit de changer l'URL d'envoi dans `main.js`.
