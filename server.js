const express = require('express');
const cors = require('cors');
const nodemailer = require('nodemailer');
const path = require('path');
const jwt = require('jsonwebtoken');
const app = express();
app.use(cors());
app.use(express.json());

const JWT_SECRET = 'your_super_secret_key'; // Change this to a strong secret in production

// Serve images statically from /images
app.use('/images', express.static(path.join(__dirname, 'images')));

// Serve admin static files (for order.mp3 and admin panel assets)
app.use('/admin', express.static(path.join(__dirname, 'admin')));

// Serve static files from root (for index.html, script.js, etc.)
app.use(express.static(__dirname));

let users = [];
let gadgets = {
  phones: [
    { name: 'iPhone 15 Pro', price: '₦1,200,000', img: 'images/iphone15.png', desc: 'Latest Apple flagship.' },
    { name: 'Samsung S24 Ultra', price: '₦1,100,000', img: 'images/s24ultra.png', desc: 'Top Samsung phone.' }
  ],
  laptops: [
    { name: 'MacBook Air M3', price: '₦1,500,000', img: 'images/macbookairm3.png', desc: 'Apple M3 chip.' },
    { name: 'HP Spectre x360', price: '₦950,000', img: 'images/hpspectre.png', desc: 'Premium 2-in-1.' }
  ],
  accessories: [
    { name: 'AirPods Pro', price: '₦180,000', img: 'images/airpodspro.png', desc: 'Noise-cancelling earbuds.' },
    { name: 'Anker Power Bank', price: '₦35,000', img: 'images/ankerpowerbank.png', desc: 'Fast charging.' }
  ]
};

// Store orders and their statuses in memory
let orders = [];

// Store notification history in memory (per user)
let notifications = {};

// Store chat messages in memory (per user)
let chats = {}; // { userEmail: [{from, msg, time}] }

// Setup nodemailer transporter (use your real credentials in production)
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.MAIL_USER || 'laptopgadgetsphonegadgets@gmail.com',
    pass: process.env.MAIL_PASS || 'myzr ajbr ityh vzlb'
  }
});

// Helper to generate a 6-digit code
function generateCode() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// Helper to add notification for a user
function addNotification(email, msg, type = 'info') {
  if (!notifications[email]) notifications[email] = [];
  notifications[email].push({
    msg,
    type,
    time: new Date().toLocaleString()
  });
}

// --- ADD PRODUCT ENDPOINT ---
app.post('/api/add-product', (req, res) => {
  const { category, name, price, img, desc } = req.body;
  if (!category || !name || !price || !img || !desc) {
    return res.status(400).json({ error: 'Missing fields' });
  }
  if (!gadgets[category]) return res.status(400).json({ error: 'Invalid category' });
  if (gadgets[category].find(p => p.name === name)) {
    return res.status(400).json({ error: 'Product already exists' });
  }
  gadgets[category].push({ name, price, img, desc });
  res.json({ success: true });
});

// --- DELETE PRODUCT ENDPOINT ---
app.post('/api/delete-product', (req, res) => {
  const { category, name } = req.body;
  if (!category || !name) return res.status(400).json({ error: 'Missing data' });
  if (!gadgets[category]) return res.status(400).json({ error: 'Invalid category' });
  const idx = gadgets[category].findIndex(p => p.name === name);
  if (idx !== -1) {
    gadgets[category].splice(idx, 1);
    return res.json({ success: true });
  }
  res.status(404).json({ error: 'Product not found' });
});

