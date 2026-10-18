/**
 * THIAFlow - Script d'importation automatique en masse des produits
 * 
 * Fonctionnalités :
 * 1. Lit un fichier JSON contenant les produits (par défaut `imports/produits.json`)
 * 2. Vérifie la présence de toutes les images locales avant de commencer
 * 3. Upload chaque image automatiquement sur Cloudinary (preset unsigned boutique_images)
 * 4. Insère les données dans Firestore (collection 'produits')
 * 5. Régénère les pages SEO et le sitemap via `generate-product-pages.js`
 * 6. Renomme le fichier JSON traité pour éviter les doublons
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const admin = require('firebase-admin');

// Configuration Cloudinary (depuis env.js)
const CLOUDINARY_CLOUD_NAME = 'dfbqhoqsq';
const CLOUDINARY_UPLOAD_PRESET = 'boutique_images';

// Catégories autorisées par le site
const VALID_CATEGORIES = ['Parfums', 'Soins', 'Hygiène', 'Accessoires', 'Vêtements'];

// 1. Initialisation Firebase Admin
try {
  let serviceAccount = null;
  const serviceAccountPath = path.join(__dirname, 'serviceAccountKey.json');

  if (process.env.FIREBASE_SERVICE_ACCOUNT) {
    try {
      serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
    } catch {
      const decoded = Buffer.from(process.env.FIREBASE_SERVICE_ACCOUNT, 'base64').toString('utf8');
      serviceAccount = JSON.parse(decoded);
    }
  } else if (fs.existsSync(serviceAccountPath)) {
    serviceAccount = require(serviceAccountPath);
  } else {
    console.error("❌ Erreur : serviceAccountKey.json introuvable.");
    process.exit(1);
  }

  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
} catch (error) {
  console.error("❌ Erreur d'initialisation Firebase :", error.message);
  process.exit(1);
}

const db = admin.firestore();

// 2. Upload vers Cloudinary
async function uploadToCloudinary(imagePath, fileName) {
  const fileBuffer = fs.readFileSync(imagePath);
  const ext = path.extname(fileName).toLowerCase();
  
  let mimeType = 'image/jpeg';
  if (ext === '.png') mimeType = 'image/png';
  if (ext === '.webp') mimeType = 'image/webp';
  if (ext === '.gif') mimeType = 'image/gif';

  const blob = new Blob([fileBuffer], { type: mimeType });
  const form = new FormData();
  form.append('file', blob, fileName);
  form.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);

  const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`, {
    method: 'POST',
    body: form
  });

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`Échec upload Cloudinary (${res.status}): ${errorText}`);
  }

  const data = await res.json();
  return {
    imageUrl: data.secure_url || data.url,
    cloudinaryId: data.public_id
  };
}

// 3. Traitement principal
async function runImport() {
  let targetDirName = process.argv[2] || 'imports';
  let targetDir = path.isAbsolute(targetDirName) 
    ? targetDirName 
    : path.join(__dirname, targetDirName);

  if (!fs.existsSync(targetDir)) {
    const parentCheck = path.join(__dirname, '..', targetDirName);
    if (fs.existsSync(parentCheck)) {
      targetDir = parentCheck;
    }
  }

  // Si imports n'a pas de produits.json mais thiaflow_produits_v2 existe à côté
  if (!fs.existsSync(path.join(targetDir, 'produits.json'))) {
    const altDir = path.join(__dirname, '..', 'thiaflow_produits_v2');
    if (fs.existsSync(path.join(altDir, 'produits.json'))) {
      targetDir = altDir;
    }
  }

  const jsonPath = path.join(targetDir, 'produits.json');

  console.log(`\n📦 === THIAflow : Importation en Masse de Produits ===`);
  console.log(`📂 Dossier source : ${targetDir}`);

  if (!fs.existsSync(jsonPath)) {
    console.error(`❌ Fichier introuvable : ${jsonPath}`);
    console.error(`👉 Place ton fichier "produits.json" et tes images dans le dossier "${targetDirName}/"`);
    process.exit(1);
  }

  let rawData;
  try {
    rawData = JSON.parse(fs.readFileSync(jsonPath, 'utf-8'));
  } catch (err) {
    console.error(`❌ Le fichier "produits.json" n'est pas un JSON valide :`, err.message);
    process.exit(1);
  }

  const products = Array.isArray(rawData) ? rawData : [rawData];

  if (products.length === 0) {
    console.log("ℹ️ Aucun produit trouvé dans le fichier JSON.");
    process.exit(0);
  }

  console.log(`📋 ${products.length} produit(s) détecté(s).`);

  // --- Étape A : Validation préalable des images et champs ---
  console.log(`\n🔍 Vérification des données et des images...`);
  const missingFiles = [];
  const validationErrors = [];

  products.forEach((prod, idx) => {
    const num = idx + 1;
    if (!prod.nom) validationErrors.push(`Produit #${num} : Champ "nom" manquant.`);
    if (typeof prod.prix !== 'number' || prod.prix <= 0) validationErrors.push(`Produit #${num} ("${prod.nom || 'Sans nom'}") : Prix invalide.`);

    if (!prod.image) {
      validationErrors.push(`Produit #${num} ("${prod.nom}") : Champ "image" manquant.`);
    } else {
      const imgPath = path.join(targetDir, prod.image);
      if (!fs.existsSync(imgPath)) {
        missingFiles.push(`"${prod.image}" (attendu pour "${prod.nom}")`);
      }
    }
  });

  if (validationErrors.length > 0) {
    console.error(`❌ Erreurs de validation dans le JSON :`);
    validationErrors.forEach(e => console.error(`  - ${e}`));
    process.exit(1);
  }

  if (missingFiles.length > 0) {
    console.error(`❌ Images manquantes dans le dossier "${targetDirName}/" :`);
    missingFiles.forEach(f => console.error(`  - ${f}`));
    console.error(`\n👉 Assure-toi que les fichiers images sont bien dans "${targetDirName}/" et que l'orthographe est identique.`);
    process.exit(1);
  }

  console.log(`✅ Validation réussie ! Toutes les images sont présentes.\n`);

  // --- Étape B : Upload Cloudinary & Écriture Firestore ---
  let importedCount = 0;

  for (let i = 0; i < products.length; i++) {
    const p = products[i];
    const imagePath = path.join(targetDir, p.image);
    const progress = `[${i + 1}/${products.length}]`;

    try {
      console.log(`⏳ ${progress} Upload de l'image "${p.image}" vers Cloudinary...`);
      const cloudResult = await uploadToCloudinary(imagePath, p.image);

      const prix = Number(p.prix);
      const ancienPrix = p.ancienPrix ? Number(p.ancienPrix) : null;
      const badge = p.badge ? String(p.badge).toUpperCase() : null;
      const isPromo = badge === 'PROMO' || (ancienPrix !== null && ancienPrix > prix);

      // Normalisation catégorie
      let categorie = p.categorie || 'Autres';
      const matchedCat = VALID_CATEGORIES.find(c => c.toLowerCase() === (p.categorie || '').toLowerCase());
      if (matchedCat) categorie = matchedCat;

      const firestoreData = {
        nom: String(p.nom).trim(),
        categorie: categorie,
        description: String(p.description || '').trim(),
        prix: prix,
        ancienPrix: ancienPrix,
        promo: isPromo,
        badge: badge,
        imageUrl: cloudResult.imageUrl,
        cloudinaryId: cloudResult.cloudinaryId,
        stock: typeof p.stock === 'number' ? p.stock : 10,
        featured: Boolean(p.featured),
        createdAt: admin.firestore.FieldValue.serverTimestamp()
      };

      const docRef = await db.collection('produits').add(firestoreData);
      console.log(`✅ ${progress} "${p.nom}" importé avec succès ! (ID Firestore: ${docRef.id})`);
      importedCount++;

    } catch (err) {
      console.error(`❌ ${progress} Échec pour "${p.nom}" :`, err.message);
    }
  }

  console.log(`\n🎉 Import terminé : ${importedCount}/${products.length} produit(s) inséré(s) avec succès !`);

  // --- Étape C : Renommer le JSON pour éviter de réimporter en double ---
  try {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const archivePath = path.join(targetDir, `produits.imported-${timestamp}.json`);
    fs.renameSync(jsonPath, archivePath);
    console.log(`📁 Fichier archivé : ${path.basename(archivePath)}`);
  } catch (err) {
    console.warn(`⚠️ Impossible de renommer le fichier JSON :`, err.message);
  }

  // --- Étape D : Régénération SEO (generate-product-pages.js) ---
  console.log(`\n🚀 Mise à jour automatique des pages SEO et du sitemap...`);
  try {
    execSync('node generate-product-pages.js', { stdio: 'inherit', cwd: __dirname });
    console.log(`✨ Site synchronisé à 100% !`);
  } catch (err) {
    console.warn(`⚠️ Erreur lors de l'exécution de generate-product-pages.js :`, err.message);
  }
}

runImport().catch(err => {
  console.error("❌ Erreur inattendue :", err);
  process.exit(1);
});
