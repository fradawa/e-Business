# Dossier d'Importation Rapide de Produits - THIAflow

## Comment importer tes produits :

1. Dépose tes fichiers images dans ce dossier (ex: `parfum.jpg`, `creme.png`).
2. Crée un fichier nommé `produits.json` dans ce dossier (tu peux copier et adapter `produits.example.json`).
3. Lance la commande :
   ```bash
   npm run import
   ```
   *(ou `node import-produits.js`)*

## Ce que fait le script automatiquement :
- Vérifie que toutes les images citées dans le JSON existent.
- Uploade chaque image sur **Cloudinary** (`boutique_images`).
- Enregistre chaque produit dans **Firestore** (`produits`).
- Met à jour les pages SEO et le sitemap (`generate-product-pages.js`).
- Archive le fichier `produits.json` pour éviter les doublons.
