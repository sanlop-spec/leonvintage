/* ============================================
   LEÓN VINTAGE — app.js (SISTEMA COMPLETO PRO)
   ============================================ */

const SUPABASE_URL = "https://gfdtualoijutbvozhasv.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdmZHR1YWxvaWp1dGJ2b3poYXN2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODM1NTU4OTgsImV4cCI6MjA5OTEzMTg5OH0.RMIEjlLpas_nIy32z9O2DoXrD5FVRdgj0BdSnb8QT4w";

const TABLE_NAME = "productos";
const WHATSAPP_NUMBER = "522411028038";

const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

let cart = loadCart();
let products = [];
let currentCategory = "all";
let currentSize = "all";
let currentSort = "recent";
let searchQuery = "";
let selectedOutfitItems = [];

/* ---------- 1. MANEJO DEL CARRITO ---------- */
function loadCart() {
  try {
    const raw = localStorage.getItem("tienda_leon_cart");
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

function saveCart() {
  localStorage.setItem("tienda_leon_cart", JSON.stringify(cart));
  renderCart();
  updateCartBadges();
}

function updateCartBadges() {
  const totalItems = cart.reduce((sum, item) => sum + item.cantidad, 0);
  const badge = document.getElementById("cartCountBadge");
  if (badge) badge.textContent = totalItems;
}

/* ---------- 2. CARGA DE PRODUCTOS DESDE SUPABASE ---------- */
async function loadProducts() {
  const { data, error } = await supabaseClient
    .from(TABLE_NAME)
    .select("id, titulo, imagen_url, tallas, detalles, precio, precio_oferta, categoria")
    .order("id", { ascending: false });

  if (!error && data) {
    products = data;
    applyFiltersAndRender();
    setupOutfitBuilder();
  }
}

/* ---------- 3. FILTRADO, TALLAS Y ORDENAMIENTO ---------- */
function applyFiltersAndRender() {
  const grid = document.getElementById("productGrid");
  if (!grid) return;

  let filtered = [...products];

  // Categoría
  if (currentCategory === "ultima-oportunidad") {
    filtered = filtered.filter(p => p.precio_oferta || (p.categoria || "").toLowerCase() === "ultima-oportunidad");
  } else if (currentCategory !== "all") {
    filtered = filtered.filter(p => (p.categoria || "").toLowerCase() === currentCategory.toLowerCase());
  }

  // Talla
  if (currentSize !== "all") {
    filtered = filtered.filter(p => {
      const tallasStr = Array.isArray(p.tallas) ? p.tallas.join(",") : (p.tallas || "");
      return tallasStr.toUpperCase().includes(currentSize.toUpperCase());
    });
  }

  // Búsqueda
  if (searchQuery.trim() !== "") {
    const q = searchQuery.toLowerCase();
    filtered = filtered.filter(p => (p.titulo || "").toLowerCase().includes(q));
  }

  // Ordenamiento
  if (currentSort === "price-asc") {
    filtered.sort((a, b) => (a.precio_oferta || a.precio || 0) - (b.precio_oferta || b.precio || 0));
  } else if (currentSort === "price-desc") {
    filtered.sort((a, b) => (b.precio_oferta || b.precio || 0) - (a.precio_oferta || a.precio || 0));
  } else {
    filtered.sort((a, b) => b.id - a.id);
  }

  if (filtered.length === 0) {
    grid.innerHTML = `<p class="col-span-full text-center text-muted font-mono text-xs py-10">No se encontraron piezas con los filtros seleccionados.</p>`;
    return;
  }

  grid.innerHTML = filtered.map(p => createProductCardHTML(p)).join("");
  attachCardEvents(grid);
}

function createProductCardHTML(p) {
  const tallasStr = Array.isArray(p.tallas) ? p.tallas.join(", ") : (p.tallas || "Única");
  
  let precioHTML = p.precio_oferta 
    ? `<div class="flex items-center gap-2 mt-1"><span class="text-gold font-mono font-bold">$${p.precio_oferta}</span><span class="text-muted font-mono text-xs line-through">$${p.precio}</span></div>`
    : `<p class="text-gold font-mono font-bold text-sm mt-1">$${p.precio || 0}</p>`;

  return `
    <article class="product-card rounded-xl overflow-hidden relative flex flex-col justify-between">
      <div class="product-card__img-wrap relative cursor-pointer quick-view-trigger" data-id="${p.id}">
        ${p.precio_oferta ? '<span class="absolute top-2 left-2 bg-copper text-bone text-[9px] font-mono font-bold px-2 py-0.5 rounded shadow z-10">Oferta Vault</span>' : ''}
        <span class="absolute top-2 right-2 bg-black/70 backdrop-blur-md text-gold text-[9px] font-mono font-bold px-2 py-0.5 rounded z-10 border border-gold/30">Condición 9.5/10</span>
        <img src="${p.imagen_url}" alt="${p.titulo}" loading="lazy">
        <div class="absolute inset-0 bg-black/40 opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center">
          <span class="bg-onyx/90 border border-gold text-gold font-mono text-[10px] uppercase font-bold px-3 py-1.5 rounded-full">🔍 Vista Rápida</span>
        </div>
      </div>

      <div class="p-4 flex flex-col justify-between flex-1 gap-2">
        <div>
          <div class="flex justify-between items-start gap-2">
            <h3 class="font-display font-bold text-sm text-bone cursor-pointer quick-view-trigger" data-id="${p.id}">${p.titulo || "Producto"}</h3>
            <span class="text-[10px] font-mono text-muted border border-white/10 px-1.5 py-0.5 rounded">Talla: ${tallasStr}</span>
          </div>
          <p class="text-[11px] text-muted line-clamp-2 mt-1">${p.detalles || ""}</p>
        </div>

        <div>
          ${precioHTML}
          <div class="flex items-center justify-between gap-2 mt-3">
            <span class="text-[9px] text-copper font-mono font-bold">⚡ Pieza Única</span>
            <button class="add-to-cart-btn py-2 px-4 rounded-full border border-gold/60 text-gold hover:bg-gold hover:text-onyx font-mono text-[10px] uppercase tracking-wider font-bold transition-all" data-id="${p.id}">
              Agregar
            </button>
          </div>
        </div>
      </div>
    </article>
  `;
}

function attachCardEvents(container) {
  // Evento agregar rápido
  container.querySelectorAll(".add-to-cart-btn").forEach(btn => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      addToCart(btn.dataset.id);
      btn.textContent = "¡Agregado!";
      setTimeout(() => { btn.textContent = "Agregar"; }, 900);
    });
  });

  // Evento Vista Rápida Modal
  container.querySelectorAll(".quick-view-trigger").forEach(el => {
    el.addEventListener("click", () => {
      openQuickView(el.dataset.id);
    });
  });
}

