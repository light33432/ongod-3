const express = require('express');
const cors = require('cors');
const path = require('path');
const nodemailer = require('nodemailer');

const app = express();
app.use(cors());
app.use(express.json());

// Serve static files from 'public' folder
app.use(express.static(path.join(__dirname, 'public')));

// Serve images statically
app.use('/images', express.static(path.join(__dirname, 'images')));

// In-memory users: { email, username, password, verified, code }
const users = [];

// Use environment variables for Gmail credentials
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.GMAIL_USER, // set in Render dashboard
    pass: process.env.GMAIL_PASS  // set in Render dashboard
  }
});

// Register endpoint
app.post('/api/register', async (req, res) => {
  const { email, username, password } = req.body;
  if (!email || !username || !password) return res.status(400).json({ error: 'All fields required.' });
  if (users.find(u => u.email === email)) return res.status(400).json({ error: 'Email already registered.' });
  const code = Math.floor(100000 + Math.random() * 900000).toString();
  users.push({ email, username, password, verified: false, code });
  try {
    await transporter.sendMail({
      from: `ONGOD Gadget Shop <${process.env.GMAIL_USER}>`,
      to: email,
      subject: 'ONGOD Gadget Shop Verification Code',
      text: `Your verification code is: ${code}`
    });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to send email.' });
  }
});

// Verify code endpoint
app.post('/api/verify', (req, res) => {
  const { email, code } = req.body;
  const user = users.find(u => u.email === email);
  if (!user) return res.status(400).json({ error: 'User not found.' });
  if (user.verified) return res.status(400).json({ error: 'Already verified.' });
  if (user.code !== code) return res.status(400).json({ error: 'Invalid code.' });
  user.verified = true;
  res.json({ success: true });
});

// Login endpoint
app.post('/api/login', (req, res) => {
  const { email, password } = req.body;
  const user = users.find(u => u.email === email);
  if (!user) return res.status(400).json({ error: 'User not found.' });
  if (!user.verified) return res.status(400).json({ error: 'Email not verified.' });
  if (user.password !== password) return res.status(400).json({ error: 'Incorrect password.' });
  res.json({ success: true, username: user.username });
});

// In-memory product data
let products = [
  {
    id: 1,
    name: 'iPhone 15 Pro',
    price: '₦1,200,000',
    image: '/images/iphone15.png',
    desc: 'Latest Apple flagship.'
  },
  {
    id: 2,
    name: 'Samsung S24 Ultra',
    price: '₦1,100,000',
    image: '/images/Samsung4.jpg',
    desc: 'Top Samsung phone.'
  },
  {
    id: 3,
    name: 'MacBook 2025 Pro',
    price: '₦1,500,000',
    image: '/images/Mackbook.webp',
    desc: 'Apple M3 chip.'
  }
];

// In-memory orders: { id, userEmail, productId, type, status, createdAt }
let orders = [];
let orderIdCounter = 1;

// Helper to generate unique IDs
function getNextId() {
  return products.length ? Math.max(...products.map(p => p.id)) + 1 : 1;
}

// Get all products
app.get('/api/products', (req, res) => {
  res.json(products);
});

// Get a single product by id
app.get('/api/products/:id', (req, res) => {
  const id = parseInt(req.params.id);
  const product = products.find(p => p.id === id);
  if (!product) {
    return res.status(404).json({ error: 'Product not found.' });
  }
  res.json(product);
});

// Add a new product
app.post('/api/products', (req, res) => {
  const { name, price, image, desc } = req.body;
  if (!name || !price || !image || !desc) {
    return res.status(400).json({ error: 'All fields (name, price, image, desc) are required.' });
  }
  const newProduct = {
    id: getNextId(),
    name,
    price,
    image,
    desc
  };
  products.push(newProduct);
  res.status(201).json(newProduct);
});

// Update a product by id
app.put('/api/products/:id', (req, res) => {
  const id = parseInt(req.params.id);
  const idx = products.findIndex(p => p.id === id);
  if (idx === -1) {
    return res.status(404).json({ error: 'Product not found.' });
  }
  const { name, price, image, desc } = req.body;
  if (!name || !price || !image || !desc) {
    return res.status(400).json({ error: 'All fields (name, price, image, desc) are required.' });
  }
  products[idx] = { id, name, price, image, desc };
  res.json(products[idx]);
});

// Delete a product by id
app.delete('/api/products/:id', (req, res) => {
  const id = parseInt(req.params.id);
  const idx = products.findIndex(p => p.id === id);
  if (idx === -1) {
    return res.status(404).json({ error: 'Product not found.' });
  }
  const deleted = products.splice(idx, 1)[0];
  res.json({ message: 'Product deleted.', product: deleted });
});

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

// 404 handler for unknown routes
app.use((req, res) => {
  res.status(404).json({ error: 'Endpoint not found.' });
});

// Place an order
app.post('/api/order', (req, res) => {
  const { userEmail, productId, type } = req.body;
  if (!userEmail || !productId || !type) {
    return res.status(400).json({ error: 'userEmail, productId, and type are required.' });
  }
  const user = users.find(u => u.email === userEmail);
  if (!user || !user.verified) {
    return res.status(400).json({ error: 'User not found or not verified.' });
  }
  const product = products.find(p => p.id === productId);
  if (!product) {
    return res.status(400).json({ error: 'Product not found.' });
  }
  const order = {
    id: orderIdCounter++,
    userEmail,
    productId,
    type, // 'pick' or 'deliver'
    status: 'pending',
    createdAt: new Date().toISOString()
  };
  orders.push(order);
  res.json({ success: true, order });
});

// Admin: confirm order
app.post('/api/order/confirm', (req, res) => {
  const { orderId } = req.body;
  const order = orders.find(o => o.id === orderId);
  if (!order) return res.status(404).json({ error: 'Order not found.' });
  order.status = 'confirmed';
  // Optionally, send email to user
  res.json({ success: true, order });
});

// Admin: reject order
app.post('/api/order/reject', (req, res) => {
  const { orderId } = req.body;
  const order = orders.find(o => o.id === orderId);
  if (!order) return res.status(404).json({ error: 'Order not found.' });
  order.status = 'rejected';
  // Optionally, send email to user
  res.json({ success: true, order });
});

// Get all orders (admin)
app.get('/api/orders', (req, res) => {
  res.json(orders);
});

// Product upgrade endpoint (simulate upgrade every 10 weeks)
app.post('/api/products/upgrade', (req, res) => {
  // For demo: update all product descriptions with an upgrade note
  const now = new Date();
  products = products.map(p => ({
    ...p,
    desc: p.desc + ' (Upgraded on ' + now.toISOString().slice(0, 10) + ')'
  }));
  res.json({ success: true, products });
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});