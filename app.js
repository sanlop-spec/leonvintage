/* ============================================
   LEÓN VINTAGE — app.js (CÓDIGO COMPLETO)
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
    .select("id, titulo, imagen_url, tallas, detalles, precio, precio_oferta, categoria, condicion, stock, rating, medida_ancho, medida_largo, medida_manga")
    .order("id", { ascending: false });

  if (!error && data) {
    products = data;
    applyFiltersAndRender();
    setupOutfitBuilder();
  }
}

/* ---------- 3. FILTRADO Y RENDER DE TARJETAS ---------- */
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

  // Talla (CH, M, G, EG)
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

  // Orden
  if (currentSort === "price-asc") {
    filtered.sort((a, b) => (a.precio_oferta || a.precio || 0) - (b.precio_oferta || b.precio || 0));
  } else if (currentSort === "price-desc") {
    filtered.sort((a, b) => (b.precio_oferta || b.precio || 0) - (a.precio_oferta || a.precio || 0));
  } else {
    filtered.sort((a, b) => b.id - a.id);
  }

  if (filtered.length === 0) {
    grid.innerHTML = `<p class="col-span-full text-center text-muted font-mono text-xs py-10">No se encontraron prendas con los filtros seleccionados.</p>`;
    return;
  }

  grid.innerHTML = filtered.map(p => createProductCardHTML(p)).join("");
  attachCardEvents(grid);
}

