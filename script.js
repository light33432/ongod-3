// --- Modal & Auth Logic ---
document.addEventListener('DOMContentLoaded', () => {
  // Set your backend API base URL here (public Render URL)
  const API_BASE = 'https://ongod-phone-gadget-1.onrender.com';

  // Elements
  const loginModal = document.getElementById('login-modal');
  const loginBox = document.getElementById('login-box');
  const loginBtn = document.getElementById('login-btn');
  const registerBtn = document.getElementById('register-btn');
  const switchToRegister = document.getElementById('switch-to-register');
  const switchToLogin = document.getElementById('switch-to-login');
  const loginError = document.getElementById('login-error');
  const mainContent = document.getElementById('main-content');
  const loadingScreen = document.getElementById('loading-screen');
  const registerFormModal = document.getElementById('register-form-modal');
  const regState = document.getElementById('reg-state');
  const regArea = document.getElementById('reg-area');
  const regError = document.getElementById('reg-error');
  const verifyModal = document.getElementById('verify-modal');
  const notifBtn = document.getElementById('notification-btn');
  const notifModal = document.getElementById('notif-modal');
  const notifMessages = document.getElementById('notif-messages');
  const careChatModal = document.getElementById('care-chat-modal');
  const careChatForm = document.getElementById('care-chat-form');
  const careChatInput = document.getElementById('care-chat-input');
  const careChatMessages = document.getElementById('care-chat-messages');
  const modalBg = document.getElementById('modal-bg');
  const modalContent = document.getElementById('modal-content');

  // --- Notification History State ---
  let notificationHistory = JSON.parse(localStorage.getItem('notificationHistory') || '[]');

  // --- Notification Sound ---
  const notifSound = new Audio('images/notif.mp3'); // Place notif.mp3 in your images folder
  let lastNotifCount = notificationHistory.length;

  // --- Auth State ---
  let currentUser = null;
  let token = localStorage.getItem('token');

  // --- Auto-login on page load ---
  async function autoLogin() {
    if (token) {
      try {
        const res = await fetch(`${API_BASE}/api/me`, {
          headers: { 'Authorization': 'Bearer ' + token }
        });
        const data = await res.json();
        if (data.user) {
          currentUser = data.user;
          loginModal.style.display = 'none';
          mainContent.style.display = 'block';
          fetchOrderNotifications();
        } else {
          localStorage.removeItem('token');
        }
      } catch (err) {
        localStorage.removeItem('token');
      }
    }
  }
  autoLogin();

  // Sync notifications from backend for the logged-in user
  async function syncNotificationsFromBackend() {
    if (!currentUser || !currentUser.email) return;
    try {
      const res = await fetch(`${API_BASE}/api/notifications?email=${encodeURIComponent(currentUser.email)}`);
      const data = await res.json();
      if (data && Array.isArray(data.notifications)) {
        notificationHistory = data.notifications;
        localStorage.setItem('notificationHistory', JSON.stringify(notificationHistory));
        renderNotifications();
      }
    } catch (err) {
      renderNotifications();
    }
  }

  function addNotification(msg, type = 'info') {
    const entry = { msg, type, time: new Date().toLocaleString() };
    notificationHistory.push(entry);
    localStorage.setItem('notificationHistory', JSON.stringify(notificationHistory));
    renderNotifications();
  }

  function renderNotifications() {
    notifMessages.innerHTML = '';
    if (notificationHistory.length === 0) {
      notifMessages.innerHTML = '<div>No notifications yet.</div>';
      lastNotifCount = 0;
      return;
    }
    // Play sound if new notification
    if (notificationHistory.length > lastNotifCount) {
      notifSound.play();
    }
    lastNotifCount = notificationHistory.length;
    notificationHistory.slice().reverse().forEach(n => {
      notifMessages.innerHTML += `
        <div style="margin-bottom:10px;">
          <span style="color:${n.type === 'order' ? '#3949ab' : n.type === 'admin' ? '#2ecc71' : '#888'};font-weight:700;">
            [${n.time}]
          </span>
          <span>${n.msg}</span>
        </div>
      `;
    });
  }

  // --- Loading Screen ---
  setTimeout(() => {
    loadingScreen.style.display = 'none';
    // Only show login if not already logged in
    if (!token || !currentUser) {
      loginModal.style.display = 'flex';
    }
  }, 1200);

  // --- Modal Switching ---
  switchToRegister.onclick = () => {
    loginBox.style.display = 'none';
    registerFormModal.style.display = 'flex';
    loginError.textContent = '';
  };
  switchToLogin.onclick = () => {
    registerFormModal.style.display = 'none';
    loginBox.style.display = 'block';
    regError.textContent = '';
  };

  // --- Login/Register Logic (Backend) ---
  loginBtn.onclick = async () => {
    const email = document.getElementById('login-email').value.trim();
    const password = document.getElementById('login-password').value;
    if (!email || !password) {
      loginError.textContent = 'Please enter email and password.';
      return;
    }
    try {
      const res = await fetch(`${API_BASE}/api/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      const data = await res.json();
      if (!res.ok) {
        loginError.textContent = data.error || 'Login failed.';
        return;
      }
      currentUser = data.user;
      token = data.token;
      localStorage.setItem('token', token);
      loginModal.style.display = 'none';
      mainContent.style.display = 'block';
      fetchOrderNotifications();
    } catch (err) {
      loginError.textContent = 'Network error.';
    }
  };

  // Register Form Logic (Backend)
  registerFormModal.querySelector('button:nth-of-type(1)').onclick = async (e) => {
    e.preventDefault();
    // Validate fields
    const email = document.getElementById('email').value.trim();
    const phone = document.getElementById('reg-phone').value.trim();
    const username = document.getElementById('reg-username').value.trim();
    const password = document.getElementById('reg-password').value;
    const state = regState.value;
    const area = regArea.value;
    const street = document.getElementById('reg-street').value.trim();
    const address = document.getElementById('reg-address').value.trim();
    if (!email || !phone || !username || !password || !state || !area || !street || !address) {
      regError.textContent = 'Please fill all fields.';
      return;
    }
    try {
      const res = await fetch(`${API_BASE}/api/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, phone, username, password, state, area, street, address })
      });
      const data = await res.json();
      if (!res.ok) {
        regError.textContent = data.error || 'Registration failed.';
        return;
      }
      registerFormModal.style.display = 'none';
      verifyModal.style.display = 'flex';
      // Store email for verification step
      verifyModal.dataset.email = email;
    } catch (err) {
      regError.textContent = 'Network error.';
    }
  };
  // Cancel registration
  registerFormModal.querySelector('button:nth-of-type(2)').onclick = (e) => {
    e.preventDefault();
    registerFormModal.style.display = 'none';
    loginBox.style.display = 'block';
  };

  // --- Email Verification Modal ---
  const verifyInput = document.getElementById('verify-code-input');
  const verifyError = document.getElementById('verify-error');
  const verifyBtn = document.getElementById('verify-btn');
  const cancelVerifyBtn = document.getElementById('cancel-verify-btn');

  verifyBtn.onclick = async () => {
    const email = verifyModal.dataset.email || document.getElementById('email').value.trim();
    const code = verifyInput.value.trim();
    if (!code) {
      verifyError.textContent = 'Enter the code sent to your email.';
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
        verifyError.textContent = data.error || 'Verification failed.';
        return;
      }
      verifyError.style.color = 'green';
      verifyError.textContent = 'Verification successful! You can now log in.';
      setTimeout(() => {
        verifyModal.style.display = 'none';
        loginModal.style.display = 'flex';
        loginBox.style.display = 'block';
        verifyError.textContent = '';
        verifyError.style.color = '';
        verifyInput.value = '';
      }, 1500);
    } catch (err) {
      verifyError.textContent = 'Network error.';
    }
  };

  cancelVerifyBtn.onclick = () => {
    verifyModal.style.display = 'none';
    loginModal.style.display = 'flex';
    loginBox.style.display = 'block';
    verifyError.textContent = '';
    verifyInput.value = '';
  };

  // --- Dynamic Area Select ---
  const areaOptions = {
    Lagos: ['Ikeja', 'Lekki', 'Yaba', 'Surulere'],
    Ogun: ['Abeokuta', 'Ijebu Ode', 'Sango Ota'],
    Oyo: ['Ibadan', 'Ogbomosho'],
    Osun: ['Osogbo', 'Ile-Ife'],
    Ondo: ['Akure', 'Ondo Town'],
    Ekiti: ['Ado Ekiti', 'Ikere']
  };
  regState.onchange = () => {
    regArea.innerHTML = '<option value="">Select Area</option>';
    (areaOptions[regState.value] || []).forEach(area =>
      regArea.innerHTML += `<option value="${area}">${area}</option>`
    );
  };

  // --- Notification Modal ---
  notifBtn.onclick = () => {
    renderNotifications();
    notifModal.style.display = 'flex';
  };
  notifModal.querySelector('.close-btn').onclick = () => {
    notifModal.style.display = 'none';
  };

  // --- Customer Care Chat (with admin reply support) ---
  let careChatOpen = false;

  // Load chat history from backend
  async function loadChatHistory() {
    if (!currentUser) return;
    try {
      const res = await fetch(`${API_BASE}/api/chat?email=${encodeURIComponent(currentUser.email)}`);
      const data = await res.json();
      careChatMessages.innerHTML = '';
      (data.chat || []).forEach(m => {
        if (m.from === 'user') {
          careChatMessages.innerHTML += `<div style="text-align:right;margin-bottom:6px;"><span style="background:#e0e7ff;padding:6px 12px;border-radius:8px;color:#1a237e;">${m.msg}</span></div>`;
        } else {
          careChatMessages.innerHTML += `<div style="text-align:left;margin-bottom:6px;"><span style="background:#f4f6fa;padding:6px 12px;border-radius:8px;color:#3949ab;">Admin: ${m.msg}</span></div>`;
        }
      });
      careChatMessages.scrollTop = careChatMessages.scrollHeight;
    } catch {}
  }

  if (!document.getElementById('care-chat-float')) {
    const floatBtn = document.createElement('button');
    floatBtn.id = 'care-chat-float';
    floatBtn.innerHTML = '<img src="images/customer-care.jpg" alt="Care" style="width:32px;height:32px;border-radius:50%;">';
    floatBtn.style.cssText = 'position:fixed;bottom:100px;right:30px;background:#2ecc71;border:none;border-radius:50%;width:56px;height:56px;box-shadow:0 2px 8px rgba(0,0,0,0.18);z-index:10003;cursor:pointer;';
    document.body.appendChild(floatBtn);
    floatBtn.onclick = () => {
      careChatModal.style.display = 'flex';
      careChatOpen = true;
      loadChatHistory();
    };
  }
  careChatModal.querySelector('button').onclick = () => {
    careChatModal.style.display = 'none';
    careChatOpen = false;
  };
  careChatForm.onsubmit = async (e) => {
    e.preventDefault();
    const msg = careChatInput.value.trim();
    if (!msg || !currentUser) return;
    // Send to backend
    await fetch(`${API_BASE}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: currentUser.email, msg })
    });
    careChatInput.value = '';
    await loadChatHistory();
  };

  // --- Gadget Modal (Buy Now/Details) ---
  window.openGadgetModal = function(item) {
    modalContent.innerHTML = `
      <img src="${item.img}" alt="${item.name}" onerror="this.onerror=null;this.src='images/placeholder.png';">
      <h2>${item.name}</h2>
      <p>${item.price}</p>
      <p>${item.desc}</p>
      <button id="buy-now-btn" style="background:#3949ab;color:#fff;border:none;padding:10px 20px;border-radius:8px;font-weight:700;cursor:pointer;margin-top:10px;">Buy Now</button>
      <button class="close-btn" style="position:absolute;top:12px;right:18px;font-size:1.7em;background:none;border:none;color:#888;cursor:pointer;">&times;</button>
      <div id="buy-options" style="margin-top:18px;"></div>
    `;
    modalBg.style.display = 'flex';
    modalContent.querySelector('.close-btn').onclick = () => modalBg.style.display = 'none';

    // Buy Now logic
    modalContent.querySelector('#buy-now-btn').onclick = () => {
      const buyOptions = modalContent.querySelector('#buy-options');
      buyOptions.innerHTML = `
        <div style="margin-bottom:12px;">
          <button id="pickup-btn" style="background:#2ecc71;color:#fff;border:none;padding:10px 18px;border-radius:8px;font-weight:700;cursor:pointer;margin-right:8px;">Pick Up</button>
          <button id="delivery-btn" style="background:#3949ab;color:#fff;border:none;padding:10px 18px;border-radius:8px;font-weight:700;cursor:pointer;">Delivery</button>
        </div>
        <div id="buy-extra"></div>
      `;
      // Pick Up
      buyOptions.querySelector('#pickup-btn').onclick = () => {
        let storeAddress = "Ikeja Lagos";
        let storeText = "Visit our Ikeja, Lagos store to pick up your gadget!";
        if (currentUser && currentUser.address) {
          storeAddress = encodeURIComponent(currentUser.address);
          storeText = `Visit our store near: <b>${currentUser.address}</b> to pick up your gadget!`;
        }
        buyOptions.querySelector('#buy-extra').innerHTML = `
          <div style="margin-top:10px;">
            <strong>Pick Up Location:</strong>
            <div style="margin:8px 0;">
              <iframe
                src="https://www.google.com/maps?q=${storeAddress}&output=embed"
                width="100%" height="200" style="border:0;border-radius:8px;"
                allowfullscreen="" loading="lazy" referrerpolicy="no-referrer-when-downgrade"></iframe>
            </div>
            <div style="color:#3949ab;font-size:0.98em;">${storeText}</div>
            <button id="confirm-pickup-btn" style="margin-top:12px;background:#3949ab;color:#fff;border:none;padding:10px 18px;border-radius:8px;font-weight:700;cursor:pointer;">Confirm Order</button>
            <div id="pickup-success" style="color:#2ecc71;margin-top:8px;"></div>
          </div>
        `;
        buyOptions.querySelector('#confirm-pickup-btn').onclick = async () => {
          // Send order to admin
          const order = {
            email: currentUser.email,
            item,
            type: 'pickup',
            address: currentUser.address,
            action: 'confirm'
          };
          addNotification(`Order sent for pick up: ${item.name}`, 'order');
          document.getElementById('pickup-success').textContent = "Order sent! Awaiting admin action.";
          await sendOrderToAdmin(order);
        };
      };
      // Delivery
      buyOptions.querySelector('#delivery-btn').onclick = () => {
        if (currentUser && currentUser.address) {
          const deliveryAddress = currentUser.address;
          buyOptions.querySelector('#buy-extra').innerHTML = `
            <div style="margin-top:10px;">
              <strong>Delivery Address:</strong>
              <div style="margin:8px 0;">
                <iframe
                  src="https://www.google.com/maps?q=${encodeURIComponent(deliveryAddress)}&output=embed"
                  width="100%" height="200" style="border:0;border-radius:8px;"
                  allowfullscreen="" loading="lazy" referrerpolicy="no-referrer-when-downgrade"></iframe>
              </div>
              <div style="color:#3949ab;font-size:0.98em;">Your registered address: <b>${deliveryAddress}</b></div>
              <button id="confirm-delivery-btn" style="margin-top:12px;background:#2ecc71;color:#fff;border:none;padding:10px 18px;border-radius:8px;font-weight:700;cursor:pointer;">Confirm Order</button>
              <div id="delivery-success" style="color:#2ecc71;margin-top:8px;"></div>
            </div>
          `;
          buyOptions.querySelector('#confirm-delivery-btn').onclick = async () => {
            const order = {
              email: currentUser.email,
              item,
              type: 'delivery',
              address: deliveryAddress,
              action: 'confirm'
            };
            addNotification(`Order sent for delivery: ${item.name}`, 'order');
            document.getElementById('delivery-success').textContent = "Order sent! Awaiting admin action.";
            await sendOrderToAdmin(order);
          };
        } else {
          // No address, ask for it
          buyOptions.querySelector('#buy-extra').innerHTML = `
            <form id="delivery-form" style="margin-top:10px;text-align:left;">
              <label>Enter your delivery address:<br>
                <input id="delivery-address-input" type="text" required style="width:100%;padding:6px;border-radius:6px;border:1px solid #b3b8e0;">
              </label><br>
              <button type="submit" style="background:#2ecc71;color:#fff;border:none;padding:10px 18px;border-radius:8px;font-weight:700;cursor:pointer;margin-top:8px;">Show Map</button>
            </form>
            <div id="delivery-map"></div>
            <div id="delivery-success" style="color:#2ecc71;margin-top:8px;"></div>
          `;
          buyOptions.querySelector('#delivery-form').onsubmit = async function(e) {
            e.preventDefault();
            const addr = document.getElementById('delivery-address-input').value.trim();
            if (!addr) return;
            document.getElementById('delivery-map').innerHTML = `
              <div style="margin:10px 0;">
                <iframe
                  src="https://www.google.com/maps?q=${encodeURIComponent(addr)}&output=embed"
                  width="100%" height="200" style="border:0;border-radius:8px;"
                  allowfullscreen="" loading="lazy" referrerpolicy="no-referrer-when-downgrade"></iframe>
              </div>
              <div style="color:#3949ab;font-size:0.98em;">Delivery address: <b>${addr}</b></div>
              <button id="confirm-delivery-btn" style="margin-top:12px;background:#2ecc71;color:#fff;border:none;padding:10px 18px;border-radius:8px;font-weight:700;cursor:pointer;">Confirm Order</button>
            `;
            document.getElementById('delivery-success').textContent = "";
            document.getElementById('confirm-delivery-btn').onclick = async () => {
              const order = {
                email: currentUser.email,
                item,
                type: 'delivery',
                address: addr,
                action: 'confirm'
              };
              addNotification(`Order sent for delivery: ${item.name}`, 'order');
              document.getElementById('delivery-success').textContent = "Order sent! Awaiting admin action.";
              await sendOrderToAdmin(order);
            };
            this.reset();
          };
        }
      };
    };
  };
  modalBg.onclick = (e) => {
    if (e.target === modalBg) modalBg.style.display = 'none';
  };

  // --- Fetch Gadget Data from Backend & Render ---
  let phones = [], laptops = [], accessories = [];
  async function fetchGadgets() {
    try {
      const res = await fetch(`${API_BASE}/api/gadgets`);
      const data = await res.json();
      phones = data.phones;
      laptops = data.laptops;
      accessories = data.accessories;
      renderGadgets(phones, 'phones-list');
      renderGadgets(laptops, 'laptops-list');
      renderGadgets(accessories, 'accessories-list');
    } catch (err) {
      // handle error
    }
  }

  function renderGadgets(list, containerId) {
    const container = document.getElementById(containerId);
    container.innerHTML = '';
    list.forEach(item => {
      const div = document.createElement('div');
      div.className = 'Gadget-item';
      div.innerHTML = `
        <img src="${item.img}" alt="${item.name}" onerror="this.onerror=null;this.src='images/placeholder.png';">
        <h2>${item.name}</h2>
        <p>${item.price}</p>
        <div class="button-group">
          <button class="buy-now-btn" style="background:#3949ab;color:#fff;border:none;padding:10px 20px;border-radius:8px;font-weight:700;cursor:pointer;">Buy Now</button>
        </div>
      `;
      div.querySelector('.buy-now-btn').onclick = () => openGadgetModal(item);
      container.appendChild(div);
    });
  }

  // --- Search Functionality (Basic) ---
  const searchInput = document.getElementById('search-input');
  const searchBtn = document.getElementById('search-btn');
  searchBtn.onclick = () => {
    const q = searchInput.value.trim().toLowerCase();
    filterGadgets(q);
  };

  function filterGadgets(query) {
    renderGadgets(
      phones.filter(p => p.name.toLowerCase().includes(query)), 'phones-list'
    );
    renderGadgets(
      laptops.filter(l => l.name.toLowerCase().includes(query)), 'laptops-list'
    );
    renderGadgets(
      accessories.filter(a => a.name.toLowerCase().includes(query)), 'accessories-list'
    );
  }

  // --- Order/Notification Logic ---
  async function sendOrderToAdmin(order) {
    try {
      // Send order to backend (admin)
      const res = await fetch(`${API_BASE}/api/order`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(order)
      });
      const data = await res.json();
      if (data && data.success) {
        // Wait for admin action (simulate polling)
        pollAdminAction(order);
      }
    } catch (err) {
      addNotification('Failed to send order to admin.', 'error');
    }
  }

  // Poll for admin action (simulate with polling every 5s)
  function pollAdminAction(order) {
    let interval = setInterval(async () => {
      try {
        const res = await fetch(`${API_BASE}/api/order-status?email=${encodeURIComponent(order.email)}&item=${encodeURIComponent(order.item.name)}`);
        const data = await res.json();
        if (data && data.status && data.status !== 'pending') {
          clearInterval(interval);
          // Sync notifications from backend after admin action
          await syncNotificationsFromBackend();
          if (data.status === 'confirmed') {
            addNotification(`Admin confirmed your order for ${order.item.name}.`, 'admin');
          } else if (data.status === 'rejected') {
            addNotification(`Admin rejected your order for ${order.item.name}.`, 'admin');
          }
          renderNotifications();
        }
      } catch (err) {
        // ignore polling error
      }
    }, 5000);
  }

  // Fetch order notifications on login
  async function fetchOrderNotifications() {
    await syncNotificationsFromBackend();
  }

  // Initial render
  fetchGadgets();

  // --- ADDITIONAL: Handle missing images gracefully ---
  // This will replace all broken images with a placeholder after DOM is loaded
  document.querySelectorAll('img').forEach(img => {
    img.onerror = function() {
      this.onerror = null;
      this.src = 'images/placeholder.png';
    };
  });
});