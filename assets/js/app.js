/* ==========================================================================
   LUXE — app.js
   Shared across every page: theme, nav, storage, toasts, search, reveal.
   ========================================================================== */

const LUXE = (() => {
  const STORAGE_KEYS = {
    cart: 'luxe_cart',
    wishlist: 'luxe_wishlist',
    theme: 'luxe_theme',
  };

  let productsCache = null;

  /* ---------- Storage helpers ---------- */
  function readStorage(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch (e) {
      console.warn('LUXE storage read failed', key, e);
      return fallback;
    }
  }

  function writeStorage(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (e) {
      console.warn('LUXE storage write failed', key, e);
    }
  }

  /* ---------- Products ---------- */
  async function getProducts() {
  if (productsCache) {
    alert("Using cached products");
    return productsCache;
  }

  const url = resolvePath('products.json');
  alert("Fetching: " + url);

  const res = await fetch(url);
  alert("Fetch status: " + res.status);

  if (!res.ok) {
    alert("Failed to load products.json");
    throw new Error('Failed to load products.json');
  }

  productsCache = await res.json();
  alert("Loaded " + productsCache.length + " products");

  return productsCache;
  }

  function resolvePath(relative) {
    // Works whether the page lives at site root or is opened directly.
    const depth = document.body.dataset.depth || '0';
    return '../'.repeat(Number(depth)) + relative;
  }

  /* ---------- Cart ---------- */
  function getCart() {
    return readStorage(STORAGE_KEYS.cart, []);
  }

  function saveCart(cart) {
    writeStorage(STORAGE_KEYS.cart, cart);
    updateBadges();
    document.dispatchEvent(new CustomEvent('luxe:cart-updated', { detail: cart }));
  }

  function addToCart(product, opts = {}) {
    const { size = null, color = null, qty = 1 } = opts;
    const cart = getCart();
    const lineId = `${product.id}__${size || 'na'}__${color || 'na'}`;
    const existing = cart.find((item) => item.lineId === lineId);
    if (existing) {
      existing.qty += qty;
    } else {
      cart.push({
        lineId,
        id: product.id,
        name: product.name,
        price: product.price,
        image: product.images[0],
        size,
        color,
        qty,
      });
    }
    saveCart(cart);
    showToast(`${product.name} added to cart`, 'shopping_bag');
  }

  function removeFromCart(lineId) {
    const cart = getCart().filter((item) => item.lineId !== lineId);
    saveCart(cart);
  }

  function updateCartQty(lineId, qty) {
    const cart = getCart();
    const item = cart.find((i) => i.lineId === lineId);
    if (!item) return;
    if (qty <= 0) {
      removeFromCart(lineId);
      return;
    }
    item.qty = qty;
    saveCart(cart);
  }

  function cartCount() {
    return getCart().reduce((sum, item) => sum + item.qty, 0);
  }

  function cartSubtotal() {
    return getCart().reduce((sum, item) => sum + item.price * item.qty, 0);
  }

  /* ---------- Wishlist ---------- */
  function getWishlist() {
    return readStorage(STORAGE_KEYS.wishlist, []);
  }

  function saveWishlist(list) {
    writeStorage(STORAGE_KEYS.wishlist, list);
    updateBadges();
    document.dispatchEvent(new CustomEvent('luxe:wishlist-updated', { detail: list }));
  }

  function isWishlisted(productId) {
    return getWishlist().some((p) => p.id === productId);
  }

  function toggleWishlist(product) {
    const list = getWishlist();
    const idx = list.findIndex((p) => p.id === product.id);
    if (idx > -1) {
      list.splice(idx, 1);
      saveWishlist(list);
      showToast(`${product.name} removed from wishlist`, 'heart_minus');
      return false;
    }
    list.push({
      id: product.id,
      name: product.name,
      price: product.price,
      image: product.images[0],
      category: product.category,
    });
    saveWishlist(list);
    showToast(`${product.name} added to wishlist`, 'favorite');
    return true;
  }

  function updateBadges() {
    document.querySelectorAll('[data-cart-count]').forEach((el) => {
      const n = cartCount();
      el.textContent = n;
      el.style.display = n > 0 ? 'flex' : 'none';
    });
    document.querySelectorAll('[data-wishlist-count]').forEach((el) => {
      const n = getWishlist().length;
      el.textContent = n;
      el.style.display = n > 0 ? 'flex' : 'none';
    });
  }

  /* ---------- Toasts ---------- */
  function showToast(message, icon = 'check_circle') {
    let container = document.querySelector('.toast-container');
    if (!container) {
      container = document.createElement('div');
      container.className = 'toast-container';
      container.setAttribute('aria-live', 'polite');
      document.body.appendChild(container);
    }
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.innerHTML = `<span class="material-symbols-outlined">${icon}</span><span>${message}</span>`;
    container.appendChild(toast);
    setTimeout(() => {
      toast.classList.add('is-leaving');
      setTimeout(() => toast.remove(), 200);
    }, 2600);
  }

  /* ---------- Theme ---------- */
  function initTheme() {
    const saved = localStorage.getItem(STORAGE_KEYS.theme);
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const theme = saved || (prefersDark ? 'dark' : 'light');
    document.documentElement.setAttribute('data-theme', theme);
    updateThemeIcons(theme);
  }

  function toggleTheme() {
    const current = document.documentElement.getAttribute('data-theme');
    const next = current === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next);
    localStorage.setItem(STORAGE_KEYS.theme, next);
    updateThemeIcons(next);
  }

  function updateThemeIcons(theme) {
    document.querySelectorAll('[data-theme-icon]').forEach((el) => {
      el.textContent = theme === 'dark' ? 'light_mode' : 'dark_mode';
    });
  }

  /* ---------- Mobile menu ---------- */
  function initMobileMenu() {
    const toggle = document.querySelector('[data-mobile-toggle]');
    const menu = document.querySelector('[data-mobile-menu]');
    const close = document.querySelector('[data-mobile-close]');
    if (!toggle || !menu) return;
    toggle.addEventListener('click', () => {
      menu.classList.add('is-open');
      document.body.style.overflow = 'hidden';
    });
    const closeMenu = () => {
      menu.classList.remove('is-open');
      document.body.style.overflow = '';
    };
    close?.addEventListener('click', closeMenu);
    menu.querySelectorAll('a').forEach((a) => a.addEventListener('click', closeMenu));
  }

  /* ---------- Search overlay ---------- */
  function initSearch() {
    const openBtns = document.querySelectorAll('[data-search-open]');
    const overlay = document.querySelector('[data-search-overlay]');
    const closeBtn = document.querySelector('[data-search-close]');
    const input = document.querySelector('[data-search-input]');
    const results = document.querySelector('[data-search-results]');
    if (!overlay || !input) return;

    const open = async () => {
      overlay.classList.add('is-open');
      input.value = '';
      results.innerHTML = '';
      setTimeout(() => input.focus(), 100);
      await getProducts();
    };
    const close = () => overlay.classList.remove('is-open');

    openBtns.forEach((btn) => btn.addEventListener('click', open));
    closeBtn?.addEventListener('click', close);
    overlay.addEventListener('click', (e) => { if (e.target === overlay) close(); });
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') close();
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') { e.preventDefault(); open(); }
    });

    let debounceTimer;
    input.addEventListener('input', () => {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(async () => {
        const q = input.value.trim().toLowerCase();
        if (!q) { results.innerHTML = ''; return; }
        const products = await getProducts();
        const matches = products.filter((p) =>
          p.name.toLowerCase().includes(q) || p.category.toLowerCase().includes(q)
        ).slice(0, 6);
        results.innerHTML = matches.length
          ? matches.map((p) => `
            <a class="search-result-item" href="${resolvePath('product.html')}?id=${p.id}">
              <img src="${p.image0 || p.images[0]}" alt="" loading="lazy" width="52" height="52">
              <span class="search-result-item__meta">
                <span class="search-result-item__name">${p.name}</span>
                <span class="search-result-item__cat">${p.category}</span>
              </span>
              <span class="price price--sm">$${p.price}</span>
            </a>
          `).join('')
          : `<p style="padding: var(--sp-3); color: var(--color-stone); font-size: var(--fs-sm);">No products found for "${q}"</p>`;
      }, 220);
    });
  }

  /* ---------- Scroll reveal ---------- */
  function initReveal() {
    const targets = document.querySelectorAll('.reveal, .product-card');
    if (!targets.length) return;
    const io = new IntersectionObserver((entries) => {
      entries.forEach((entry, i) => {
        if (entry.isIntersecting) {
          setTimeout(() => entry.target.classList.add('is-visible'), (i % 8) * 60);
          io.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });
    targets.forEach((t) => io.observe(t));
  }

  /* ---------- Back to top ---------- */
  function initBackToTop() {
    const btn = document.querySelector('[data-back-to-top]');
    if (!btn) return;
    window.addEventListener('scroll', () => {
      btn.classList.toggle('is-visible', window.scrollY > 600);
    }, { passive: true });
    btn.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));
  }

  /* ---------- Navbar shadow on scroll ---------- */
  function initNavbarScroll() {
    const nav = document.querySelector('.navbar');
    if (!nav) return;
    window.addEventListener('scroll', () => {
      nav.style.borderBottomColor = window.scrollY > 8
        ? 'var(--color-border-strong)'
        : 'var(--color-border)';
    }, { passive: true });
  }

  /* ---------- Star rating markup ---------- */
  function starIcon(filled) {
    return `<span class="material-symbols-outlined" style="font-variation-settings:'FILL' ${filled ? 1 : 0}">star</span>`;
  }

  function formatPrice(n) {
    return n.toFixed(n % 1 === 0 ? 0 : 2);
  }

  /* ---------- Init ---------- */
  function init() {
    initTheme();
    initMobileMenu();
    initSearch();
    initBackToTop();
    initNavbarScroll();
    updateBadges();
    initReveal();

    document.querySelector('[data-theme-toggle]')?.addEventListener('click', toggleTheme);

    // Re-run reveal after dynamic content injects (pages call this themselves too)
    document.addEventListener('luxe:content-rendered', initReveal);
  }

  document.addEventListener('DOMContentLoaded', init);

  return {
    getProducts,
    getCart, saveCart, addToCart, removeFromCart, updateCartQty, cartCount, cartSubtotal,
    getWishlist, isWishlisted, toggleWishlist,
    showToast, resolvePath, initReveal, starIcon, formatPrice, updateBadges,
  };
})();
 
