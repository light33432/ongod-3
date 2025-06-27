const API_BASE = window.location.origin;

let isAuthenticated = false;

// --- CATEGORY RENDERING ---
function renderCategory(products, category, containerId) {
  if (!isAuthenticated) return;
  const container = document.getElementById(containerId);
  const filtered = products.filter(p =>
    (category === 'phones' && /phone/i.test(p.name)) ||
    (category === 'laptops' && /laptop|macbook|spectre/i.test(p.name)) ||
    (category === 'accessories' && !/phone|laptop|macbook|spectre/i.test(p.name))
  );
  if (!filtered.length) {
    container.innerHTML = '<p style="color:#e74c3c;font-size:1.1em;">No products found.</p>';
    return;
  }
  container.innerHTML = filtered.map((p, idx) => `
    <div class="product">
      <img src="${API_BASE}${p.image}" alt="${p.name}" onerror="this.src='https://via.placeholder.com/180x180?text=No+Image'">
      <h2>${p.name}</h2>
      <p class="price">${p.price}</p>
      <p>${p.desc}</p>
      <button class="buy-now-btn" data-category="${category}" data-idx="${idx}">Buy Now</button>
    </div>
  `).join('');
  // Add event listeners for Buy Now buttons
  container.querySelectorAll('.buy-now-btn').forEach(btn => {
    btn.onclick = function() {
      const idx = parseInt(this.getAttribute('data-idx'));
      showProductModal(filtered[idx]);
    };
  });
}

// --- NOTIFICATION SYSTEM ---
function showNotification(msg, type = 'info', timeout = 3000) {
  let notif = document.getElementById('notification');
  if (!notif) {
    notif = document.createElement('div');
    notif.id = 'notification';
    notif.style.position = 'fixed';
    notif.style.top = '24px';
    notif.style.right = '24px';
    notif.style.zIndex = 20000;
    notif.style.padding = '16px 28px';
    notif.style.borderRadius = '8px';
    notif.style.fontSize = '1.1em';
    notif.style.boxShadow = '0 2px 12px #3949ab22';
    notif.style.background = '#fff';
    notif.style.color = '#3949ab';
    notif.style.border = '2px solid #3949ab';
    notif.style.display = 'none';
    document.body.appendChild(notif);
  }
  notif.textContent = msg;
  notif.style.display = 'block';
  notif.style.background = type === 'error' ? '#ffeaea' : '#e0e7ff';
  notif.style.color = type === 'error' ? '#e74c3c' : '#3949ab';
  notif.style.borderColor = type === 'error' ? '#e74c3c' : '#3949ab';
  setTimeout(() => { notif.style.display = 'none'; }, timeout);
}