function addToCart(productId, customPrice = null) {
  const product = products.find(p => String(p.id) === String(productId));
  if (!product) return;

  const finalPrice = customPrice !== null ? customPrice : (product.precio_oferta || product.precio || 0);

  cart.push({
    id: product.id,
    titulo: product.titulo,
    imagen_url: product.imagen_url,
    precio: finalPrice,
    cantidad: 1
  });
  saveCart();
  openCart();
}

/* ---------- 4. VISTA RÁPIDA (QUICK VIEW MODAL) ---------- */
function openQuickView(productId) {
  const p = products.find(item => String(item.id) === String(productId));
  if (!p) return;

  const content = document.getElementById("quickViewContent");
  const tallasStr = Array.isArray(p.tallas) ? p.tallas.join(", ") : (p.tallas || "Única");

  content.innerHTML = `
    <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
      <img src="${p.imagen_url}" class="w-full aspect-[3/4] object-cover rounded-xl border border-white/10">
      <div class="flex flex-col justify-between space-y-4">
        <div>
          <span class="text-[10px] font-mono uppercase text-copper font-bold tracking-widest block mb-1">Pieza de Colección Archivo</span>
          <h2 class="font-display font-bold text-xl text-bone mb-2">${p.titulo}</h2>
          <span class="text-gold font-mono font-bold text-xl block mb-4">$${p.precio_oferta || p.precio || 0}</span>
          
          <div class="space-y-2 border-t border-b border-white/10 py-3 text-xs text-muted font-mono">
            <p><strong class="text-bone">Detalles:</strong> ${p.detalles || "Sin descripción adicional."}</p>
            <p><strong class="text-bone">Talla de etiqueta:</strong> ${tallasStr}</p>
            <p><strong class="text-bone">Estado / Condición:</strong> 9.5/10 (Excelente estado vintage)</p>
          </div>

          <!-- Guía de Medidas Exactas -->
          <div class="bg-white/5 border border-white/10 rounded-lg p-3 mt-4 text-[11px] font-mono">
            <span class="text-gold font-bold block mb-1">📐 Medidas Aproximadas en cm:</span>
            <div class="grid grid-cols-2 gap-2 text-muted">
              <span>• Axila a Axila: ~54 cm</span>
              <span>• Largo Total: ~72 cm</span>
            </div>
          </div>
        </div>

        <button onclick="addToCart(${p.id}); closeQuickView();" class="w-full py-3 rounded-full bg-gold text-onyx font-mono text-xs uppercase font-bold tracking-wider hover:bg-goldBright transition-all shadow-lg">
          Agregar al Carrito
        </button>
      </div>
    </div>
  `;

  document.getElementById("quickViewModal").classList.remove("hidden");
}

