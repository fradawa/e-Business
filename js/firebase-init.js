/**
 * THIAFlow — Connexion Firebase (Firestore temps réel)
 * Ce module remplace le catalogue statique par les vraies données
 * de la boutique, stockées dans la collection Firestore "produits".
 * Il expose les données sur window.__THIAFLOW_PRODUCTS et déclenche
 * l'événement "thiaflow:productsUpdated" à chaque mise à jour (comme
 * sur le site actuel, en temps réel).
 */
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-app.js";
import { getFirestore, collection, onSnapshot } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";
import { ENV } from '../env.js';

const firebaseConfig = {
  apiKey: ENV.FIREBASE_API_KEY,
  authDomain: ENV.FIREBASE_AUTH_DOMAIN,
  projectId: ENV.FIREBASE_PROJECT_ID,
  storageBucket: ENV.FIREBASE_STORAGE_BUCKET,
  messagingSenderId: ENV.FIREBASE_MESSAGING_SENDER_ID,
  appId: ENV.FIREBASE_APP_ID,
  measurementId: ENV.FIREBASE_MEASUREMENT_ID
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const produitsCol = collection(db, 'produits');

// Correspondance entre les catégories admin (texte libre en français)
// et les slugs utilisés par le nouveau design pour le filtrage.
function slugifyCategory(cat) {
  const c = (cat || '').toLowerCase();
  if (c.includes('parfum')) return 'parfums';
  if (c.includes('hygi') || c.includes('soin') || c.includes('beaut')) return 'beaute';
  if (c.includes('accessoire')) return 'accessoires';
  if (c.includes('vêtement') || c.includes('vetement')) return 'vetements';
  return 'autres';
}

function mapBadge(rawBadge) {
  if (!rawBadge) return null;
  if (rawBadge === 'NEW') return 'Nouveau';
  if (rawBadge === 'PROMO') return 'Promo';
  return rawBadge;
}

window.__THIAFLOW_PRODUCTS = [];
window.__THIAFLOW_PRODUCTS_READY = false;

onSnapshot(produitsCol, (snapshot) => {
  const products = [];
  snapshot.forEach(docSnap => {
    const data = docSnap.data();
    products.push({
      id: docSnap.id,
      name: data.nom || 'Produit',
      category: slugifyCategory(data.categorie),
      categoryLabel: data.categorie || '',
      price: data.prix || 0,
      oldPrice: data.ancienPrix || null,
      image: data.imageUrl || 'assets/images/hero.jpg',
      badge: mapBadge(data.badge),
      stock: typeof data.stock === 'number' ? data.stock : null,
      description: data.description || '',
      details: [],
      featured: data.badge === 'NEW' || data.badge === 'PROMO',
      createdAt: data.createdAt || null
    });
  });

  // Tri par date de création (plus récent d'abord), comme sur le site actuel
  products.sort((a, b) => {
    const timeA = a.createdAt ? a.createdAt.toMillis() : 0;
    const timeB = b.createdAt ? b.createdAt.toMillis() : 0;
    return timeB - timeA;
  });

  window.__THIAFLOW_PRODUCTS = products;
  window.__THIAFLOW_PRODUCTS_READY = true;
  window.dispatchEvent(new CustomEvent('thiaflow:productsUpdated', { detail: { products } }));
}, (error) => {
  console.error('Erreur de chargement des produits THIAflow:', error);
});