// Register endpoint with email verification code
app.post('/api/register', async (req, res) => {
  const { email, password, ...rest } = req.body;
  if (users.find(u => u.email === email)) {
    return res.status(400).json({ error: 'Email already registered.' });
  }
  const code = generateCode();
  users.push({ email, password, ...rest, verified: false, code });
  // Send code to email
  try {
    await transporter.sendMail({
      from: 'ONGOD PHONE GADGET <laptopgadgetsphonegadgets@gmail.com>', // Only show business name and email
      to: email,
      subject: 'ONGOD Phone Gadget Verification Code',
      text: `Your verification code is: ${code}`
    });
    res.json({ success: true, message: 'Verification code sent to email.' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to send verification email.' });
  }
});

// Verify code endpoint (improved feedback)
app.post('/api/verify', (req, res) => {
  const { email, code } = req.body;
  const user = users.find(u => u.email === email);
  if (!user) return res.status(400).json({ error: 'User not found.' });
  if (user.verified) return res.status(400).json({ error: 'User already verified.' });
  if (user.code !== code) return res.status(400).json({ error: 'Invalid code.' });
  user.verified = true;
  res.json({ success: true, message: 'Verification successful.' });
});

// Login endpoint (returns JWT token)
app.post('/api/login', (req, res) => {
  const { email, password } = req.body;
  const user = users.find(u => u.email === email && u.password === password);
  if (!user) return res.status(401).json({ error: 'Invalid credentials.' });
  if (!user.verified) return res.status(403).json({ error: 'Please verify your email.' });
  // Create JWT token
  const token = jwt.sign({ email: user.email }, JWT_SECRET, { expiresIn: '7d' });
  res.json({ user, token });
});

// Middleware to authenticate JWT token
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'No token provided.' });
  jwt.verify(token, JWT_SECRET, (err, decoded) => {
    if (err) return res.status(403).json({ error: 'Invalid token.' });
    req.user = decoded;
    next();
  });
}

// Add /api/me endpoint for frontend compatibility (requires token)
app.get('/api/me', authenticateToken, (req, res) => {
  const user = users.find(u => u.email === req.user.email);
  if (!user) return res.status(404).json({ error: 'User not found.' });
  res.json({ user });
});

// Get gadgets endpoint (for frontend)
app.get('/api/gadgets', (req, res) => {
  res.json(gadgets);
});

// --- CUSTOMER CARE CHAT ENDPOINTS ---

// User sends message
app.post('/api/chat', (req, res) => {
  const { email, msg } = req.body;
  if (!email || !msg) return res.status(400).json({ error: 'Missing data' });
  if (!chats[email]) chats[email] = [];
  chats[email].push({ from: 'user', msg, time: new Date().toLocaleString() });
  res.json({ success: true });
});

// Admin sends reply
app.post('/api/chat/admin', (req, res) => {
  const { email, msg } = req.body;
  if (!email || !msg) return res.status(400).json({ error: 'Missing data' });
  if (!chats[email]) chats[email] = [];
  chats[email].push({ from: 'admin', msg, time: new Date().toLocaleString() });
  res.json({ success: true });
});

// Get chat history
app.get('/api/chat', (req, res) => {
  const { email } = req.query;
  res.json({ chat: chats[email] || [] });
});

// Order endpoint with confirm/reject for pickup and delivery
app.post('/api/order', async (req, res) => {
  const { email, item, type, address, action } = req.body; // type: 'pickup' or 'delivery', action: 'confirm' or 'reject'
  if (!email || !item || !type || !action) {
    return res.status(400).json({ error: 'Missing order details.' });
  }
  const user = users.find(u => u.email === email);
  if (!user) return res.status(400).json({ error: 'User not found.' });

  // Save order in memory with status
  let orderIndex = orders.findIndex(
    o => o.email === email && o.item.name === item.name
  );
  if (orderIndex === -1) {
    orders.push({
      email,
      item,
      type,
      address,
      status: action === 'confirm' ? 'pending' : 'rejected'
    });
  } else {
    // Update existing order
    orders[orderIndex].status = action === 'confirm' ? 'pending' : 'rejected';
  }

  let subject = '';
  let message = '';

  if (type === 'pickup') {
    if (action === 'confirm') {
      subject = 'Order Confirmed for Pick Up';
      message = `Dear ${user.username || user.email},\n\nYour order for "${item.name}" is confirmed for pick up at our store in Ikeja, Lagos.\n\nThank you for shopping with us!\n\n- ONGOD Phone Gadget`;
      addNotification(email, `Order sent for pick up: ${item.name}`, 'order');
    } else if (action === 'reject') {
      subject = 'Order Rejected';
      message = `Dear ${user.username || user.email},\n\nYour pick up order for "${item.name}" has been rejected. Please contact support for more information.\n\n- ONGOD Phone Gadget`;
      addNotification(email, `Order rejected for pick up: ${item.name}`, 'admin');
    } else {
      return res.status(400).json({ error: 'Invalid action.' });
    }
  } else if (type === 'delivery') {
    if (action === 'confirm') {
      subject = 'Order Confirmed for Delivery';
      message = `Dear ${user.username || user.email},\n\nYour order for "${item.name}" will be delivered to: ${address || user.address}.\n\nThank you for shopping with us!\n\n- ONGOD Phone Gadget`;
      addNotification(email, `Order sent for delivery: ${item.name}`, 'order');
    } else if (action === 'reject') {
      subject = 'Order Rejected';
      message = `Dear ${user.username || user.email},\n\nYour delivery order for "${item.name}" has been rejected. Please contact support for more information.\n\n- ONGOD Phone Gadget`;
      addNotification(email, `Order rejected for delivery: ${item.name}`, 'admin');
    } else {
      return res.status(400).json({ error: 'Invalid action.' });
    }
  } else {
    return res.status(400).json({ error: 'Invalid order type.' });
  }

  // Send email to user
  try {
    await transporter.sendMail({
      from: 'ONGOD PHONE GADGET <laptopgadgetsphonegadgets@gmail.com>', // Only show business name and email
      to: email,
      subject,
      text: message
    });
    res.json({ success: true, message: `Order ${action}ed. Notification sent to user.` });
  } catch (err) {
    res.status(500).json({ error: 'Failed to send order notification email.' });
  }
});

