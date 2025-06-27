const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
app.use(cors());
app.use(express.json());

// Serve static frontend files (e.g., index.html, JS, CSS, images)
app.use(express.static(path.join(__dirname, 'public')));

// --- DUMMY PRODUCTS API ---
app.get('/api/products', (req, res) => {
  res.json([
    {
      name: "iPhone 13",
      price: "₦450,000",
      image: "/images/iphone.jpg",
      desc: "Latest Apple phone."
    },
    {
      name: "HP Spectre x360",
      price: "₦560,000",
      image: "/images/spectre.jpg",
      desc: "Convertible laptop."
    },
    {
      name: "AirPods Pro",
      price: "₦90,000",
      image: "/images/airpods.jpg",
      desc: "Wireless earphones."
    }
  ]);
});

// --- USER REGISTRATION (dummy logic) ---
app.post('/api/register', (req, res) => {
  const { email, username, password, state, area, street, address } = req.body;
  console.log("Register Request:", { email, username });
  // TODO: Save to database and send verification code via email
  res.json({ message: "Registered successfully" });
});

// --- LOGIN (dummy logic) ---
app.post('/api/login', (req, res) => {
  const { email, password } = req.body;
  console.log("Login Request:", { email });
  // TODO: Validate user
  res.json({ message: "Logged in successfully" });
});

// --- VERIFICATION (dummy logic) ---
app.post('/api/verify', (req, res) => {
  const { email, code } = req.body;
  console.log("Verification Request:", { email, code });
  // TODO: Check if code matches
  res.json({ message: "Verified successfully" });
});

// --- CATCH-ALL for SPA (client-side routing fallback) ---
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// --- START SERVER ---
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT}`);
});
