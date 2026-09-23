/**
 * THIAFlow E-Commerce - Cart State Management & WhatsApp Message Builder
 * Target: UASZ Campus, Ziguinchor (Senegal)
 */

// Numéro WhatsApp officiel THIAflow (identique au site en production)
const THIAFLOW_CONFIG = {
  whatsappNumber: "221764287562",
  brandName: "THIAflow",
  campusLocation: "Université Assane Seck de Ziguinchor (UASZ)",
  siteUrl: "https://thiaflow-a8c10.web.app"
};

const CartAPI = {
  STORAGE_KEY: 'thiaflow_cart_v1',

  getCart() {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch (e) {
      console.error("Erreur lors de la lecture du panier local:", e);
      return [];
    }
  },

  saveCart(cart) {
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(cart));
      this.notifyListeners();
    } catch (e) {
      console.error("Erreur lors de la sauvegarde du panier:", e);
    }
  },

  addToCart(productId, quantity = 1, variant = null) {
    const cart = this.getCart();
    const product = ProductsAPI.getProductById(productId);

    if (!product) return false;

    const existingIndex = cart.findIndex(item => String(item.id) === String(product.id) && item.variant === variant);

    if (existingIndex > -1) {
      cart[existingIndex].quantity += quantity;
    } else {
      cart.push({
        id: product.id,
        name: product.name,
        price: product.price,
        image: product.image,
        category: product.categoryLabel,
        quantity: quantity,
        variant: variant || 'Standard'
      });
    }

    this.saveCart(cart);
    return true;
  },

  removeFromCart(productId, variant = null) {
    let cart = this.getCart();
    cart = cart.filter(item => !(String(item.id) === String(productId) && (variant ? item.variant === variant : true)));
    this.saveCart(cart);
  },

  updateQuantity(productId, quantity, variant = null) {
    const cart = this.getCart();
    const item = cart.find(i => String(i.id) === String(productId) && (variant ? i.variant === variant : true));

    if (item) {
      const qty = parseInt(quantity, 10);
      if (qty <= 0) {
        this.removeFromCart(productId, variant);
        return;
      }
      item.quantity = qty;
      this.saveCart(cart);
    }
  },

  clearCart() {
    localStorage.removeItem(this.STORAGE_KEY);
    this.notifyListeners();
  },

  getCartCount() {
    const cart = this.getCart();
    return cart.reduce((sum, item) => sum + item.quantity, 0);
  },

  getCartTotal() {
    const cart = this.getCart();
    return cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  },

  // Génère le message de commande WhatsApp pour tout le panier
  generateWhatsAppOrderUrl(customerDetails = {}) {
    const cart = this.getCart();
    if (cart.length === 0) return null;

    let message = `Bonjour THIAflow 👋\n`;
    message += `Je souhaite passer une commande depuis le site :\n\n`;

    cart.forEach(item => {
      const itemSubtotal = item.price * item.quantity;
      const variantStr = item.variant && item.variant !== 'Standard' ? ` (${item.variant})` : '';
      message += `- *${item.name}*${variantStr} x${item.quantity} — ${ProductsAPI.formatPrice(itemSubtotal)}\n`;
    });

    const total = this.getCartTotal();
    message += `\n*TOTAL : ${ProductsAPI.formatPrice(total)}*\n\n`;

    message += `Informations de livraison / récupération :\n`;
    if (customerDetails.fullName) {
      message += `Client : ${customerDetails.fullName}\n`;
    }
    if (customerDetails.phone) {
      message += `WhatsApp : ${customerDetails.phone}\n`;
    }
    const location = customerDetails.location || "Campus UASZ Ziguinchor";
    message += `Lieu : ${location}\n`;

    if (customerDetails.notes) {
      message += `Note : ${customerDetails.notes}\n`;
    }

    message += `\nMerci de me confirmer la disponibilité et le créneau de remise ! ✨`;

    const encodedMessage = encodeURIComponent(message);
    return `https://wa.me/${THIAFLOW_CONFIG.whatsappNumber}?text=${encodedMessage}`;
  },

  // Commande directe d'un seul produit (bouton "Commander sur WhatsApp" sur la fiche produit)
  generateSingleProductWhatsAppUrl(productId, quantity = 1, variant = null) {
    const product = ProductsAPI.getProductById(productId);
    if (!product) return '#';

    const subtotal = product.price * quantity;
    const variantStr = variant && variant !== 'Standard' ? ` (${variant})` : '';
    let message = `Bonjour THIAflow 👋\n`;
    message += `Je souhaite commander cet article en direct :\n\n`;
    message += `- *${product.name}*${variantStr} x${quantity} — ${ProductsAPI.formatPrice(subtotal)}\n\n`;
    message += `*Total : ${ProductsAPI.formatPrice(subtotal)}*\n`;
    message += `Lieu souhaité : Campus UASZ Ziguinchor\n\n`;
    message += `Est-ce disponible pour remise immédiate ?`;

    return `https://wa.me/${THIAFLOW_CONFIG.whatsappNumber}?text=${encodeURIComponent(message)}`;
  },

  // Partage d'un produit (lien SEO /produit/{id}/) via WhatsApp — identique au site actuel
  generateProductShareUrl(productId) {
    const product = ProductsAPI.getProductById(productId);
    if (!product) return '#';
    const link = `${THIAFLOW_CONFIG.siteUrl}/produit/${encodeURIComponent(product.id)}/`;
    const msg = encodeURIComponent(
      `Regarde ce produit sur THIAflow 👇\n\n*${product.name}*\n${ProductsAPI.formatPrice(product.price)}\n\n${link}`
    );
    return `https://wa.me/?text=${msg}`;
  },

  // Diffusion des mises à jour du panier pour l'UI (badge, événement custom)
  notifyListeners() {
    const count = this.getCartCount();
    document.querySelectorAll('.cart-badge-count').forEach(el => {
      el.textContent = count;
      el.style.display = count > 0 ? 'flex' : 'none';
    });

    window.dispatchEvent(new CustomEvent('cartUpdated', { detail: { count, total: this.getCartTotal() } }));
  }
};
