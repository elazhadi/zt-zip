# SYPRAMED — Site web

Site vitrine de **SYPRAMED**, distributeur agréé **STRUGAL** spécialisé dans
l'import & export de profilés et systèmes en aluminium au Maroc.

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
- **Email** : sypramed@gmail.com
- **Web** : spra-med.com
- **Google Maps** : https://maps.app.goo.gl/2XUcbgRXSbeirVFe7

## Contenus intégrés

- **Gamme STRUGAL complète** sur `produits.html` : coulissants, battants /
  oscillo-battants, portes (ALUDOORS), mur rideau & façades, volets & brise-soleil,
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

## Technique

- HTML5 sémantique + CSS moderne (variables, grid, flexbox), 100 % responsive.
- Aucune dépendance JS externe (vanilla JS).
- Polices Google Fonts (Inter / Sora).
- Illustrations en SVG inline (pas d'images lourdes), chargement rapide.
- Le formulaire de contact est une démo front-end ; à brancher sur un service
  d'envoi (Formspree, EmailJS, backend PHP…) pour la mise en production.
