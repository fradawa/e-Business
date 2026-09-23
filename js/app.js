/**
 * THIAFlow E-Commerce - Main Application Initializer & Router Logic
 * Target: UASZ Campus, Ziguinchor (Senegal)
 * Les produits arrivent en temps réel depuis Firestore (firebase-init.js) :
 * chaque page s'abonne à "thiaflow:productsUpdated" pour se re-rendre
 * automatiquement dès que le catalogue change (ajout/suppression/stock...).
 */

let currentPageRenderer = null;

document.addEventListener('DOMContentLoaded', () => {
  UI.init();

  const path = window.location.pathname;
  const page = path.split('/').pop() || 'index.html';

  if (page === '' || page === 'index.html') {
    currentPageRenderer = renderHomePage;
    initHomePage();
  } else if (page === 'shop.html') {
    currentPageRenderer = null; // shop page manages its own re-render (filters/listeners)
    initShopPage();
  } else if (page === 'product.html') {
    currentPageRenderer = renderProductDetailPage;
    initProductDetailPage();
  } else if (page === 'cart.html') {
    initCartPage();
  } else if (page === 'checkout.html') {
    initCheckoutPage();
  }
});

// Re-rendu temps réel quand le catalogue Firestore change
window.addEventListener('thiaflow:productsUpdated', () => {
  if (currentPageRenderer) currentPageRenderer();
  if (window.__shopRenderFiltered) window.__shopRenderFiltered();
});

function emptyCatalogNotice(el) {
  if (!el) return;
  if (ProductsAPI.isReady() && ProductsAPI.getAllProducts().length === 0) {
    el.innerHTML = `<div style="grid-column:1/-1; text-align:center; padding:40px 20px; color:var(--text-muted);">Aucun produit disponible pour le moment.</div>`;
    return true;
  }
  if (!ProductsAPI.isReady()) {
    el.innerHTML = `<div style="grid-column:1/-1; text-align:center; padding:40px 20px; color:var(--text-muted);">Chargement des produits...</div>`;
    return true;
  }
  return false;
}

/* --- Homepage Logic --- */
function initHomePage() {
  renderHomePage();
}

function renderHomePage() {
  const featuredGrid = document.getElementById('featuredProductsGrid');
  if (featuredGrid && !emptyCatalogNotice(featuredGrid)) {
    const featured = ProductsAPI.getFeaturedProducts();
    featuredGrid.innerHTML = featured.map(p => UI.renderProductCard(p)).join('');
  }

  const newArrivalsGrid = document.getElementById('newArrivalsGrid');
  if (newArrivalsGrid && ProductsAPI.isReady()) {
    const newItems = ProductsAPI.getAllProducts().filter(p => p.badge === 'Nouveau' || p.badge === 'Populaire').slice(0, 4);
    newArrivalsGrid.innerHTML = newItems.length
      ? newItems.map(p => UI.renderProductCard(p)).join('')
      : ProductsAPI.getAllProducts().slice(0, 4).map(p => UI.renderProductCard(p)).join('');
  }

  const promoGrid = document.getElementById('promoProductsGrid');
  if (promoGrid && ProductsAPI.isReady()) {
    const promos = ProductsAPI.getAllProducts().filter(p => p.oldPrice != null).slice(0, 4);
    promoGrid.innerHTML = promos.map(p => UI.renderProductCard(p)).join('');
  }
}

