const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

// Initialize Firebase Admin SDK
try {
  let serviceAccount = null;

  if (process.env.FIREBASE_SERVICE_ACCOUNT) {
    try {
      serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
    } catch (e) {
      try {
        const decoded = Buffer.from(process.env.FIREBASE_SERVICE_ACCOUNT, 'base64').toString('utf8');
        serviceAccount = JSON.parse(decoded);
      } catch (e2) {
        console.error("❌ Erreur: FIREBASE_SERVICE_ACCOUNT n'est pas un JSON valide.");
        process.exit(1);
      }
    }
  } else {
    const serviceAccountPath = path.join(__dirname, 'serviceAccountKey.json');
    if (!fs.existsSync(serviceAccountPath)) {
      console.error("❌ Erreur: Le fichier serviceAccountKey.json est introuvable et FIREBASE_SERVICE_ACCOUNT n'est pas défini.");
      console.error("Veuillez le télécharger depuis Firebase Console > Paramètres du projet > Comptes de service ou définir la variable FIREBASE_SERVICE_ACCOUNT.");
      process.exit(1);
    }
    serviceAccount = require('./serviceAccountKey.json');
  }

  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
} catch (error) {
  console.error("❌ Erreur: Impossible d'initialiser Firebase Admin SDK.", error.message);
  process.exit(1);
}

const db = admin.firestore();

function escapeAttr(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

async function generatePages() {
  console.log("⏳ Récupération des produits depuis Firestore...");
  try {
    const productsSnapshot = await db.collection('produits').get();
    
    if (productsSnapshot.empty) {
      console.log('Aucun produit trouvé.');
      return;
    }

    let count = 0;
    const errors = [];
    const productIds = [];

    productsSnapshot.forEach(doc => {
      const id = doc.id;
      const p = doc.data();
      productIds.push(id);
      
      try {
        const name = p.nom || 'Produit sans nom';
        const description = p.description || (p.prix ? `${p.prix} F CFA` : 'Découvrez ce produit sur THIAflow');
        let imageUrl = p.imageUrl || 'https://thiaflow.com/preview.jpg';
        
        // Optimisation Cloudinary pour WhatsApp (Taille < 300KB requise)
        if (imageUrl.includes('cloudinary.com') && imageUrl.includes('/upload/')) {
          imageUrl = imageUrl.replace('/upload/', '/upload/w_600,h_600,c_fill,q_auto/');
        }
        
        const url = `https://thiaflow.com/produit/${id}/`;
        const spaUrl = `/product.html?id=${id}`;

        const safeName = escapeAttr(name);
        const safeDesc = escapeAttr(description);
        const safeImageUrl = escapeAttr(imageUrl);
        const safeUrl = escapeAttr(url);
        const safeSpaUrl = escapeAttr(spaUrl);

        const htmlContent = `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${safeName} - THIAflow</title>
  
  <!-- Favicon / App Icons (Google Search, Android, Apple, PWA) -->
  <link rel="icon" href="/favicon.ico" sizes="any">
  <link rel="icon" type="image/svg+xml" href="/assets/logo/favicon.svg">
  <link rel="icon" type="image/png" sizes="48x48" href="/assets/logo/icon-48.png">
  <link rel="icon" type="image/png" sizes="192x192" href="/assets/logo/icon-192.png">
  <link rel="apple-touch-icon" sizes="180x180" href="/assets/logo/apple-touch-icon.png">
  
  <!-- Google Analytics (gtag.js) -->
  <script async src="https://www.googletagmanager.com/gtag/js?id=G-5CX2E8GG0P"></script>
  <script>
    window.dataLayer = window.dataLayer || [];
    function gtag(){dataLayer.push(arguments);}
    gtag('js', new Date());

    gtag('config', 'G-5CX2E8GG0P');
  </script>
  
  <!-- Open Graph / WhatsApp Preview -->
  <meta property="og:title" content="${safeName}">
  <meta property="og:description" content="${safeDesc}">
  <meta property="og:image" itemprop="image" content="${safeImageUrl}">
  <meta property="og:image:secure_url" itemprop="image" content="${safeImageUrl}">
  <meta property="og:image:type" content="image/jpeg">
  <meta property="og:image:width" content="600">
  <meta property="og:image:height" content="600">
  <meta property="og:url" content="${safeUrl}">
  <meta property="og:site_name" content="THIAflow">
  
  <!-- Twitter Card -->
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${safeName}">
  <meta name="twitter:description" content="${safeDesc}">
  <meta name="twitter:image" content="${safeImageUrl}">
  
  <!-- Redirection vers la SPA -->
  <meta http-equiv="refresh" content="0;url=${safeSpaUrl}">
  
  <script>
    // Redirection immédiate pour les utilisateurs avec JS activé
    window.location.replace('${safeSpaUrl}');
  </script>
</head>
<body>
  <p>Redirection en cours vers le produit ${safeName}... Si vous n'êtes pas redirigé, <a href="${safeSpaUrl}">cliquez ici</a>.</p>
</body>
</html>`;

        const dirPath = path.join(__dirname, 'produit', id);
        
        // Créer le dossier s'il n'existe pas
        if (!fs.existsSync(dirPath)) {
          fs.mkdirSync(dirPath, { recursive: true });
        }
        
        // Écrire le fichier index.html
        fs.writeFileSync(path.join(dirPath, 'index.html'), htmlContent);
        count++;
      } catch (err) {
        errors.push(`Erreur pour le produit ${id}: ${err.message}`);
      }
    });

    console.log(`\n=== GÉNÉRATION DES PAGES PRODUITS TERMINÉE ===`);
    console.log(`✅ ${count} pages générées avec succès.`);
    if (errors.length > 0) {
      console.log(`❌ ${errors.length} erreurs rencontrées :`);
      errors.forEach(e => console.log(`   - ${e}`));
    }

    // Mise à jour automatique de sitemap.xml
    const today = new Date().toISOString().split('T')[0];
    const sitemapContent = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">

  <!-- Page d'accueil -->
  <url>
    <loc>https://thiaflow.com/</loc>
    <lastmod>${today}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>1.0</priority>
  </url>

  <!-- Boutique -->
  <url>
    <loc>https://thiaflow.com/shop.html</loc>
    <lastmod>${today}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>

  <!-- Jeu de la Roue -->
  <url>
    <loc>https://thiaflow.com/roue.html</loc>
    <lastmod>${today}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.7</priority>
  </url>

  <!-- Pages produit -->
${productIds.map(pid => `  <url>
    <loc>https://thiaflow.com/produit/${pid}/</loc>
    <lastmod>${today}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.6</priority>
  </url>`).join('\n')}

</urlset>
`;
    fs.writeFileSync(path.join(__dirname, 'sitemap.xml'), sitemapContent);
    console.log(`🗺️ sitemap.xml mis à jour avec ${productIds.length} produits.`);
    
  } catch (error) {
    console.error("❌ Erreur lors de la récupération des produits :", error);
  }
}

generatePages();
