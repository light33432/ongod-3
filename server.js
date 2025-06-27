const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const nodemailer = require('nodemailer');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// TEMP in-memory stores
const users = {};
const codes = {};
const products = [
  {
    name: "iPhone 14",
    price: "₦850,000",
    desc: "Apple iPhone 14 with A15 Bionic",
    image: "/images/iphone14.png"
  },
  {
    name: "HP Spectre x360",
    price: "₦650,000",
    desc: "2-in-1 convertible laptop",
    image: "/images/hp-spectre.png"
  },
  {
    name: "AirPods Pro",
    price: "₦150,000",
    desc: "Wireless earbuds with ANC",
    image: "/images/airpods.png"
  }
];

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'public'))); // for product images

// Fake email sender (simulate code send)
function sendCodeEmail(email, code) {
  console.log(`Sending code ${code} to ${email}`);
  // Here you can use nodemailer or any EmailJS integration
  // For demo, we only log
}

// Routes
app.post('/api/register', (req, res) => {
  const { email, username, password, state, area, street, address } = req.body;
  if (users[email]) {
    return res.status(400).json({ error: 'Email already registered.' });
  }
  const code = Math.floor(100000 + Math.random() * 900000).toString();
  users[email] = { email, username, password, state, area, street, address, verified: false };
  codes[email] = code;
  sendCodeEmail(email, code);
  return res.json({ success: true });
});

app.post('/api/verify', (req, res) => {
  const { email, code } = req.body;
  if (!users[email] || codes[email] !== code) {
    return res.status(400).json({ error: 'Invalid code.' });
  }
  users[email].verified = true;
  delete codes[email];
  return res.json({ success: true });
});

app.post('/api/login', (req, res) => {
  const { email, password } = req.body;
  const user = users[email];
  if (!user) return res.status(400).json({ error: 'Email not registered.' });
  if (!user.verified) return res.status(400).json({ error: 'Email not verified.' });
  if (user.password !== password) return res.status(400).json({ error: 'Incorrect password.' });
  return res.json({ user });
});

app.get('/api/products', (req, res) => {
  res.json(products);
});

// Serve frontend (optional fallback if you're not using Vercel routes)
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
