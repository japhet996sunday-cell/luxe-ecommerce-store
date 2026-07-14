/* ==========================================================================
   LUXE — cart.js
   Cart page rendering: line items, qty controls, coupon, totals.
   Depends on app.js (LUXE global).
   ========================================================================== */

const LUXECart = (() => {
  const TAX_RATE = 0.075; // 7.5%
  const FREE_SHIPPING_THRESHOLD = 150;
  const SHIPPING_FLAT = 12;

  const COUPONS = {
    'LUXE10': { type: 'percent', value: 10, label: '10% off' },
    'WELCOME15': { type: 'percent', value: 15, label: '15% off' },
    'FREESHIP': { type: 'shipping', value: 0, label: 'Free shipping' },
  };

  let appliedCoupon = null;

  function renderLineItem(item) {
    return `
      <div class="cart-line" data-line-id="${item.lineId}">
        <a href="product.html?id=${item.id}" class="cart-line__media">
          <img src="${item.image}" alt="${item.name}" loading="lazy" width="96" height="120">
        </a>
        <div class="cart-line__info">
          <a href="product.html?id=${item.id}" class="cart-line__name">${item.name}</a>
          <div class="cart-line__variant">
            ${item.color ? `<span class="cart-line__swatch" style="background:${item.color};"></span>` : ''}
            ${item.size && item.size !== 'One Size' ? `Size ${item.size}` : ''}
          </div>
          <button class="cart-line__remove" data-remove-line="${item.lineId}">
            <span class="material-symbols-outlined" style="font-size:16px;">delete</span> Remove
          </button>
        </div>
        <div class="cart-line__qty">
          <button data-qty-minus="${item.lineId}" aria-label="Decrease quantity">
            <span class="material-symbols-outlined" style="font-size:16px;">remove</span>
          </button>
          <span>${item.qty}</span>
          <button data-qty-plus="${item.lineId}" aria-label="Increase quantity">
            <span class="material-symbols-outlined" style="font-size:16px;">add</span>
          </button>
        </div>
        <div class="cart-line__total price price--lg">$${LUXE.formatPrice(item.price * item.qty)}</div>
      </div>
    `;
  }

  function computeTotals(cart) {
    const subtotal = cart.reduce((sum, i) => sum + i.price * i.qty, 0);
    let discount = 0;
    let shipping = subtotal >= FREE_SHIPPING_THRESHOLD || subtotal === 0 ? 0 : SHIPPING_FLAT;

    if (appliedCoupon) {
      const coupon = COUPONS[appliedCoupon];
      if (coupon.type === 'percent') discount = subtotal * (coupon.value / 100);
      if (coupon.type === 'shipping') shipping = 0;
    }

    const taxable = Math.max(0, subtotal - discount);
    const tax = taxable * TAX_RATE;
    const total = taxable + tax + shipping;

    return { subtotal, discount, shipping, tax, total };
  }

  function renderTotals(cart) {
    const t = computeTotals(cart);
    const el = document.querySelector('[data-cart-totals]');
    if (!el) return;
    el.innerHTML = `
      <div class="totals-row"><span>Subtotal</span><span class="price">$${LUXE.formatPrice(t.subtotal)}</span></div>
      ${t.discount > 0 ? `<div class="totals-row totals-row--discount"><span>Discount (${appliedCoupon})</span><span class="price">-$${LUXE.formatPrice(t.discount)}</span></div>` : ''}
      <div class="totals-row"><span>Shipping</span><span class="price">${t.shipping === 0 ? 'Free' : '$' + LUXE.formatPrice(t.shipping)}</span></div>
      <div class="totals-row"><span>Estimated tax</span><span class="price">$${LUXE.formatPrice(t.tax)}</span></div>
      <div class="totals-row totals-row--total"><span>Total</span><span class="price price--lg">$${LUXE.formatPrice(t.total)}</span></div>
      ${t.subtotal > 0 && t.subtotal < FREE_SHIPPING_THRESHOLD
        ? `<p class="totals-note">Add $${LUXE.formatPrice(FREE_SHIPPING_THRESHOLD - t.subtotal)} more for free shipping</p>`
        : ''}
    `;
  }

  function renderCartPage() {
    const cart = LUXE.getCart();
    const listEl = document.querySelector('[data-cart-list]');
    const emptyEl = document.querySelector('[data-cart-empty]');
    const summaryEl = document.querySelector('[data-cart-summary]');

    if (!cart.length) {
      listEl.style.display = 'none';
      summaryEl.style.display = 'none';
      emptyEl.style.display = 'flex';
      return;
    }

    listEl.style.display = 'flex';
    summaryEl.style.display = 'block';
    emptyEl.style.display = 'none';

    listEl.innerHTML = cart.map(renderLineItem).join('');
    renderTotals(cart);
    bindLineEvents();
  }

  function bindLineEvents() {
    document.querySelectorAll('[data-qty-minus]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const cart = LUXE.getCart();
        const item = cart.find(i => i.lineId === btn.dataset.qtyMinus);
        if (item) LUXE.updateCartQty(item.lineId, item.qty - 1);
      });
    });
    document.querySelectorAll('[data-qty-plus]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const cart = LUXE.getCart();
        const item = cart.find(i => i.lineId === btn.dataset.qtyPlus);
        if (item) LUXE.updateCartQty(item.lineId, item.qty + 1);
      });
    });
    document.querySelectorAll('[data-remove-line]').forEach((btn) => {
      btn.addEventListener('click', () => {
        LUXE.removeFromCart(btn.dataset.removeLine);
        LUXE.showToast('Item removed from cart', 'delete');
      });
    });
  }

  function applyCoupon(code) {
    const upper = code.trim().toUpperCase();
    const feedback = document.querySelector('[data-coupon-feedback]');
    if (!upper) return;
    if (COUPONS[upper]) {
      appliedCoupon = upper;
      feedback.textContent = `Applied — ${COUPONS[upper].label}`;
      feedback.className = 'coupon-feedback coupon-feedback--success';
      renderTotals(LUXE.getCart());
      LUXE.showToast(`Coupon applied: ${COUPONS[upper].label}`, 'local_offer');
    } else {
      feedback.textContent = 'Invalid or expired code';
      feedback.className = 'coupon-feedback coupon-feedback--error';
    }
  }

  function init() {
    renderCartPage();
    document.addEventListener('luxe:cart-updated', renderCartPage);

    const couponForm = document.querySelector('[data-coupon-form]');
    couponForm?.addEventListener('submit', (e) => {
      e.preventDefault();
      const input = document.querySelector('[data-coupon-input]');
      applyCoupon(input.value);
    });
  }

  return { init, computeTotals };
})();

document.addEventListener('DOMContentLoaded', () => {
  if (document.querySelector('[data-cart-list]')) LUXECart.init();
});
