const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();

app.use(cors());
app.use(express.json());

// ── Routes ────────────────────────────────────────────────────────────────────
app.use('/auth', require('./routes/auth'));
app.use('/categories', require('./routes/categories'));
app.use('/game', require('./routes/game'));
app.use('/admin/auth', require('./routes/adminAuth'));
app.use('/admin/multiplayer', require('./routes/adminMultiplayer'));
app.use('/admin', require('./routes/admin'));
app.use('/multiplayer', require('./routes/multiplayer'));
app.use('/config', require('./routes/appConfig'));

app.get('/health', (_req, res) => res.json({ status: 'ok', ts: new Date().toISOString() }));

// ── Global error handler ──────────────────────────────────────────────────────
// eslint-disable-next-line no-unused-vars
app.use((err, _req, res, _next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Internal server error' });
});

module.exports = app;
