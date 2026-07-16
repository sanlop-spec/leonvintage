/* ============================================
   TIENDA LEÓN — app.js
   Catálogo dinámico + carrito + checkout WhatsApp
   ============================================ */

/* ---------- 1. CONFIGURACIÓN ---------- */
// Dirección base corregida (sin rutas internas al final)
const SUPABASE_URL = "https://gfdtualoijutbvozhasv.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdmZHR1YWxvaWp1dGJ2b3poYXN2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODM1NTU4OTgsImV4cCI6MjA5OTEzMTg5OH0.RMIEjlLpas_nIy32z9O2DoXrD5FVRdgj0BdSnb8QT4w";

// Nombre de la tabla que contiene los productos
const TABLE_NAME = "productos";

// Número de WhatsApp Business de la tienda (Corregido a formato internacional puro)
const WHATSAPP_NUMBER = "522411028038";

const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

/* ---------- 2. ESTADO DEL CARRITO ---------- */
const CART_STORAGE_KEY = "tienda_leon_cart";
let cart = loadCart();
let products = [];

function loadCart() {
  try {
    const raw = localStorage.getItem(CART_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveCart() {
  localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cart));
  renderCart();
  updateCartBadges();
}

/* ---------- 3. CARGA DEL CATÁLOGO ---------- */
async function loadProducts() {
  const loadingEl = document.getElementById("loadingState");
  const emptyEl = document.getElementById("emptyState");
  const errorEl = document.getElementById("errorState");
  const grid = document.getElementById("productGrid");

  loadingEl.classList.remove("hidden");
  emptyEl.classList.add("hidden");
  errorEl.classList.add("hidden");
  grid.innerHTML = "";

  // Agregamos 'precio_oferta' a la consulta de Supabase
  const { data, error } = await supabaseClient
    .from(TABLE_NAME)
    .select("id, titulo, imagen_url, tallas, detalles, precio, precio_oferta")
    .order("id", { ascending: false });

  loadingEl.classList.add("hidden");

  if (error) {
    console.error("Error al cargar productos:", error.message);
    errorEl.classList.remove("hidden");
    return;
  }

  if (!data || data.length === 0) {
    emptyEl.classList.remove("hidden");
    return;
  }

  products = data;
  document.getElementById("productCount").textContent = `${data.length} pieza${data.length === 1 ? "" : "s"}`;
  document.getElementById("productCount").classList.remove("hidden");
  renderProducts(data);
}

function parseTallas(tallas) {
  // Acepta "S,M,L" (texto) o ["S","M","L"] (array de Supabase) y las normaliza
  if (Array.isArray(tallas)) return tallas.filter(Boolean);
  if (typeof tallas === "string") return tallas.split(",").map(t => t.trim()).filter(Boolean);
  return [];
}

function renderProducts(list) {
  const grid = document.getElementById("productGrid");
  grid.innerHTML = list.map((p, i) => {
    const tallas = parseTallas(p.tallas);
    const tallasHTML = tallas.length
      ? tallas.map(t => `<span class="size-pill">${escapeHTML(t)}</span>`).join("")
      : `<span class="size-pill">Talla única</span>`;

    // LÓGICA DE PRECIOS Y OFERTAS
    let precioHTML = '';
    let etiquetaOfertaHTML = '';

    if (p.precio_oferta) {
      // Si hay oferta: Muestra precio nuevo resaltado y el original tachado (line-through)
      precioHTML = `
        <div class="flex items-center gap-2 mt-1">
          <span class="text-gold font-mono font-bold text-sm">$${p.precio_oferta}</span>
          <span class="text-muted font-mono text-xs line-through">$${p.precio}</span>
        </div>
      `;
      // Añade una etiqueta visual de Oferta sobre la imagen
      etiquetaOfertaHTML = `
        <span class="absolute top-2 left-2 bg-copper text-bone text-[9px] font-mono uppercase tracking-wider font-bold px-2 py-0.5 rounded">
          Oferta
        </span>
      `;
    } else if (p.precio) {
      // Si no hay oferta, muestra el precio normalito
      precioHTML = `<p class="text-gold font-mono font-bold text-sm mt-1">$${p.precio}</p>`;
    }

    return `
      <article class="product-card fade-up relative" style="animation-delay:${Math.min(i * 40, 400)}ms">
        <div class="product-card__img-wrap relative">
          ${etiquetaOfertaHTML}
          <img src="${escapeAttr(p.imagen_url)}" alt="${escapeAttr(p.titulo)}" loading="lazy"
               onerror="this.src='https://placehold.co/400x533/16151B/C9A227?text=León+Vintage'">
        </div>
        <div class="p-4 flex flex-col gap-2 flex-1">
          <h3 class="font-display font-bold text-base leading-snug">${escapeHTML(p.titulo || "Producto sin nombre")}</h3>
          <div class="flex flex-wrap">${tallasHTML}</div>
          <p class="text-xs text-muted leading-relaxed flex-1">${escapeHTML(p.detalles || "")}</p>
          ${precioHTML}
          <button
            class="add-to-cart-btn mt-2 w-full py-2.5 rounded-full border border-gold text-gold hover:bg-gold hover:text-onyx font-mono text-[11px] uppercase tracking-[0.15em] font-semibold transition-colors"
            data-id="${p.id}"
            data-talla="${escapeAttr(tallas[0] || 'Única')}">
            Agregar al carrito
          </button>
        </div>
      </article>
    `;
  }).join("");

  document.querySelectorAll(".add-to-cart-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      addToCart(btn.dataset.id, btn.dataset.talla);
      btn.textContent = "¡Agregado!";
      setTimeout(() => { btn.textContent = "Agregar al carrito"; }, 900);
    });
  });
}