/* --- Shop Page Logic --- */
function initShopPage() {
  const shopGrid = document.getElementById('shopProductsGrid');
  const countEl = document.getElementById('productsCount');
  const searchInput = document.getElementById('searchInput');
  const categoryPills = document.querySelectorAll('.category-pill');
  const priceFilter = document.getElementById('priceFilter');
  const sortSelect = document.getElementById('sortSelect');

  // URL parameters handler
  const urlParams = new URLSearchParams(window.location.search);
  let activeCategory = urlParams.get('category') || 'all';
  let searchQuery = urlParams.get('q') || '';

  if (searchInput && searchQuery) {
    searchInput.value = searchQuery;
  }

  // Highlight URL category pill if present
  categoryPills.forEach(pill => {
    if (pill.dataset.category === activeCategory) {
      pill.classList.add('active');
    } else {
      pill.classList.remove('active');
    }
  });

  const renderFiltered = () => {
    if (!shopGrid) return;

    if (emptyCatalogNotice(shopGrid)) {
      if (countEl) countEl.textContent = '';
      return;
    }

    const maxPrice = priceFilter ? parseInt(priceFilter.value, 10) : Infinity;
    const sortBy = sortSelect ? sortSelect.value : 'default';
    const query = searchInput ? searchInput.value : searchQuery;

    const filtered = ProductsAPI.filterProducts({
      category: activeCategory,
      maxPrice: maxPrice === 15000 ? Infinity : maxPrice,
      sortBy: sortBy,
      query: query
    });

    if (countEl) {
      countEl.textContent = `${filtered.length} produit${filtered.length > 1 ? 's' : ''} trouvé${filtered.length > 1 ? 's' : ''}`;
    }

    if (filtered.length === 0) {
      shopGrid.innerHTML = `
        <div style="grid-column: 1 / -1; text-align:center; padding: 60px 20px; background:var(--bg-surface); border-radius:var(--radius-lg); border:1px solid var(--border-light);">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="var(--text-light)" stroke-width="1.5" style="margin-bottom:16px;"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
          <h3 style="font-size:1.25rem; font-weight:700; margin-bottom:8px;">Aucun produit trouvé</h3>
          <p style="color:var(--text-muted); font-size:0.95rem; margin-bottom:20px;">Essaye de réinitialiser tes filtres ou de chercher un autre mot-clé.</p>
          <button class="btn btn-secondary btn-sm" onclick="location.href='shop.html'">Voir toute la boutique</button>
        </div>
      `;
    } else {
      shopGrid.innerHTML = filtered.map(p => UI.renderProductCard(p)).join('');
    }
  };

  window.__shopRenderFiltered = renderFiltered;

  // Bind Listeners (une seule fois)
  if (searchInput) {
    let timeout;
    searchInput.addEventListener('input', () => {
      clearTimeout(timeout);
      timeout = setTimeout(renderFiltered, 250);
    });
  }

  categoryPills.forEach(pill => {
    pill.addEventListener('click', () => {
      categoryPills.forEach(p => p.classList.remove('active'));
      pill.classList.add('active');
      activeCategory = pill.dataset.category;
      renderFiltered();
    });
  });

  if (priceFilter) {
    const priceDisplay = document.getElementById('priceValueDisplay');
    priceFilter.addEventListener('input', () => {
      const val = parseInt(priceFilter.value, 10);
      if (priceDisplay) {
        priceDisplay.textContent = val >= 15000 ? 'Tous les prix' : `Jusqu'à ${ProductsAPI.formatPrice(val)}`;
      }
      renderFiltered();
    });
  }

  if (sortSelect) {
    sortSelect.addEventListener('change', renderFiltered);
  }

  // Initial render
  renderFiltered();
}

/* --- Product Detail Page Logic --- */
function initProductDetailPage() {
  renderProductDetailPage();
}