function createProductCardHTML(p) {
  const tallasStr = Array.isArray(p.tallas) ? p.tallas.join(", ") : (p.tallas || "Única");
  const condicionTexto = p.condicion ? p.condicion : "Condición: 9/10";
  const ratingVal = p.rating ? Number(p.rating).toFixed(1) : "5.0";
  const stockVal = p.stock !== undefined && p.stock !== null ? p.stock : 1;

  let precioHTML = p.precio_oferta 
    ? `<div class="flex items-center gap-2 mt-1"><span class="text-gold font-mono font-bold">$${p.precio_oferta}</span><span class="text-muted font-mono text-xs line-through">$${p.precio}</span></div>`
    : `<p class="text-gold font-mono font-bold text-sm mt-1">$${p.precio || 0}</p>`;

  return `
    <article class="product-card rounded-xl overflow-hidden relative flex flex-col justify-between">
      <div class="product-card__img-wrap relative cursor-pointer quick-view-trigger" data-id="${p.id}">
        ${p.precio_oferta ? '<span class="absolute top-2 left-2 bg-copper text-bone text-[9px] font-mono font-bold px-2 py-0.5 rounded shadow z-10">En Oferta</span>' : ''}
        <span class="absolute top-2 right-2 bg-black/70 backdrop-blur-md text-gold text-[9px] font-mono font-bold px-2 py-0.5 rounded z-10 border border-gold/30">${condicionTexto}</span>
        <img src="${p.imagen_url}" alt="${p.titulo}" loading="lazy">
        <div class="absolute inset-0 bg-black/40 opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center">
          <span class="bg-onyx/90 border border-gold text-gold font-mono text-[10px] uppercase font-bold px-3 py-1.5 rounded-full">🔍 Vista Rápida</span>
        </div>
      </div>

      <div class="p-4 flex flex-col justify-between flex-1 gap-2">
        <div>
          <!-- Rating Estrellas -->
          <div class="flex items-center gap-1 mb-1">
            <span class="text-gold text-xs">★</span>
            <span class="text-[10px] text-bone font-bold font-mono">${ratingVal}</span>
            <span class="text-[9px] text-muted font-mono">(Pieza Original)</span>
          </div>

          <div class="flex justify-between items-start gap-2">
            <h3 class="font-display font-bold text-sm text-bone cursor-pointer quick-view-trigger" data-id="${p.id}">${p.titulo || "Producto"}</h3>
            <span class="text-[10px] font-mono text-muted border border-white/10 px-1.5 py-0.5 rounded shrink-0">Talla: ${tallasStr}</span>
          </div>
          <p class="text-[11px] text-muted line-clamp-2 mt-1">${p.detalles || ""}</p>
        </div>

        <div>
          ${precioHTML}
          
          <!-- Indicador de Stock / Urgencia -->
          <div class="mt-2 flex items-center justify-between text-[9px] font-mono">
            ${stockVal <= 1 
              ? '<span class="text-copper font-bold animate-pulse">🔥 ¡Última pieza disponible!</span>' 
              : `<span class="text-emerald-400">Disponible (${stockVal} pzs)</span>`}
          </div>

          <div class="flex items-center justify-between gap-2 mt-3">
            <span class="text-[9px] text-muted font-mono">📍 Entrega local</span>
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
  container.querySelectorAll(".add-to-cart-btn").forEach(btn => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      addToCart(btn.dataset.id);
      btn.textContent = "¡Agregado!";
      setTimeout(() => { btn.textContent = "Agregar"; }, 900);
    });
  });

  container.querySelectorAll(".quick-view-trigger").forEach(el => {
    el.addEventListener("click", () => { openQuickView(el.dataset.id); });
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

/* ---------- 4. VISTA RÁPIDA (CON MEDIDAS Y ZOOM DE IMAGEN) ---------- */
/* ---------- VISTA RÁPIDA (SOLO MOSTRAR MEDIDAS SI EXISTEN EN SUPABASE) ---------- */
function openQuickView(productId) {
  const p = products.find(item => String(item.id) === String(productId));
  if (!p) return;

  const content = document.getElementById("quickViewContent");
  const tallasStr = Array.isArray(p.tallas) ? p.tallas.join(", ") : (p.tallas || "Única");
  const condicionTexto = p.condicion ? p.condicion : "9/10 (Excelente estado vintage)";
  const ratingVal = p.rating ? Number(p.rating).toFixed(1) : "5.0";

  // Comprobamos si existe al menos una medida llenada en Supabase
  const hasMedidas = p.medida_ancho || p.medida_largo || p.medida_manga;

  // Si existen medidas, construimos la cajita HTML; si no, se queda vacía ("")
  const medidasHTML = hasMedidas ? `
    <div class="my-3 p-3 bg-white/[0.03] border border-gold/20 rounded-xl space-y-2">
      <div class="flex items-center justify-between text-xs font-mono">
        <span class="text-gold font-bold flex items-center gap-1">📏 Medidas Exactas:</span>
      </div>
      <div class="grid grid-cols-3 gap-2 text-center text-[10px] font-mono pt-1">
        ${p.medida_ancho ? `
          <div class="bg-onyx p-1.5 rounded border border-white/5">
            <span class="text-muted block">Ancho (Axila-Axila)</span>
            <span class="text-bone font-bold">${p.medida_ancho}</span>
          </div>` : ''}
        ${p.medida_largo ? `
          <div class="bg-onyx p-1.5 rounded border border-white/5">
            <span class="text-muted block">Largo (Hombro-Base)</span>
            <span class="text-bone font-bold">${p.medida_largo}</span>
          </div>` : ''}
        ${p.medida_manga ? `
          <div class="bg-onyx p-1.5 rounded border border-white/5">
            <span class="text-muted block">Manga / Caída</span>
            <span class="text-bone font-bold">${p.medida_manga}</span>
          </div>` : ''}
      </div>
    </div>
  ` : '';

  const related = products.filter(item => String(item.id) !== String(p.id)).slice(0, 2);

  content.innerHTML = `
    <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
      <!-- Imagen de producto con trigger para Zoom -->
      <div class="relative group cursor-zoom-in overflow-hidden rounded-xl border border-white/10" onclick="openImageZoom('${p.imagen_url}')">
        <img src="${p.imagen_url}" class="w-full aspect-[3/4] object-cover transition-transform duration-500 group-hover:scale-105">
        <div class="absolute bottom-3 right-3 bg-onyx/80 backdrop-blur-md text-gold text-[10px] font-mono font-bold px-2.5 py-1 rounded-full border border-gold/30 flex items-center gap-1 shadow-lg">
          🔍 Clic para ampliar foto
        </div>
      </div>
      
      <div class="flex flex-col justify-between space-y-4">
        <div>
          <div class="flex items-center justify-between mb-1">
            <span class="text-[10px] font-mono uppercase text-copper font-bold tracking-widest">Prenda Exclusiva</span>
            <span class="text-[10px] font-mono text-gold bg-gold/10 px-2 py-0.5 rounded border border-gold/30">★ ${ratingVal} Excelente</span>
          </div>

          <h2 class="font-display font-bold text-xl text-bone mb-2">${p.titulo}</h2>
          <span class="text-gold font-mono font-bold text-xl block mb-2">$${p.precio_oferta || p.precio || 0}</span>
          
          <p class="text-[10px] text-muted font-mono mb-4">👀 2 personas están interesadas en esta prenda en este momento.</p>

          <div class="space-y-2 border-t border-b border-white/10 py-3 text-xs text-muted font-mono">
            <p><strong class="text-bone">Detalles:</strong> ${p.detalles || "Sin descripción adicional."}</p>
            <p><strong class="text-bone">Talla de etiqueta:</strong> ${tallasStr}</p>
            <p><strong class="text-bone">Estado / Condición:</strong> ${condicionTexto}</p>
          </div>

          <!-- SECCIÓN DE MEDIDAS (SOLO SI TIENEN VALOR EN SUPABASE) -->
          ${medidasHTML}

          <!-- Métodos de Entrega y Pago -->
          <div class="bg-white/5 border border-white/10 rounded-lg p-3 my-3 text-[11px] font-mono space-y-1">
            <p class="text-bone">📍 <strong class="text-gold">Entrega Personal:</strong> Punto medio acordado vía WhatsApp.</p>
            <p class="text-bone">💳 <strong class="text-gold">Pagos:</strong> Efectivo al momento o Transferencia SPEI.</p>
          </div>

          <!-- FAQ Acordeón -->
          <div class="space-y-2 my-2 text-[11px] font-mono">
            <details class="bg-white/[0.02] border border-white/10 rounded-lg p-2 cursor-pointer">
              <summary class="font-bold text-bone flex justify-between">
                <span>¿Cómo confirmo la entrega?</span>
                <span class="text-gold">+</span>
              </summary>
              <p class="text-muted mt-2 text-[10px]">Al hacer clic en "Acordar Entrega", te abre un chat directo de WhatsApp con la prenda elegida para acordar día, hora y lugar céntrico.</p>
            </details>
          </div>
        </div>

        <button onclick="addToCart(${p.id}); closeQuickView();" class="w-full py-3 rounded-full bg-gold text-onyx font-mono text-xs uppercase font-bold tracking-wider hover:bg-goldBright transition-all shadow-lg">
          Agregar al Carrito
        </button>
      </div>
    </div>

    <!-- Prendas Similares -->
    ${related.length > 0 ? `
      <div class="border-t border-white/10 mt-6 pt-4">
        <h4 class="font-display text-xs text-gold uppercase tracking-wider mb-3">Prendas Similares</h4>
        <div class="grid grid-cols-2 gap-3">
          ${related.map(r => `
            <div class="flex items-center gap-2 p-2 bg-white/5 rounded-lg border border-white/5 cursor-pointer hover:border-gold" onclick="openQuickView(${r.id})">
              <img src="${r.imagen_url}" class="w-10 h-12 object-cover rounded">
              <div class="truncate">
                <p class="font-display text-[11px] text-bone truncate">${r.titulo}</p>
                <span class="font-mono text-[10px] text-gold font-bold">$${r.precio_oferta || r.precio}</span>
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    ` : ''}
  `;

  document.getElementById("quickViewModal").classList.remove("hidden");
}
}