// Update product price (for admin panel)
app.post('/api/update-price', (req, res) => {
  const { category, name, price } = req.body;
  if (!category || !name || !price) return res.status(400).json({ error: 'Missing data' });
  let found = false;
  if (gadgets[category]) {
    for (let g of gadgets[category]) {
      if (g.name === name) {
        g.price = price;
        found = true;
        break;
      }
    }
  }
  if (found) return res.json({ success: true });
  res.status(404).json({ error: 'Product not found' });
});

// Endpoint for frontend to poll order status
app.get('/api/order-status', (req, res) => {
  const { email, item } = req.query;
  if (!email || !item) return res.status(400).json({ error: 'Missing parameters.' });
  const order = orders.find(o => o.email === email && o.item.name === item);
  if (!order) return res.json({ status: 'pending' });
  res.json({ status: order.status });
});

// Get all orders (for admin panel)
app.get('/api/order-status-all', (req, res) => {
  res.json(orders);
});

// Delete order (for admin panel)
app.post('/api/delete-order', (req, res) => {
  const { email, item } = req.body;
  if (!email || !item) return res.status(400).json({ error: 'Missing data' });
  const idx = orders.findIndex(o => o.email === email && o.item && o.item.name === item);
  if (idx !== -1) {
    orders.splice(idx, 1);
    return res.json({ success: true });
  }
  res.status(404).json({ error: 'Order not found' });
});

// Get all users (for admin panel)
app.get('/api/users', (req, res) => {
  res.json(users);
});

// Delete all users (for admin panel)
app.delete('/api/users', (req, res) => {
  users = [];
  res.json({ message: 'All users deleted.' });
});

// Simulate admin action (for demo/testing)
app.post('/api/admin-action', (req, res) => {
  const { email, item, status } = req.body; // status: 'confirmed' or 'rejected'
  const order = orders.find(o => o.email === email && o.item.name === item);
  if (!order) return res.status(404).json({ error: 'Order not found.' });
  order.status = status;
  // Add notification for user
  if (status === 'confirmed') {
    addNotification(email, `Admin confirmed your order for ${order.item.name}.`, 'admin');
  } else if (status === 'rejected') {
    addNotification(email, `Admin rejected your order for ${order.item.name}.`, 'admin');
  }
  res.json({ success: true, message: `Order ${status}.` });
});

// Endpoint to get notification history for a user or all (admin)
app.get('/api/notifications', (req, res) => {
  const { email } = req.query;
  if (email) {
    return res.json({ notifications: notifications[email] || [] });
  }
  // Return all notifications for admin
  let all = [];
  for (const arr of Object.values(notifications)) all = all.concat(arr);
  res.json({ notifications: all });
});

app.listen(3000, () => console.log('Server running on port 3000'));