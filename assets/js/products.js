/* ==========================================================================
   LUXE — products.js
   Shared product card rendering + card-level interactions (cart/wishlist).
   Depends on app.js (LUXE global) being loaded first.
   ========================================================================== */

const LUXEProducts = (() => {

  function starsMarkup(rating) {
    const full = Math.round(rating);
    let html = '';
    for (let i = 0; i < 5; i++) {
      html += LUXE.starIcon(i < full);
    }
    return html;
  }

  function renderCard(p) {
    const discounted = p.discount > 0;
    const wishlisted = LUXE.isWishlisted(p.id);
    return `
      <article class="product-card" data-product-id="${p.id}">
        <div class="product-card__media">
          <a href="product.html?id=${p.id}" aria-label="View ${p.name}">
            <img src="${p.images[0]}" alt="${p.name}" loading="lazy" width="480" height="640">
          </a>
          ${discounted ? `<span class="product-card__badge product-card__badge--brass">-${p.discount}%</span>` : ''}
          ${!discounted && p.isNew ? `<span class="product-card__badge">New</span>` : ''}
          <div class="product-card__actions">
            <button class="icon-btn ${wishlisted ? 'is-active' : ''}" data-wishlist-toggle aria-label="Toggle wishlist" aria-pressed="${wishlisted}">
              <span class="material-symbols-outlined">favorite</span>
            </button>
            <button class="icon-btn" data-quick-view aria-label="Quick view">
              <span class="material-symbols-outlined">visibility</span>
            </button>
          </div>
          <div class="product-card__quick-add">
            <button class="btn btn--primary btn--block btn--sm" data-quick-add>
              <span class="material-symbols-outlined" style="font-size:16px;">add_shopping_cart</span>
              Add to cart
            </button>
          </div>
        </div>
        <div class="product-card__cat">${p.category}</div>
        <a href="product.html?id=${p.id}">
          <h3 class="product-card__name">${p.name}</h3>
        </a>
        <div class="product-card__rating" aria-label="Rated ${p.rating} out of 5, ${p.reviews} reviews">
          ${starsMarkup(p.rating)}
          <span>${p.rating} (${p.reviews})</span>
        </div>
        <div class="product-card__prices">
          <span class="price price--lg">$${LUXE.formatPrice(p.price)}</span>
          ${discounted ? `<span class="price price--sm price--strike">$${LUXE.formatPrice(p.originalPrice)}</span>` : ''}
        </div>
      </article>
    `;
  }

  async function findProduct(id) {
    const products = await LUXE.getProducts();
    return products.find((p) => p.id === id);
  }

  function bindCardEvents(scope = document) {
    scope.querySelectorAll('[data-wishlist-toggle]').forEach((btn) => {
      if (btn.dataset.bound) return;
      btn.dataset.bound = '1';
      btn.addEventListener('click', async (e) => {
        e.preventDefault();
        const card = btn.closest('[data-product-id]');
        const product = await findProduct(card.dataset.productId);
        if (!product) return;
        const nowActive = LUXE.toggleWishlist(product);
        btn.classList.toggle('is-active', nowActive);
        btn.setAttribute('aria-pressed', String(nowActive));
      });
    });

    scope.querySelectorAll('[data-quick-add]').forEach((btn) => {
      if (btn.dataset.bound) return;
      btn.dataset.bound = '1';
      btn.addEventListener('click', async (e) => {
        e.preventDefault();
        const card = btn.closest('[data-product-id]');
        const product = await findProduct(card.dataset.productId);
        if (!product) return;
        const size = product.sizes[0];
        const color = product.colors[0];
        LUXE.addToCart(product, { size, color, qty: 1 });
      });
    });

    scope.querySelectorAll('[data-quick-view]').forEach((btn) => {
      if (btn.dataset.bound) return;
      btn.dataset.bound = '1';
      btn.addEventListener('click', async (e) => {
        e.preventDefault();
        const card = btn.closest('[data-product-id]');
        const product = await findProduct(card.dataset.productId);
        if (!product) return;
        openQuickView(product);
      });
    });
  }

  /* ---------- Quick View Modal ---------- */
  function ensureModal() {
    let modal = document.querySelector('[data-quick-view-modal]');
    if (modal) return modal;
    modal = document.createElement('div');
    modal.setAttribute('data-quick-view-modal', '');
    modal.innerHTML = `
      <div class="qv-overlay" data-qv-overlay>
        <div class="qv-panel" role="dialog" aria-modal="true" aria-labelledby="qv-title">
          <button class="icon-btn qv-close" data-qv-close aria-label="Close quick view">
            <span class="material-symbols-outlined">close</span>
          </button>
          <div class="qv-body" data-qv-body></div>
        </div>
      </div>
    `;
    document.body.appendChild(modal);

    const styleTag = document.createElement('style');
    styleTag.textContent = `
      .qv-overlay {
        position: fixed; inset: 0; z-index: 950;
        background: var(--color-overlay);
        backdrop-filter: blur(4px);
        display: flex; align-items: center; justify-content: center;
        padding: var(--sp-5);
        opacity: 0; pointer-events: none;
        transition: opacity var(--dur-med) var(--ease-out);
      }
      .qv-overlay.is-open { opacity: 1; pointer-events: auto; }
      .qv-panel {
        background: var(--color-canvas-raised);
        border-radius: var(--radius-lg);
        max-width: 880px; width: 100%; max-height: 88vh;
        overflow-y: auto;
        position: relative;
        transform: translateY(16px) scale(0.98);
        transition: transform var(--dur-med) var(--ease-out);
        box-shadow: var(--shadow-lg);
      }
      .qv-overlay.is-open .qv-panel { transform: translateY(0) scale(1); }
      .qv-close { position: absolute; top: var(--sp-4); right: var(--sp-4); z-index: 2; background: var(--color-canvas-raised); }
      .qv-body { display: grid; grid-template-columns: 1fr 1fr; gap: var(--sp-6); padding: var(--sp-6); }
      .qv-body img { width: 100%; aspect-ratio: 3/4; object-fit: cover; border-radius: var(--radius-md); }
      .qv-swatch { width: 26px; height: 26px; border-radius: 50%; border: 2px solid var(--color-border-strong); cursor: pointer; }
      .qv-swatch.is-selected { border-color: var(--color-brass-dark); }
      .qv-size { padding: var(--sp-2) var(--sp-3); border: 1px solid var(--color-border-strong); border-radius: var(--radius-sm); font-size: var(--fs-xs); cursor: pointer; background: transparent; color: var(--color-ink); }
      .qv-size.is-selected { border-color: var(--color-ink); background: var(--color-ink); color: var(--color-canvas); }
      @media (max-width: 720px) { .qv-body { grid-template-columns: 1fr; } }
    `;
    document.head.appendChild(styleTag);

    modal.querySelector('[data-qv-close]').addEventListener('click', closeQuickView);
    modal.querySelector('[data-qv-overlay]').addEventListener('click', (e) => {
      if (e.target.dataset.qvOverlay !== undefined) closeQuickView();
    });
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') closeQuickView();
    });
    return modal;
  }

  function closeQuickView() {
    document.querySelector('[data-qv-overlay]')?.classList.remove('is-open');
    document.body.style.overflow = '';
  }

  function openQuickView(product) {
    const modal = ensureModal();
    const overlay = modal.querySelector('[data-qv-overlay]');
    const body = modal.querySelector('[data-qv-body]');
    let selectedSize = product.sizes[0];
    let selectedColor = product.colors[0];

    body.innerHTML = `
      <img src="${product.images[0]}" alt="${product.name}" loading="lazy">
      <div>
        <div class="product-card__cat">${product.category}</div>
        <h3 id="qv-title" style="font-family:var(--font-display); font-size:var(--fs-xl); margin-bottom:var(--sp-2);">${product.name}</h3>
        <div class="product-card__rating" style="margin-bottom:var(--sp-3);">
          ${starsMarkup(product.rating)}<span>${product.rating} (${product.reviews})</span>
        </div>
        <div class="product-card__prices" style="margin-bottom:var(--sp-4);">
          <span class="price price--lg">$${LUXE.formatPrice(product.price)}</span>
          ${product.discount > 0 ? `<span class="price price--sm price--strike">$${LUXE.formatPrice(product.originalPrice)}</span>` : ''}
        </div>
        <p style="font-size:var(--fs-sm); margin-bottom:var(--sp-5);">${product.description}</p>

        <div style="margin-bottom:var(--sp-4);">
          <div class="footer__heading" style="margin-bottom:var(--sp-2);">Color</div>
          <div style="display:flex; gap:var(--sp-2);" data-qv-colors>
            ${product.colors.map((c, i) => `<button class="qv-swatch ${i === 0 ? 'is-selected' : ''}" style="background:${c};" data-color="${c}" aria-label="Color option"></button>`).join('')}
          </div>
        </div>

        <div style="margin-bottom:var(--sp-5);">
          <div class="footer__heading" style="margin-bottom:var(--sp-2);">Size</div>
          <div style="display:flex; gap:var(--sp-2); flex-wrap:wrap;" data-qv-sizes>
            ${product.sizes.map((s, i) => `<button class="qv-size ${i === 0 ? 'is-selected' : ''}" data-size="${s}">${s}</button>`).join('')}
          </div>
        </div>

        <div style="display:flex; gap:var(--sp-3);">
          <button class="btn btn--primary" data-qv-add-cart style="flex:1;">Add to cart</button>
          <a href="product.html?id=${product.id}" class="btn btn--secondary">Full details</a>
        </div>
      </div>
    `;

    body.querySelectorAll('[data-color]').forEach((btn) => {
      btn.addEventListener('click', () => {
        body.querySelectorAll('[data-color]').forEach((b) => b.classList.remove('is-selected'));
        btn.classList.add('is-selected');
        selectedColor = btn.dataset.color;
      });
    });
    body.querySelectorAll('[data-size]').forEach((btn) => {
      btn.addEventListener('click', () => {
        body.querySelectorAll('[data-size]').forEach((b) => b.classList.remove('is-selected'));
        btn.classList.add('is-selected');
        selectedSize = btn.dataset.size;
      });
    });
    body.querySelector('[data-qv-add-cart]').addEventListener('click', () => {
      LUXE.addToCart(product, { size: selectedSize, color: selectedColor, qty: 1 });
      closeQuickView();
    });

    overlay.classList.add('is-open');
    document.body.style.overflow = 'hidden';
  }

  return { renderCard, bindCardEvents, findProduct, starsMarkup, openQuickView };
})();