function closeQuickView() {
  document.getElementById("quickViewModal").classList.add("hidden");
}

document.getElementById("closeQuickViewBtn")?.addEventListener("click", closeQuickView);

/* ---------- 5. CONTROL DEL MODAL DE ZOOM / PANTALLA COMPLETA ---------- */
function openImageZoom(imgUrl) {
  const modal = document.getElementById("imageZoomModal");
  const img = document.getElementById("zoomedImage");
  if (!modal || !img) return;

  img.src = imgUrl;
  modal.classList.remove("hidden");
}

function closeImageZoom() {
  document.getElementById("imageZoomModal")?.classList.add("hidden");
}

document.getElementById("imageZoomModal")?.addEventListener("click", (e) => {
  if (e.target.id === "imageZoomModal" || e.target.id === "closeZoomBtn") {
    closeImageZoom();
  }
});

/* ---------- 6. RENDER DEL CARRITO DE COMPRAS ---------- */
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

/* ---------- 7. CREADOR DE OUTFITS ---------- */
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

/* ---------- 8. ANUNCIOS ROTATIVOS TOP ---------- */
const tickerMessages = [
  "✨ 15% OFF automático en tu paquete al crear un Outfit de 2+ prendas",
  "🎁 Lleva 2 o más prendas y recibe un accesorio de regalo en tu compra",
  "📍 Entregas personales en punto medio o pago en efectivo/transferencia",
  "🔥 Piezas únicas de colección seleccionadas a detalle"
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

/* ---------- 9. LISTENERS Y EVENTOS ---------- */
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

/* ---------- 10. CHECKOUT DIRECTO A WHATSAPP ---------- */
document.getElementById("checkoutBtn")?.addEventListener("click", () => {
  if (cart.length === 0) return;

  const totalItems = cart.reduce((sum, item) => sum + item.cantidad, 0);
  const giftNote = totalItems >= 2 ? "\n\n🎁 *¡Aplica para regalo de accesorio en su paquete!*" : "";
  const lines = cart.map(item => `• 1x ${item.titulo} — *$${item.precio}*`);
  
  const message = encodeURIComponent(`¡Hola, León Vintage! Me interesa adquirir este pedido para entrega personal:\n\n${lines.join("\n")}${giftNote}\n\nQuedo a la espera para acordar el punto medio de entrega y método de pago (Efectivo / SPEI).`);
  window.open(`https://wa.me/${WHATSAPP_NUMBER}?text=${message}`, "_blank");
});

/* Inicialización */
loadProducts();
renderCart();
updateCartBadges();