function closeQuickView() {
  document.getElementById("quickViewModal").classList.add("hidden");
}

document.getElementById("closeQuickViewBtn")?.addEventListener("click", closeQuickView);

/* ---------- 5. RENDER DEL CARRITO Y REGALO ---------- */
function renderCart() {
  const container = document.getElementById("cartItemsContainer");
  const giftRewardText = document.getElementById("giftRewardText");
  const totalItems = cart.reduce((sum, item) => sum + item.cantidad, 0);

  if (giftRewardText) {
    if (totalItems >= 2) {
      giftRewardText.textContent = "🎉 ¡Felicidades! Se incluirá un obsequio exclusivo en tu paquete.";
      giftRewardText.className = "font-mono text-xs text-emerald-400 font-bold";
    } else {
      giftRewardText.textContent = `🎁 Agrega ${2 - totalItems} prenda más para recibir un accesorio de regalo.`;
      giftRewardText.className = "font-mono text-xs text-copper font-semibold";
    }
  }

  if (!container) return;

  if (cart.length === 0) {
    container.innerHTML = `<p class="text-center text-muted text-xs font-mono py-8">Tu carrito está vacío.</p>`;
  } else {
    container.innerHTML = cart.map((item, index) => `
      <div class="flex items-center gap-3 p-2 border-b border-white/10 bg-white/5 rounded-lg">
        <img src="${item.imagen_url}" class="w-10 h-12 object-cover rounded">
        <div class="flex-1">
          <p class="font-display text-xs text-bone truncate">${item.titulo}</p>
          <span class="font-mono text-xs text-gold font-bold">$${item.precio}</span>
        </div>
        <button onclick="removeItem(${index})" class="text-xs text-muted hover:text-copper font-mono p-1">✕</button>
      </div>
    `).join("");
  }

  const totalBadge = document.getElementById("cartTotalItems");
  if (totalBadge) totalBadge.textContent = totalItems;
}

function removeItem(index) {
  cart.splice(index, 1);
  saveCart();
}

/* ---------- 6. CREADOR DE OUTFITS (15% OFF) ---------- */
function setupOutfitBuilder() {
  const grid = document.getElementById("outfitSelectionGrid");
  if (!grid) return;

  grid.innerHTML = products.map(p => `
    <div class="outfit-card border border-white/10 rounded-lg p-2 cursor-pointer transition-all hover:border-gold bg-white/5" data-id="${p.id}">
      <img src="${p.imagen_url}" class="w-full h-20 object-cover rounded mb-1">
      <p class="font-display text-[10px] text-bone truncate">${p.titulo}</p>
      <span class="font-mono text-[10px] text-gold font-bold">$${p.precio_oferta || p.precio || 0}</span>
    </div>
  `).join("");

  grid.querySelectorAll(".outfit-card").forEach(card => {
    card.addEventListener("click", () => {
      const id = card.dataset.id;
      if (selectedOutfitItems.includes(id)) {
        selectedOutfitItems = selectedOutfitItems.filter(item => item !== id);
        card.classList.remove("border-gold", "bg-gold/20");
      } else {
        selectedOutfitItems.push(id);
        card.classList.add("border-gold", "bg-gold/20");
      }
      updateOutfitSummary();
    });
  });
}

function updateOutfitSummary() {
  let subtotal = 0;
  selectedOutfitItems.forEach(id => {
    const p = products.find(prod => String(prod.id) === String(id));
    if (p) subtotal += Number(p.precio_oferta || p.precio || 0);
  });

  const hasDiscount = selectedOutfitItems.length >= 2;
  const finalTotal = hasDiscount ? subtotal * 0.85 : subtotal;

  document.getElementById("outfitTotal").textContent = `$${finalTotal.toFixed(2)}`;
  document.getElementById("outfitDiscountNotice").classList.toggle("hidden", !hasDiscount);
  
  const addBtn = document.getElementById("addOutfitToCartBtn");
  if (addBtn) addBtn.disabled = selectedOutfitItems.length === 0;
}

