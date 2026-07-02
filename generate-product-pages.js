const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

// Initialize Firebase Admin SDK
try {
  const serviceAccountPath = path.join(__dirname, 'serviceAccountKey.json');
  if (!fs.existsSync(serviceAccountPath)) {
    console.error("❌ Erreur: Le fichier serviceAccountKey.json est introuvable.");
    console.error("Veuillez le télécharger depuis Firebase Console > Paramètres du projet > Comptes de service et le placer à la racine du projet.");
    process.exit(1);
  }
  const serviceAccount = require('./serviceAccountKey.json');
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
} catch (error) {
  console.error("❌ Erreur: Impossible de charger serviceAccountKey.json.", error.message);
  process.exit(1);
}

const db = admin.firestore();

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

    productsSnapshot.forEach(doc => {
      const id = doc.id;
      const p = doc.data();
      
      try {
        const name = p.nom || 'Produit sans nom';
        const description = p.description || (p.prix ? `${p.prix} F CFA` : 'Découvrez ce produit sur THIAflow');
        const imageUrl = p.imageUrl || 'https://thiaflow-a8c10.web.app/preview.jpg';
        const url = `https://thiaflow-a8c10.web.app/produit/${id}/`;

        const htmlContent = `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${name} - THIAflow</title>
  
  <!-- Open Graph / WhatsApp Preview -->
  <meta property="og:title" content="${name}">
  <meta property="og:description" content="${description}">
  <meta property="og:image" content="${imageUrl}">
  <meta property="og:url" content="${url}">
  <meta property="og:type" content="product">
  <meta property="og:site_name" content="THIAflow">
  
  <!-- Twitter Card -->
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${name}">
  <meta name="twitter:description" content="${description}">
  <meta name="twitter:image" content="${imageUrl}">
  
  <!-- Redirection vers la SPA -->
  <meta http-equiv="refresh" content="0;url=/?produit=${id}">
  
  <script>
    // Redirection immédiate pour les utilisateurs avec JS activé
    window.location.replace('/?produit=${id}');
  </script>
</head>
<body>
  <p>Redirection en cours vers le produit ${name}... Si vous n'êtes pas redirigé, <a href="/?produit=${id}">cliquez ici</a>.</p>
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
    
  } catch (error) {
    console.error("❌ Erreur lors de la récupération des produits :", error);
  }
}

generatePages();
