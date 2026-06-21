const express = require('express');
const cors = require('cors');
const { db, initDb } = require('./db');
const { sendOrderMail } = require('./mail');

const app = express();
app.use(cors());
app.use(express.json());

app.use((req, res, next) => {
  console.log(`${req.method} ${req.path}`);
  next();
});

// LOGIN
app.post('/api/login', (req, res) => {
  const { username, password } = req.body;
  const correctUser = process.env.APP_USER || 'admin';
  const correctPass = process.env.APP_PASS || 'changeme';
  if (username === correctUser && password === correctPass) {
    res.json({ success: true });
  } else {
    res.status(401).json({ success: false });
  }
});

// PRODUCTEN
app.get('/api/products', async (req, res) => {
  try {
    const result = await db.execute('SELECT * FROM producten ORDER BY naam');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// STOCK INGAVE
app.post('/api/stock', async (req, res) => {
  const { product_id, week, stock_aanvang, stock_einde } = req.body;
  try {
    await db.execute({
      sql: `INSERT INTO week_stock (product_id, week, stock_aanvang, stock_einde) VALUES (?, ?, ?, ?)`,
      args: [product_id, week, stock_aanvang, stock_einde]
    });
    const verbruik = stock_aanvang - stock_einde;
    await db.execute({
      sql: `INSERT INTO verbruik (product_id, week, hoeveelheid) VALUES (?, ?, ?)`,
      args: [product_id, week, verbruik]
    });
    res.json({ verbruik });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// BESTELVOORSTEL
app.post('/api/order/proposal', async (req, res) => {
  const { product_id, week } = req.body;
  try {
    const productRes = await db.execute({
      sql: `SELECT minimum_stock FROM producten WHERE id = ?`,
      args: [product_id]
    });
    const product = productRes.rows[0];
    if (!product) return res.status(404).json({ error: 'Product niet gevonden' });

    const stockRes = await db.execute({
      sql: `SELECT stock_einde FROM week_stock WHERE product_id = ? AND week = ? ORDER BY id DESC LIMIT 1`,
      args: [product_id, week]
    });
    const stockRow = stockRes.rows[0];
    if (!stockRow) return res.status(404).json({ error: 'Stock niet gevonden voor deze week' });

    const voorstel = Math.max(product.minimum_stock - stockRow.stock_einde, 0);

    const insertRes = await db.execute({
      sql: `INSERT INTO bestellingen (product_id, week, voorstel) VALUES (?, ?, ?)`,
      args: [product_id, week, voorstel]
    });

    res.json({ id: Number(insertRes.lastInsertRowid), voorstel });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Helper: zet automatisch de beginstock van volgende week = eindstock huidige week + bestelde hoeveelheid
async function updateVolgendeWeekBeginstock(week) {
  const ordersRes = await db.execute({
    sql: `SELECT product_id, definitief FROM bestellingen WHERE week = ? AND verstuurd = 1`,
    args: [week]
  });

  const overgeslagen = [];

  for (const order of ordersRes.rows) {
    const eindstockRes = await db.execute({
      sql:
