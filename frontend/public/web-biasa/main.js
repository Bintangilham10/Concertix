// ── State ──────────────────────────────────────────────────────────
var currentPrice = 1250000;
var qty = 1;

// ── Utilities ─────────────────────────────────────────────────────
function formatRupiah(n) {
  return 'Rp ' + n.toLocaleString('id-ID');
}

function showToast(icon, title, msg, duration) {
  duration = duration || 3500;
  var t = document.getElementById('toast');
  document.getElementById('toast-icon').textContent = icon;
  document.getElementById('toast-title').textContent = title;
  document.getElementById('toast-msg').textContent = msg;
  t.classList.add('show');
  setTimeout(function() { t.classList.remove('show'); }, duration);
}

// ── Navbar / Hamburger ────────────────────────────────────────────
var drawerOpen = false;
function toggleDrawer() {
  drawerOpen = !drawerOpen;
  var drawer = document.getElementById('navDrawer');
  var btn = document.getElementById('hamburgerBtn');
  drawer.classList.toggle('open', drawerOpen);
  btn.setAttribute('aria-expanded', drawerOpen.toString());
}
function closeDrawer() {
  drawerOpen = false;
  document.getElementById('navDrawer').classList.remove('open');
  document.getElementById('hamburgerBtn').setAttribute('aria-expanded', 'false');
}
document.getElementById('hamburgerBtn').addEventListener('click', toggleDrawer);

// Close drawer on Escape
document.addEventListener('keydown', function(e) {
  if (e.key === 'Escape') {
    closeDrawer();
    closeModal();
  }
});

// ── Smooth scroll for nav links ───────────────────────────────────
document.querySelectorAll('a[href^="#"]').forEach(function(a) {
  a.addEventListener('click', function(e) {
    var href = this.getAttribute('href');
    if (href === '#') return;
    var target = document.querySelector(href);
    if (target) {
      e.preventDefault();
      target.scrollIntoView({ behavior: 'smooth' });
    }
  });
});

// ── Artist card keyboard ──────────────────────────────────────────
document.querySelectorAll('.artist-card').forEach(function(card) {
  card.addEventListener('keydown', function(e) {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      showToast('🎵', card.querySelector('.artist-name').textContent,
        'Genre: ' + card.querySelector('.artist-genre').textContent);
    }
  });
});

// ── Ticket card keyboard ──────────────────────────────────────────
document.querySelectorAll('.ticket-card').forEach(function(card) {
  card.addEventListener('keydown', function(e) {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      var btn = this.querySelector('.ticket-btn');
      if (btn) btn.click();
    }
  });
});

// ── Modal ─────────────────────────────────────────────────────────
function openModal(type, priceStr, price) {
  currentPrice = price;
  qty = 1;

  document.getElementById('modal-type').textContent = type + ' Access';
  document.getElementById('modal-price').textContent = priceStr;
  document.getElementById('qty-display').textContent = '1';
  document.getElementById('modal-total').textContent = priceStr;

  // Reset form
  ['buyer-name', 'buyer-email', 'buyer-phone'].forEach(function(id) {
    var el = document.getElementById(id);
    el.value = '';
    el.classList.remove('error');
  });
  var btn = document.getElementById('checkout-btn');
  btn.textContent = 'Lanjut ke Pembayaran →';
  btn.disabled = false;
  btn.style.background = '';

  document.getElementById('checkoutModal').classList.add('open');
  setTimeout(function() { document.getElementById('buyer-name').focus(); }, 100);
}

function closeModal() {
  document.getElementById('checkoutModal').classList.remove('open');
}

// Close on overlay click
document.getElementById('checkoutModal').addEventListener('click', function(e) {
  if (e.target === this) closeModal();
});

// ── Quantity control ──────────────────────────────────────────────
function changeQty(delta) {
  qty = Math.max(1, Math.min(10, qty + delta));
  document.getElementById('qty-display').textContent = qty;
  document.getElementById('modal-total').textContent = formatRupiah(currentPrice * qty);
}

// ── Form validation & checkout ────────────────────────────────────
function validateField(id, errorId, validator) {
  var el = document.getElementById(id);
  var valid = validator(el.value.trim());
  el.classList.toggle('error', !valid);
  return valid;
}

function handleCheckout() {
  var nameOk = validateField('buyer-name', 'err-name', function(v) { return v.length > 1; });
  var emailOk = validateField('buyer-email', 'err-email', function(v) { return v.includes('@') && v.includes('.'); });
  var phoneOk = validateField('buyer-phone', 'err-phone', function(v) { return v.length >= 8; });

  if (!nameOk || !emailOk || !phoneOk) {
    showToast('⚠️', 'Periksa Form', 'Ada data yang belum diisi dengan benar.', 3000);
    return;
  }

  var btn = document.getElementById('checkout-btn');
  btn.textContent = 'Memproses Pembayaran...';
  btn.disabled = true;

  setTimeout(function() {
    btn.textContent = '✓ Dialihkan ke Midtrans...';
    btn.style.background = 'linear-gradient(135deg, #10B981, #059669)';
    showToast('🎉', 'Pembayaran Diproses!', 'Kamu akan diarahkan ke halaman Midtrans.', 4000);
    setTimeout(function() {
      closeModal();
      btn.textContent = 'Lanjut ke Pembayaran →';
      btn.disabled = false;
      btn.style.background = '';
    }, 2500);
  }, 1600);
}

// ── FAQ Accordion ─────────────────────────────────────────────────
function toggleFaq(id) {
  var item = document.getElementById(id);
  var answer = item.querySelector('.faq-answer');
  var btn = item.querySelector('.faq-question');
  var isOpen = item.classList.contains('open');

  // Close all
  document.querySelectorAll('.faq-item').forEach(function(fi) {
    fi.classList.remove('open');
    fi.querySelector('.faq-answer').classList.remove('open');
    fi.querySelector('.faq-question').setAttribute('aria-expanded', 'false');
  });

  // Open clicked (unless it was already open)
  if (!isOpen) {
    item.classList.add('open');
    answer.classList.add('open');
    btn.setAttribute('aria-expanded', 'true');
  }
}
