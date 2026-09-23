/**
 * THIAFlow E-Commerce - Product Data Access Layer
 * Les produits proviennent en temps réel de Firestore (voir firebase-init.js).
 * Ce fichier garde la même API que la version précédente (mock data) pour
 * que le reste du site (app.js, ui.js, cart.js) n'ait rien à changer côté logique.
 */

const ProductsAPI = {
  getAllProducts() {
    return window.__THIAFLOW_PRODUCTS || [];
  },

  isReady() {
    return !!window.__THIAFLOW_PRODUCTS_READY;
  },

  getProductById(id) {
    const strId = String(id);
    return this.getAllProducts().find(p => String(p.id) === strId) || null;
  },

  getFeaturedProducts() {
    const featured = this.getAllProducts().filter(p => p.featured);
    return featured.length ? featured : this.getAllProducts().slice(0, 4);
  },

  getProductsByCategory(category) {
    if (!category || category === 'all') return this.getAllProducts();
    return this.getAllProducts().filter(p => p.category === category);
  },

  searchProducts(query) {
    if (!query || query.trim() === '') return this.getAllProducts();
    const cleanQuery = query.toLowerCase().trim();
    return this.getAllProducts().filter(p =>
      p.name.toLowerCase().includes(cleanQuery) ||
      p.description.toLowerCase().includes(cleanQuery) ||
      p.categoryLabel.toLowerCase().includes(cleanQuery) ||
      (p.badge && p.badge.toLowerCase().includes(cleanQuery))
    );
  },

  filterProducts({ category = 'all', minPrice = 0, maxPrice = Infinity, sortBy = 'default', query = '' }) {
    let result = this.getAllProducts();

    if (query && query.trim() !== '') {
      const q = query.toLowerCase().trim();
      result = result.filter(p =>
        p.name.toLowerCase().includes(q) ||
        p.description.toLowerCase().includes(q) ||
        p.categoryLabel.toLowerCase().includes(q)
      );
    }

    if (category && category !== 'all') {
      result = result.filter(p => p.category === category);
    }

    result = result.filter(p => p.price >= minPrice && p.price <= maxPrice);

    result = result.slice();
    if (sortBy === 'price-asc') {
      result.sort((a, b) => a.price - b.price);
    } else if (sortBy === 'price-desc') {
      result.sort((a, b) => b.price - a.price);
    } else if (sortBy === 'newest') {
      result.sort((a, b) => (b.badge === 'Nouveau' ? 1 : 0) - (a.badge === 'Nouveau' ? 1 : 0));
    }

    return result;
  },

  formatPrice(price) {
    return new Intl.NumberFormat('fr-FR').format(price) + ' FCFA';
  }
};