// --- LOGIN/REGISTER MODALS ---
function showAuthModal(type) {
  const modalBg = document.getElementById('auth-modal-bg');
  const modal = document.getElementById('auth-modal');
  // Demo data for states, areas, streets
  const stateOptions = {
    Lagos: {
      Ikeja: ['Allen Avenue', 'Opebi Road'],
      Yaba: ['Herbert Macaulay', 'Commercial Avenue']
    },
    Abuja: {
      Garki: ['Area 1', 'Area 2'],
      Wuse: ['Zone 1', 'Zone 2']
    }
  };
  let selectedState = 'Lagos';
  let selectedArea = 'Ikeja';
  let selectedStreet = 'Allen Avenue';
  function getAreaOptions(state) {
    return Object.keys(stateOptions[state] || {});
  }
  function getStreetOptions(state, area) {
    return (stateOptions[state] && stateOptions[state][area]) || [];
  }
  function renderRegisterForm() {
    const areas = getAreaOptions(selectedState);
    const streets = getStreetOptions(selectedState, selectedArea);
    return `
      <button class="close-btn" onclick="document.getElementById('auth-modal-bg').style.display='none'">&times;</button>
      <h2>Register</h2>
      <input type="text" id="register-email" placeholder="Email">
      <input type="text" id="register-username" placeholder="Username">
      <input type="password" id="register-password" placeholder="Password">
      <select id="register-state">
        ${Object.keys(stateOptions).map(s => `<option value="${s}">${s}</option>`).join('')}
      </select>
      <select id="register-area">
        ${areas.map(a => `<option value="${a}">${a}</option>`).join('')}
      </select>
      <select id="register-street">
        ${streets.map(st => `<option value="${st}">${st}</option>`).join('')}
      </select>
      <input type="text" id="register-address" placeholder="Full Address">
      <button id="register-submit-btn">Register</button>
      <div class="auth-error" id="register-error"></div>
      <div class="auth-switch" onclick="showAuthModal('login')">Already have an account? Login</div>
    `;
  }
  if (type === 'login') {
    modal.innerHTML = `
      <button class="close-btn" onclick="document.getElementById('auth-modal-bg').style.display='none'">&times;</button>
      <h2>Login</h2>
      <input type="text" id="login-email" placeholder="Email">
      <input type="password" id="login-password" placeholder="Password">
      <button id="login-submit-btn">Login</button>
      <div class="auth-error" id="login-error"></div>
      <div class="auth-switch" onclick="showAuthModal('register')">Don't have an account? Register</div>
    `;
  } else {
    modal.innerHTML = renderRegisterForm();
    // Add change listeners for state/area
    setTimeout(() => {
      const stateSel = document.getElementById('register-state');
      const areaSel = document.getElementById('register-area');
      const streetSel = document.getElementById('register-street');
      stateSel.onchange = function() {
        selectedState = this.value;
        selectedArea = getAreaOptions(selectedState)[0];
        selectedStreet = getStreetOptions(selectedState, selectedArea)[0];
        areaSel.innerHTML = getAreaOptions(selectedState).map(a => `<option value="${a}">${a}</option>`).join('');
        streetSel.innerHTML = getStreetOptions(selectedState, selectedArea).map(st => `<option value="${st}">${st}</option>`).join('');
      };
      areaSel.onchange = function() {
        selectedArea = this.value;
        selectedStreet = getStreetOptions(selectedState, selectedArea)[0];
        streetSel.innerHTML = getStreetOptions(selectedState, selectedArea).map(st => `<option value="${st}">${st}</option>`).join('');
      };
      streetSel.onchange = function() {
        selectedStreet = this.value;
      };
    }, 0);
  }
  modalBg.style.display = 'flex';

  if (type === 'login') {
    document.getElementById('login-submit-btn').onclick = async () => {
      const email = document.getElementById('login-email').value.trim();
      const password = document.getElementById('login-password').value;
      if (!email || !password) {
        document.getElementById('login-error').textContent = 'Please enter email and password.';
        return;
      }
      document.getElementById('login-error').textContent = '';
      try {
        const res = await fetch(`${API_BASE}/api/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password })
        });
        const data = await res.json();
        if (!res.ok) {
          document.getElementById('login-error').textContent = data.error || 'Login failed.';
          showNotification(data.error || 'Login failed.', 'error');
          return;
        }
        modalBg.style.display = 'none';
        showNotification('Login successful!', 'info');
        authenticateAndShowMain();
      } catch (err) {
        document.getElementById('login-error').textContent = 'Network error.';
        showNotification('Network error.', 'error');
      }
    };
  } else {
    document.getElementById('register-submit-btn').onclick = async () => {
      const email = document.getElementById('register-email').value.trim();
      const username = document.getElementById('register-username').value.trim();
      const password = document.getElementById('register-password').value;
      const state = document.getElementById('register-state').value;
      const area = document.getElementById('register-area').value;
      const street = document.getElementById('register-street').value;
      const address = document.getElementById('register-address').value.trim();
      if (!email || !username || !password || !state || !area || !street || !address) {
        document.getElementById('register-error').textContent = 'Please fill all fields.';
        return;
      }
      document.getElementById('register-error').textContent = '';
      try {
        const res = await fetch(`${API_BASE}/api/register`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, username, password, state, area, street, address })
        });
        const data = await res.json();
        if (!res.ok) {
          document.getElementById('register-error').textContent = data.error || 'Registration failed.';
          showNotification(data.error || 'Registration failed.', 'error');
          return;
        }
        // Prompt for code
        showCodeModal(email);
        showNotification('Verification code sent to your email.', 'info');
      } catch (err) {
        document.getElementById('register-error').textContent = 'Network error.';
        showNotification('Network error.', 'error');
      }
    };
  }
}
window.showAuthModal = showAuthModal;

function showCodeModal(email) {
  const modalBg = document.getElementById('auth-modal-bg');
  const modal = document.getElementById('auth-modal');
  modal.innerHTML = `
    <button class="close-btn" onclick="document.getElementById('auth-modal-bg').style.display='none'">&times;</button>
    <h2>Email Verification</h2>
    <p style="margin-bottom:10px;">Enter the 6-digit code sent to <b>${email}</b></p>
    <input type="text" id="verify-code" placeholder="Verification code">
    <button id="verify-btn">Verify</button>
    <div class="auth-error" id="verify-error"></div>
  `;
  modalBg.style.display = 'flex';
  document.getElementById('verify-btn').onclick = async () => {
    const code = document.getElementById('verify-code').value.trim();
    if (!code) {
      document.getElementById('verify-error').textContent = 'Enter the code.';
      return;
    }
    try {
      const res = await fetch(`${API_BASE}/api/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, code })
      });
      const data = await res.json();
      if (!res.ok) {
        document.getElementById('verify-error').textContent = data.error || 'Verification failed.';
        showNotification(data.error || 'Verification failed.', 'error');
        return;
      }
      modalBg.style.display = 'none';
      showNotification('Email verified! You can now login.', 'info');
      showAuthModal('login');
    } catch (err) {
      document.getElementById('verify-error').textContent = 'Network error.';
      showNotification('Network error.', 'error');
    }
  };
}