document.getElementById("addOutfitToCartBtn")?.addEventListener("click", () => {
  const hasDiscount = selectedOutfitItems.length >= 2;
  selectedOutfitItems.forEach(id => {
    const p = products.find(prod => String(prod.id) === String(id));
    if (p) {
      const basePrice = p.precio_oferta || p.precio || 0;
      const price = hasDiscount ? basePrice * 0.85 : basePrice;
      addToCart(p.id, price.toFixed(2));
    }
  });
  selectedOutfitItems = [];
  document.getElementById("outfitModal").classList.add("hidden");
});

/* ---------- 7. ANUNCIOS ROTATIVOS TOP ---------- */
const tickerMessages = [
  "✨ 15% OFF automático en tu paquete al crear un Outfit de 2+ prendas",
  "🎁 Lleva 2 o más prendas y recibe un accesorio de regalo en tu compra",
  "🔥 Sección 'Última Oportunidad' con precios especiales de liquidación",
  "📐 Revisa medidas exactas en cm activando la Vista Rápida de cada pieza"
];

let currentTickerIndex = 0;
setInterval(() => {
  const tickerEl = document.getElementById("topTickerText");
  if (tickerEl) {
    tickerEl.style.opacity = "0";
    setTimeout(() => {
      currentTickerIndex = (currentTickerIndex + 1) % tickerMessages.length;
      tickerEl.textContent = tickerMessages[currentTickerIndex];
      tickerEl.style.opacity = "1";
    }, 300);
  }
}, 4500);

/* ---------- 8. LISTENERS Y CONTROLES ---------- */
document.getElementById("openOutfitBuilderBtn")?.addEventListener("click", () => {
  document.getElementById("outfitModal").classList.remove("hidden");
});

document.getElementById("closeOutfitBtn")?.addEventListener("click", () => {
  document.getElementById("outfitModal").classList.add("hidden");
});

document.querySelectorAll("#categoryFilters .cat-btn").forEach(btn => {
  btn.addEventListener("click", () => {
    document.querySelectorAll("#categoryFilters .cat-btn").forEach(b => {
      b.classList.remove("active", "bg-gold", "text-onyx");
      b.classList.add("text-muted");
    });
    btn.classList.add("active", "bg-gold", "text-onyx");
    btn.classList.remove("text-muted");

    currentCategory = btn.dataset.cat;
    applyFiltersAndRender();
  });
});

document.querySelectorAll("#sizeFilters .size-btn").forEach(btn => {
  btn.addEventListener("click", () => {
    document.querySelectorAll("#sizeFilters .size-btn").forEach(b => {
      b.classList.remove("active", "bg-gold", "text-onyx", "font-bold");
      b.classList.add("text-muted");
    });
    btn.classList.add("active", "bg-gold", "text-onyx", "font-bold");
    btn.classList.remove("text-muted");

    currentSize = btn.dataset.size;
    applyFiltersAndRender();
  });
});

document.getElementById("sortSelect")?.addEventListener("change", (e) => {
  currentSort = e.target.value;
  applyFiltersAndRender();
});

document.getElementById("searchInput")?.addEventListener("input", (e) => {
  searchQuery = e.target.value;
  applyFiltersAndRender();
});

function openCart() { document.getElementById("cartDrawer")?.classList.add("cart-open"); }
function closeCart() { document.getElementById("cartDrawer")?.classList.remove("cart-open"); }

document.getElementById("openCartBtn")?.addEventListener("click", openCart);
document.getElementById("closeCartBtn")?.addEventListener("click", closeCart);

/* ---------- 9. CHECKOUT A WHATSAPP ---------- */
document.getElementById("checkoutBtn")?.addEventListener("click", () => {
  if (cart.length === 0) return;

  const totalItems = cart.reduce((sum, item) => sum + item.cantidad, 0);
  const giftNote = totalItems >= 2 ? "\n\n🎁 *¡Califica para obsequio de accesorio en su paquete!*" : "";
  const lines = cart.map(item => `• 1x ${item.titulo} — *$${item.precio}*`);
  
  const message = encodeURIComponent(`¡Hola, León Vintage! Me interesa adquirir este pedido:\n\n${lines.join("\n")}${giftNote}\n\nQuedo a la espera para acordar el pago y la entrega.`);
  window.open(`https://wa.me/${WHATSAPP_NUMBER}?text=${message}`, "_blank");
});

/* Inicialización */
loadProducts();
renderCart();
updateCartBadges();