function escapeHTML(str = "") {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}
function escapeAttr(str = "") {
  return String(str).replace(/"/g, "&quot;");
}

/* ---------- 4. LÓGICA DEL CARRITO ---------- */
function addToCart(productId, talla) {
  const product = products.find(p => String(p.id) === String(productId));
  if (!product) return;

  const existing = cart.find(item => item.id === product.id && item.talla === talla);
  if (existing) {
    existing.cantidad += 1;
  } else {
    cart.push({
      id: product.id,
      titulo: product.titulo,
      imagen_url: product.imagen_url,
      talla: talla,
      cantidad: 1
    });
  }
  saveCart();
  openCart();
}

function changeQty(index, delta) {
  cart[index].cantidad += delta;
  if (cart[index].cantidad <= 0) cart.splice(index, 1);
  saveCart();
}

function removeItem(index) {
  cart.splice(index, 1);
  saveCart();
}

function cartTotalItems() {
  return cart.reduce((sum, item) => sum + item.cantidad, 0);
}

function renderCart() {
  const container = document.getElementById("cartItemsContainer");
  const emptyMsg = document.getElementById("cartEmptyMsg");
  const checkoutBtn = document.getElementById("checkoutBtn");

  if (cart.length === 0) {
    container.classList.add("hidden");
    emptyMsg.classList.remove("hidden");
    checkoutBtn.disabled = true;
  } else {
    container.classList.remove("hidden");
    emptyMsg.classList.add("hidden");
    checkoutBtn.disabled = false;

    container.innerHTML = cart.map((item, index) => `
      <div class="cart-line-item">
        <img src="${escapeAttr(item.imagen_url)}" alt="${escapeAttr(item.titulo)}"
             onerror="this.src='https://placehold.co/64x80/16151B/C9A227?text=TL'">
        <div class="flex-1 flex flex-col gap-1">
          <p class="font-display font-semibold text-sm leading-snug">${escapeHTML(item.titulo)}</p>
          <span class="size-pill w-fit">Talla ${escapeHTML(item.talla)}</span>
          <div class="flex items-center gap-2 mt-1">
            <button class="qty-btn" data-action="dec" data-index="${index}">−</button>
            <span class="font-mono text-sm w-5 text-center">${item.cantidad}</span>
            <button class="qty-btn" data-action="inc" data-index="${index}">+</button>
            <button class="ml-auto text-[11px] font-mono uppercase text-muted hover:text-copper transition-colors" data-action="remove" data-index="${index}">
              Eliminar
            </button>
          </div>
        </div>
      </div>
    `).join("");

    container.querySelectorAll("[data-action]").forEach(btn => {
      const index = Number(btn.dataset.index);
      btn.addEventListener("click", () => {
        const action = btn.dataset.action;
        if (action === "inc") changeQty(index, 1);
        if (action === "dec") changeQty(index, -1);
        if (action === "remove") removeItem(index);
      });
    });
  }

  document.getElementById("cartTotalItems").textContent = cartTotalItems();
}

function updateCartBadges() {
  const total = cartTotalItems();
  [document.getElementById("cartCount"), document.getElementById("floatingCartCount")].forEach(badge => {
    badge.textContent = total;
    badge.classList.toggle("hidden", total === 0);
    badge.classList.toggle("flex", total > 0);
  });
}

/* ---------- 5. DRAWER DEL CARRITO ---------- */
function openCart() {
  document.getElementById("cartDrawer").classList.add("cart-open");
  document.getElementById("cartOverlay").classList.remove("hidden");
}
function closeCart() {
  document.getElementById("cartDrawer").classList.remove("cart-open");
  document.getElementById("cartOverlay").classList.add("hidden");
}

document.getElementById("cartBtn").addEventListener("click", openCart);
document.getElementById("floatingCartBtn").addEventListener("click", openCart);
document.getElementById("closeCartBtn").addEventListener("click", closeCart);
document.getElementById("cartOverlay").addEventListener("click", closeCart);

/* ---------- 6. CHECKOUT VÍA WHATSAPP ---------- */
function buildWhatsAppMessage() {
  const lines = cart.map(item => `- ${item.cantidad}x ${item.titulo} (Talla ${item.talla})`);
  return `¡Hola, León Vintage! Me interesa dominar mi estilo con el siguiente pedido:\n${lines.join("\n")}\n¿Tienen disponibilidad para coordinar el pago?`;
}

document.getElementById("checkoutBtn").addEventListener("click", () => {
  if (cart.length === 0) return;
  const message = encodeURIComponent(buildWhatsAppMessage());
  const url = `https://wa.me/${WHATSAPP_NUMBER}?text=${message}`;
  window.open(url, "_blank", "noopener");
});

/* ---------- 7. INICIO ---------- */
document.getElementById("year").textContent = new Date().getFullYear();
renderCart();
updateCartBadges();
loadProducts();

/* ---------- 8. VISTA PREVIA DE IMAGEN (MODAL) ---------- */
const imageModal = document.getElementById("imageModal");
const modalImg = document.getElementById("modalImg");
const closeModalBtn = document.getElementById("closeModalBtn");

const productGrid = document.getElementById("productGrid");
if (productGrid) {
  productGrid.addEventListener("click", (e) => {
    // Buscamos si el elemento clickeado es una imagen dentro de la tarjeta de producto
    const clickedImg = e.target.closest(".product-card__img-wrap img") || e.target.closest("article img");
    
    if (clickedImg) {
      e.preventDefault(); 
      const src = clickedImg.getAttribute("src");
      const alt = clickedImg.getAttribute("alt");
      
      // Abre en grande si no es la imagen vacía de error
      if (src && !src.includes("placehold.co")) {
        modalImg.src = src;
        modalImg.alt = alt || "León Vintage";
        imageModal.classList.add("active");
        document.body.classList.add("overflow-hidden");
      }
    }
  });
}

function closeImageModal() {
  if (imageModal) {
    imageModal.classList.remove("active");
    document.body.classList.remove("overflow-hidden");
    setTimeout(() => {
      modalImg.src = ""; 
    }, 300);
  }
}

if (closeModalBtn) {
  closeModalBtn.addEventListener("click", closeImageModal);
}
if (imageModal) {
  imageModal.addEventListener("click", (e) => {
    if (e.target === imageModal) {
      closeImageModal();
    }
  });
}

document.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && imageModal && imageModal.classList.contains("active")) {
    closeImageModal();
  }
});
