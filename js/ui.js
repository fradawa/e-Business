/**
 * THIAFlow E-Commerce - UI Controller, Modals, Toasts & DOM Rendering
 * Target: UASZ Campus, Ziguinchor (Senegal)
 */

const UI = {
  init() {
    this.initHeaderScroll();
    this.initMobileMenu();
    this.initQuickViewModal();
    this.initToastContainer();
    this.initAdminShortcut();
    CartAPI.notifyListeners();
  },

  initHeaderScroll() {
    const header = document.querySelector('.site-header');
    if (!header) return;

    window.addEventListener('scroll', () => {
      if (window.scrollY > 20) {
        header.classList.add('scrolled');
      } else {
        header.classList.remove('scrolled');
      }
    });
  },

  initMobileMenu() {
    const trigger = document.querySelector('.mobile-menu-trigger');
    const overlay = document.querySelector('.mobile-drawer-overlay');
    const closeBtn = document.querySelector('.mobile-drawer-close');

    if (trigger && overlay) {
      const openMenu = () => {
        overlay.classList.add('active');
        document.body.style.overflow = 'hidden';
      };

      const closeMenu = () => {
        overlay.classList.remove('active');
        document.body.style.overflow = '';
      };

      trigger.addEventListener('click', openMenu);
      if (closeBtn) closeBtn.addEventListener('click', closeMenu);

      overlay.addEventListener('click', (e) => {
        if (e.target === overlay) closeMenu();
      });

      document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && overlay.classList.contains('active')) {
          closeMenu();
        }
      });

      overlay.querySelectorAll('.drawer-nav-item').forEach(link => {
        link.addEventListener('click', () => {
          closeMenu();
        });
      });

      // Highlight active navigation item
      const currentPath = window.location.pathname.split('/').pop() || 'index.html';
      const currentSearch = window.location.search;
      overlay.querySelectorAll('.drawer-nav-item').forEach(link => {
        const href = link.getAttribute('href');
        if (!href) return;
        if (href === currentPath + currentSearch || (currentPath === '' && href === 'index.html')) {
          link.classList.add('active');
        } else if (href === currentPath && !currentSearch) {
          link.classList.add('active');
        }
      });
    }
  },

  // Code secret : taper "admin" n'importe où sur la page redirige vers le panel admin
  // (identique au comportement du site en production)
  initAdminShortcut() {
    let adminKeys = [];
    const secretCode = "admin";

    document.addEventListener('keydown', (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

      adminKeys.push(e.key.toLowerCase());
      if (adminKeys.length > secretCode.length) adminKeys.shift();

      if (adminKeys.join('') === secretCode) {
        adminKeys = [];
        window.location.href = "admin.html";
      }
    });
  },

  initQuickViewModal() {
    const modalHtml = `
      <div class="modal-overlay" id="quickViewModal">
        <div class="modal-container">
          <button class="modal-close-btn" id="closeQuickView" aria-label="Fermer">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6L6 18M6 6l12 12"/></svg>
          </button>
          <div class="quick-view-grid" id="quickViewContent">
            <!-- Dynamic Content -->
          </div>
        </div>
      </div>
    `;

    if (!document.getElementById('quickViewModal')) {
      document.body.insertAdjacentHTML('beforeend', modalHtml);
    }

    const modal = document.getElementById('quickViewModal');
    const closeBtn = document.getElementById('closeQuickView');

    if (modal && closeBtn) {
      closeBtn.addEventListener('click', () => this.closeQuickView());
      modal.addEventListener('click', (e) => {
        if (e.target === modal) this.closeQuickView();
      });
    }
  },

  openQuickView(productId) {
    const product = ProductsAPI.getProductById(productId);
    if (!product) return;

    const modal = document.getElementById('quickViewModal');
    const content = document.getElementById('quickViewContent');
    if (!modal || !content) return;

    const whatsappDirectUrl = CartAPI.generateSingleProductWhatsAppUrl(product.id, 1);
    const shareUrl = CartAPI.generateProductShareUrl(product.id);

    content.innerHTML = `
      <div style="position:relative; border-radius:16px; overflow:hidden; background-color:#F4EFEA;">
        <img src="${product.image}" alt="${product.name}" style="width:100%; height:100%; object-fit:cover; display:block;" />
      </div>
      <div style="display:flex; flex-direction:column; justify-content:center;">
        <div class="product-card-category">${product.categoryLabel}</div>
        <h2 style="font-size:1.8rem; font-weight:800; margin: 4px 0 12px; color:var(--text-primary);">${product.name}</h2>

        <div style="display:flex; align-items:center; gap:12px; margin-bottom:16px;">
          <span style="font-size:1.5rem; font-weight:800; color:var(--accent-coral);">${ProductsAPI.formatPrice(product.price)}</span>
          ${product.oldPrice ? `<span style="text-decoration:line-through; color:var(--text-light); font-size:1.1rem;">${ProductsAPI.formatPrice(product.oldPrice)}</span>` : ''}
        </div>

        <p style="color:var(--text-muted); font-size:0.95rem; line-height:1.6; margin-bottom:20px;">
          ${product.description}
        </p>

        <div style="background:var(--accent-sage-light); color:var(--accent-sage); padding:10px 16px; border-radius:10px; font-weight:600; font-size:0.85rem; display:inline-flex; align-items:center; gap:8px; margin-bottom:24px;">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
          Disponible immédiatement au campus UASZ Ziguinchor
        </div>

        <div style="display:flex; gap:12px; flex-wrap:wrap;">
          <button class="btn btn-primary" onclick="UI.handleAddToCart('${product.id}')" style="flex:1;">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/></svg>
            Ajouter au panier
          </button>
          <a href="${whatsappDirectUrl}" target="_blank" class="btn btn-whatsapp">
            <svg width="18" height="18" fill="currentColor" viewBox="0 0 24 24"><path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981z"/></svg>
            WhatsApp Direct
          </a>
          <button class="btn btn-secondary btn-icon" onclick="UI.shareProduct('${product.id}')" title="Partager sur WhatsApp" aria-label="Partager sur WhatsApp">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>
          </button>
        </div>
      </div>
    `;

    modal.classList.add('active');
    document.body.style.overflow = 'hidden';
  },

  closeQuickView() {
    const modal = document.getElementById('quickViewModal');
    if (modal) {
      modal.classList.remove('active');
      document.body.style.overflow = '';
    }
  },

  handleAddToCart(productId) {
    const success = CartAPI.addToCart(productId, 1);
    if (success) {
      const product = ProductsAPI.getProductById(productId);
      this.showToast(`<strong>${product.name}</strong> ajouté au panier !`, 'success');
      this.closeQuickView();
    }
  },

  shareProduct(productId) {
    const url = CartAPI.generateProductShareUrl(productId);
    window.open(url, '_blank');
  },

  initToastContainer() {
    if (!document.getElementById('toastContainer')) {
      document.body.insertAdjacentHTML('beforeend', '<div class="toast-container" id="toastContainer"></div>');
    }
  },

  showToast(message, type = 'info') {
    const container = document.getElementById('toastContainer');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.innerHTML = `
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="color:var(--accent-coral);"><circle cx="12" cy="12" r="10"/><path d="M12 8v4M12 16h.01"/></svg>
      <div>${message}</div>
    `;

    container.appendChild(toast);

    setTimeout(() => {
      toast.style.animation = 'toastOut 0.3s ease forwards';
      setTimeout(() => toast.remove(), 300);
    }, 3200);
  },

  // Certains badges Firestore ("Nouveau", "Promo") n'ont pas de classe CSS dédiée
  // sous ce nom exact — on les fait correspondre aux classes existantes du design.
  getBadgeClass(badgeText) {
    const map = {
      'nouveau': 'badge-new',
      'promo': 'badge-promo',
      'populaire': 'badge-populaire',
      'campus favorite': 'badge-campus'
    };
    return map[(badgeText || '').toLowerCase()] || 'badge-populaire';
  },

  renderProductCard(product) {
    const isDiscounted = !!product.oldPrice;
    const badgeClass = product.badge ? this.getBadgeClass(product.badge) : '';
    const outOfStock = product.stock !== null && product.stock <= 0;

    return `
      <div class="product-card animate-fade-in">
        <div class="product-card-img-wrapper">
          <img src="${product.image}" alt="${product.name}" class="product-card-img" loading="lazy" />
          <div class="product-card-badges">
            ${product.badge ? `<span class="badge-tag ${badgeClass}">${product.badge}</span>` : ''}
            ${outOfStock ? `<span class="badge-tag badge-promo">Rupture</span>` : ''}
          </div>
          <div class="product-card-actions">
            <button class="btn btn-secondary btn-sm" onclick="UI.openQuickView('${product.id}')" style="flex:1;">
              Aperçu rapide
            </button>
            <button class="btn btn-primary btn-sm btn-icon" onclick="UI.handleAddToCart('${product.id}')" aria-label="Ajouter au panier" ${outOfStock ? 'disabled' : ''}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/></svg>
            </button>
          </div>
        </div>
        <div class="product-card-content">
          <div class="product-card-category">${product.categoryLabel}</div>
          <a href="product.html?id=${encodeURIComponent(product.id)}">
            <h3 class="product-card-title">${product.name}</h3>
          </a>
          <div class="product-card-price-row">
            <span class="product-card-price">${ProductsAPI.formatPrice(product.price)}</span>
            ${isDiscounted ? `<span class="product-card-old-price">${ProductsAPI.formatPrice(product.oldPrice)}</span>` : ''}
          </div>
        </div>
      </div>
    `;
  }
};