function renderProductDetailPage() {
  const urlParams = new URLSearchParams(window.location.search);
  const productId = urlParams.get('id');
  const container = document.getElementById('productDetailContainer');

  if (!ProductsAPI.isReady()) {
    if (container) container.innerHTML = `<div style="text-align:center; padding:60px 20px; color:var(--text-muted);">Chargement du produit...</div>`;
    return;
  }

  const product = ProductsAPI.getProductById(productId);

  if (!product) {
    window.location.href = 'shop.html';
    return;
  }

  document.title = `${product.name} — THIAflow Ziguinchor`;

  if (container) {
    const whatsappUrl = CartAPI.generateSingleProductWhatsAppUrl(product.id, 1);
    const shareUrl = CartAPI.generateProductShareUrl(product.id);
    const outOfStock = product.stock !== null && product.stock <= 0;

    container.innerHTML = `
      <div class="product-detail-grid">
        <!-- Left: Image Showcase -->
        <div style="border-radius:var(--radius-lg); overflow:hidden; background-color:var(--bg-secondary); box-shadow:var(--shadow-md);">
          <img src="${product.image}" alt="${product.name}" class="product-detail-main-img" id="mainProductImg" />
        </div>

        <!-- Right: Specs & Actions -->
        <div>
          <div style="display:flex; align-items:center; gap:8px; margin-bottom:12px;">
            <span class="product-card-category">${product.categoryLabel}</span>
            ${product.badge ? `<span class="badge-tag ${UI.getBadgeClass(product.badge)}">${product.badge}</span>` : ''}
          </div>

          <h1 class="heading-lg" style="margin-bottom:16px;">${product.name}</h1>

          <div style="display:flex; align-items:center; gap:16px; margin-bottom:24px;">
            <span style="font-size:2rem; font-weight:800; color:var(--accent-coral);">${ProductsAPI.formatPrice(product.price)}</span>
            ${product.oldPrice ? `<span style="font-size:1.25rem; color:var(--text-light); text-decoration:line-through;">${ProductsAPI.formatPrice(product.oldPrice)}</span>` : ''}
          </div>

          <p style="color:var(--text-muted); font-size:1.05rem; line-height:1.7; margin-bottom:28px;">
            ${product.description}
          </p>

          <!-- UASZ Availability Box -->
          <div style="background-color:${outOfStock ? 'var(--accent-coral-light)' : 'var(--accent-sage-light)'}; border:1px solid ${outOfStock ? 'rgba(217,88,59,0.2)' : 'rgba(46,125,94,0.2)'}; border-radius:var(--radius-md); padding:16px 20px; display:flex; align-items:center; gap:14px; margin-bottom:32px;">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="${outOfStock ? 'var(--accent-coral)' : 'var(--accent-sage)'}" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
            <div>
              <strong style="color:${outOfStock ? 'var(--accent-coral)' : 'var(--accent-sage)'}; display:block; font-size:0.95rem;">${outOfStock ? 'Rupture de stock' : 'En Stock - Disponible au Campus UASZ'}</strong>
              <span style="color:var(--text-muted); font-size:0.85rem;">Remise rapide en main propre à Ziguinchor / Campus.</span>
            </div>
          </div>

          <!-- Quantity Selector -->
          <div style="display:flex; align-items:center; gap:16px; margin-bottom:32px;">
            <span style="font-weight:600; color:var(--text-primary);">Quantité :</span>
            <div style="display:flex; align-items:center; border:1px solid var(--border-medium); border-radius:var(--radius-pill); background:var(--bg-surface); padding:4px;">
              <button class="btn btn-icon" style="width:36px; height:36px;" onclick="adjustProductQty(-1)">-</button>
              <input type="number" id="detailQty" value="1" min="1" max="10" style="width:40px; text-align:center; font-weight:700;" readonly />
              <button class="btn btn-icon" style="width:36px; height:36px;" onclick="adjustProductQty(1)">+</button>
            </div>
          </div>

          <!-- CTAs -->
          <div style="display:flex; flex-direction:column; gap:14px;">
            <button class="btn btn-primary" onclick="addCurrentProductToCart('${product.id}')" style="padding:16px;" ${outOfStock ? 'disabled' : ''}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/></svg>
              Ajouter au Panier
            </button>
            <a href="${whatsappUrl}" target="_blank" class="btn btn-whatsapp" style="padding:16px;" id="detailWhatsappBtn">
              <svg width="20" height="20" fill="currentColor" viewBox="0 0 24 24"><path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981z"/></svg>
              Commander sur WhatsApp
            </a>
            <button class="btn btn-secondary" onclick="UI.shareProduct('${product.id}')" style="padding:16px;">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>
              Partager sur WhatsApp
            </button>
          </div>
        </div>
      </div>
    `;
  }

  // Render "Tu pourrais aussi aimer"
  const relatedGrid = document.getElementById('relatedProductsGrid');
  if (relatedGrid) {
    const related = ProductsAPI.getProductsByCategory(product.category)
      .filter(p => p.id !== product.id)
      .slice(0, 4);
    relatedGrid.innerHTML = related.length
      ? related.map(p => UI.renderProductCard(p)).join('')
      : `<div style="grid-column:1/-1; text-align:center; padding:20px; color:var(--text-muted);">Pas d'autre produit dans cette catégorie pour le moment.</div>`;
  }
}

// Helpers for product detail page
window.adjustProductQty = function(delta) {
  const input = document.getElementById('detailQty');
  if (!input) return;
  let val = parseInt(input.value, 10) + delta;
  val = Math.max(1, Math.min(10, val));
  input.value = val;
};