function authenticateAndShowMain() {
  isAuthenticated = true;
  document.getElementById('main-content').style.display = 'block';
  document.getElementById('search-bar').style.display = 'flex';
  document.getElementById('login-btn-header').style.display = 'none';
  document.getElementById('register-btn-header').style.display = 'none';
  if (window.allProducts) renderAllCategories(window.allProducts);
}

// --- SEARCH ---
function setupSearch(products) {
  const searchInput = document.getElementById('search-input');
  const searchBtn = document.getElementById('search-btn');
  searchBtn.onclick = () => {
    const q = searchInput.value.trim().toLowerCase();
    if (!q) {
      renderAllCategories(products);
      return;
    }
    const filtered = products.filter(
      p => p.name.toLowerCase().includes(q) ||
           p.desc.toLowerCase().includes(q)
    );
    renderAllCategories(filtered);
  };
  searchInput.addEventListener('keydown', e => {
    if (e.key === 'Enter') searchBtn.click();
  });
}

function renderAllCategories(products) {
  renderCategory(products, 'phones', 'phones-list');
  renderCategory(products, 'laptops', 'laptops-list');
  renderCategory(products, 'accessories', 'accessories-list');
}

// --- BUY NOW MODAL WITH PICK/DELIVERY ---
function showProductModal(product) {
  const modalBg = document.getElementById('modal-bg');
  const modalContent = document.getElementById('modal-content');
  // Get user address for delivery
  let user = null;
  try {
    user = JSON.parse(localStorage.getItem('userInfo'));
  } catch {}
  modalContent.innerHTML = `
    <button class="close-btn" onclick="document.getElementById('modal-bg').style.display='none'">&times;</button>
    <img src="${API_BASE}${product.image}" alt="${product.name}">
    <h2>${product.name}</h2>
    <p class="price">${product.price}</p>
    <p>${product.desc}</p>
    <div style="margin:16px 0;">
      <button class="pick-btn" style="margin-right:12px;">Pick Up</button>
      <button class="deliver-btn">Delivery</button>
    </div>
    <div id="map-container" style="margin-bottom:10px;"></div>
    <button class="buy-now-btn" style="margin-top:10px;display:none;" id="confirm-buy-btn">Confirm Buy</button>
  `;
  modalBg.style.display = 'flex';
  const mapContainer = document.getElementById('map-container');
  let selectedType = null;
  function showMap(type) {
    let mapQuery = '';
    if (type === 'pick') {
      mapQuery = 'Lagos Nigeria';
    } else if (user && user.state && user.area && user.street && user.address) {
      mapQuery = `${user.address}, ${user.street}, ${user.area}, ${user.state}`;
    } else {
      mapQuery = 'Nigeria';
    }
    mapContainer.innerHTML = `<iframe
      src="https://www.google.com/maps?q=${encodeURIComponent(mapQuery)}&output=embed"
      allowfullscreen="" loading="lazy" referrerpolicy="no-referrer-when-downgrade"></iframe>`;
    document.getElementById('confirm-buy-btn').style.display = 'block';
    selectedType = type;
  }
  modalContent.querySelector('.pick-btn').onclick = () => showMap('pick');
  modalContent.querySelector('.deliver-btn').onclick = () => showMap('deliver');
  document.getElementById('confirm-buy-btn').onclick = () => {
    showNotification(`Order placed for ${product.name} (${selectedType==='pick'?'Pick Up':'Delivery'})!`, 'info');
    modalBg.style.display = 'none';
  };
}

document.addEventListener('DOMContentLoaded', async () => {
  document.getElementById('login-btn-header').onclick = () => showAuthModal('login');
  document.getElementById('register-btn-header').onclick = () => showAuthModal('register');
  document.getElementById('modal-bg').onclick = e => {
    if (e.target === document.getElementById('modal-bg')) e.target.style.display = 'none';
  };
  document.getElementById('auth-modal-bg').onclick = e => {
    if (e.target === document.getElementById('auth-modal-bg')) e.target.style.display = 'none';
  };

  try {
    const res = await fetch(`${API_BASE}/api/products`);
    if (!res.ok) throw new Error('Network error');
    const products = await res.json();
    window.allProducts = products;
    setupSearch(products);
    // Do not render categories until authenticated
  } catch (err) {
    ['phones-list', 'laptops-list', 'accessories-list'].forEach(id => {
      document.getElementById(id).innerHTML = '<p style="color:#e74c3c;font-size:1.1em;">Failed to load products.</p>';
    });
  }
  // Show login modal on first load
  showAuthModal('login');
});
