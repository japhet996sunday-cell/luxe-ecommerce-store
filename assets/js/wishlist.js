/* ==========================================================================
   LUXE — wishlist.js
   Wishlist page rendering: saved items, remove, move to cart.
   Depends on app.js (LUXE global) and products.js.
   ========================================================================== */

const LUXEWishlist = (() => {

  function renderItem(item) {
    return `
      <div class="wish-card" data-wish-id="${item.id}">
        <a href="product.html?id=${item.id}" class="wish-card__media">
          <img src="${item.image}" alt="${item.name}" loading="lazy" width="220" height="280">
        </a>
        <button class="icon-btn wish-card__remove" data-wish-remove="${item.id}" aria-label="Remove from wishlist">
          <span class="material-symbols-outlined">close</span>
        </button>
        <div class="wish-card__cat">${item.category}</div>
        <a href="product.html?id=${item.id}"><h3 class="wish-card__name">${item.name}</h3></a>
        <div class="price price--lg" style="margin-bottom:var(--sp-4);">$${LUXE.formatPrice(item.price)}</div>
        <button class="btn btn--secondary btn--block" data-wish-move="${item.id}">
          <span class="material-symbols-outlined" style="font-size:16px;">shopping_bag</span>
          Move to cart
        </button>
      </div>
    `;
  }

  async function renderWishlistPage() {
    const list = LUXE.getWishlist();
    const gridEl = document.querySelector('[data-wishlist-grid]');
    const emptyEl = document.querySelector('[data-wishlist-empty]');
    const countEl = document.querySelector('[data-wishlist-page-count]');

    if (countEl) countEl.textContent = `${list.length} saved item${list.length !== 1 ? 's' : ''}`;

    if (!list.length) {
      gridEl.style.display = 'none';
      emptyEl.style.display = 'flex';
      return;
    }

    gridEl.style.display = 'grid';
    emptyEl.style.display = 'none';
    gridEl.innerHTML = list.map(renderItem).join('');

    const allProducts = await LUXE.getProducts();

    gridEl.querySelectorAll('[data-wish-remove]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const current = LUXE.getWishlist().filter(p => p.id !== btn.dataset.wishRemove);
        localStorage.setItem('luxe_wishlist', JSON.stringify(current));
        LUXE.updateBadges();
        LUXE.showToast('Removed from wishlist', 'heart_minus');
        renderWishlistPage();
      });
    });

    gridEl.querySelectorAll('[data-wish-move]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const product = allProducts.find(p => p.id === btn.dataset.wishMove);
        if (!product) return;
        LUXE.addToCart(product, { size: product.sizes[0], color: product.colors[0], qty: 1 });
        const current = LUXE.getWishlist().filter(p => p.id !== product.id);
        localStorage.setItem('luxe_wishlist', JSON.stringify(current));
        LUXE.updateBadges();
        renderWishlistPage();
      });
    });

    document.dispatchEvent(new CustomEvent('luxe:content-rendered'));
  }

  function init() {
    renderWishlistPage();
    document.addEventListener('luxe:wishlist-updated', renderWishlistPage);
  }

  return { init };
})();

document.addEventListener('DOMContentLoaded', () => {
  if (document.querySelector('[data-wishlist-grid]')) LUXEWishlist.init();
});