window.addCurrentProductToCart = function(productId) {
  const input = document.getElementById('detailQty');
  const qty = input ? parseInt(input.value, 10) : 1;
  const product = ProductsAPI.getProductById(productId);
  if (!product) return;
  if (CartAPI.addToCart(productId, qty)) {
    UI.showToast(`<strong>${qty}x ${product.name}</strong> ajouté(s) au panier !`, 'success');
  }
};

/* --- Cart Page Logic --- */
function initCartPage() {
  renderCartView();
  window.addEventListener('cartUpdated', renderCartView);
}

function renderCartView() {
  const container = document.getElementById('cartItemsContainer');
  const totalEl = document.getElementById('cartTotalDisplay');
  const emptyState = document.getElementById('cartEmptyState');
  const cartContent = document.getElementById('cartContentLayout');
  const checkoutBtn = document.getElementById('cartWhatsappCheckoutBtn');

  if (!container) return;

  const cart = CartAPI.getCart();

  if (cart.length === 0) {
    if (emptyState) emptyState.style.display = 'block';
    if (cartContent) cartContent.style.display = 'none';
    return;
  }

  if (emptyState) emptyState.style.display = 'none';
  if (cartContent) cartContent.style.display = '';

  container.innerHTML = cart.map(item => `
    <div class="cart-item">
      <img src="${item.image}" alt="${item.name}" class="cart-item-image" loading="lazy" />
      <div class="cart-item-info">
        <h4 class="cart-item-name">${item.name}</h4>
        <div class="cart-item-category">${item.category || ''}</div>
        <div class="cart-item-unit-price">${ProductsAPI.formatPrice(item.price)}</div>
      </div>
      <div class="cart-item-qty">
        <button class="cart-item-qty-btn" onclick="CartAPI.updateQuantity('${item.id}', ${item.quantity - 1})" aria-label="Diminuer la quantité">-</button>
        <span class="cart-item-qty-val">${item.quantity}</span>
        <button class="cart-item-qty-btn" onclick="CartAPI.updateQuantity('${item.id}', ${item.quantity + 1})" aria-label="Augmenter la quantité">+</button>
      </div>
      <div class="cart-item-total">
        ${ProductsAPI.formatPrice(item.price * item.quantity)}
      </div>
      <button class="cart-item-remove-btn" onclick="CartAPI.removeFromCart('${item.id}')" aria-label="Supprimer ${item.name} du panier" title="Supprimer">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
      </button>
    </div>
  `).join('');

  if (totalEl) {
    totalEl.textContent = ProductsAPI.formatPrice(CartAPI.getCartTotal());
  }

  if (checkoutBtn) {
    const url = CartAPI.generateWhatsAppOrderUrl();
    checkoutBtn.href = url || '#';
  }
}

/* --- Checkout Page Logic --- */
function initCheckoutPage() {
  const form = document.getElementById('checkoutForm');
  const summaryContainer = document.getElementById('checkoutSummaryContainer');
  const totalDisplay = document.getElementById('checkoutTotalDisplay');

  if (summaryContainer) {
    const cart = CartAPI.getCart();
    summaryContainer.innerHTML = cart.map(item => `
      <div style="display:flex; justify-content:space-between; align-items:baseline; gap:12px; margin-bottom:12px; font-size:0.95rem;">
        <span style="min-width:0; word-break:break-word;">${item.name} x ${item.quantity}</span>
        <strong style="color:var(--text-primary); white-space:nowrap; flex-shrink:0;">${ProductsAPI.formatPrice(item.price * item.quantity)}</strong>
      </div>
    `).join('');
  }

  if (totalDisplay) {
    totalDisplay.textContent = ProductsAPI.formatPrice(CartAPI.getCartTotal());
  }

  if (form) {
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const fullName = document.getElementById('custName')?.value;
      const phone = document.getElementById('custPhone')?.value;
      const location = document.getElementById('custLocation')?.value;
      const notes = document.getElementById('custNotes')?.value;

      const url = CartAPI.generateWhatsAppOrderUrl({ fullName, phone, location, notes });
      if (url) {
        window.open(url, '_blank');
      } else {
        alert("Votre panier est vide !");
      }
    });
  }
}
