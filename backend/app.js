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

// DEFINITIEVE BESTELLING (enkelvoudig, blijft staan voor compatibiliteit)
app.post('/api/order/finalize', async (req, res) => {
  const { order_id, definitief, email_leverancier } = req.body;
  try {
    await db.execute({
      sql: `UPDATE bestellingen SET definitief = ? WHERE id = ?`,
      args: [definitief, order_id]
    });

    const orderRes = await db.execute({
      sql: `SELECT p.naam, b.week FROM bestellingen b JOIN producten p ON p.id = b.product_id WHERE b.id = ?`,
      args: [order_id]
    });
    const row = orderRes.rows[0];
    if (!row) return res.status(404).json({ error: 'Bestelling niet gevonden' });

    await sendOrderMail(email_leverancier, `Bestelling week ${row.week}`, `Product: ${row.naam}\nBestelde hoeveelheid: ${definitief}`);

    await db.execute({
      sql: `UPDATE bestellingen SET verstuurd = 1 WHERE id = ?`,
      args: [order_id]
    });

    res.json({ status: 'ok' });
  } catch (err) {
    console.error('FOUT bij finalize:', err);
    res.status(500).json({ error: 'Mail versturen mislukt', details: err.message });
  }
});

// DEFINITIEVE BESTELLING - ALLES IN ÉÉN MAIL, MET DUBBELE-WEEK CHECK
app.post('/api/order/finalize-all', async (req, res) => {
  const { orders, email_leverancier, week } = req.body;
  // orders = [{ order_id, definitief }, ...]
  try {
    if (!Array.isArray(orders) || orders.length === 0) {
      return res.status(400).json({ error: 'Geen bestellingen meegegeven' });
    }

    const checkRes = await db.execute({
      sql: `SELECT COUNT(*) as aantal FROM bestellingen WHERE week = ? AND verstuurd = 1`,
      args: [week]
    });
    if (checkRes.rows[0].aantal > 0) {
      return res.status(409).json({ error: `Week ${week} is al verstuurd. Dubbele bestelling niet toegelaten.` });
    }

    const regels = [];

    for (const o of orders) {
      await db.execute({
        sql: `UPDATE bestellingen SET definitief = ? WHERE id = ?`,
        args: [o.definitief, o.order_id]
      });

      const orderRes = await db.execute({
        sql: `SELECT p.naam FROM bestellingen b JOIN producten p ON p.id = b.product_id WHERE b.id = ?`,
        args: [o.order_id]
      });
      const row = orderRes.rows[0];
      if (row) {
        regels.push(`${row.naam}: ${o.definitief}`);
      }
    }

    const tekst = `Bestelling week ${week}\n\n${regels.join('\n')}`;
    await sendOrderMail(email_leverancier, `Bestelling week ${week}`, tekst);

    for (const o of orders) {
      await db.execute({
        sql: `UPDATE bestellingen SET verstuurd = 1 WHERE id = ?`,
        args: [o.order_id]
      });
    }

    res.json({ status: 'ok', aantal: regels.length });
  } catch (err) {
    console.error('FOUT bij finalize-all:', err);
    res.status(500).json({ error: 'Mail versturen mislukt', details: err.message });
  }
});

// OPNIEUW VERSTUREN (zelfde week, mail bevat melding "reeds verstuurd")
app.post('/api/order/resend', async (req, res) => {
  const { week, email_leverancier } = req.body;
  try {
    const result = await db.execute({
      sql: `SELECT p.naam, b.definitief FROM bestellingen b JOIN producten p ON p.id = b.product_id WHERE b.week = ? AND b.verstuurd = 1`,
      args: [week]
    });

    if (result.rows.length === 0) {
      return res.status(404).json({ error: `Geen verstuurde bestelling gevonden voor week ${week}` });
    }

    const regels = result.rows.map(r => `${r.naam}: ${r.definitief}`);
    const tekst = `⚠️ REEDS VERSTUURD — dit is een herhaling van bestelling week ${week}\n\n${regels.join('\n')}`;

    await sendOrderMail(email_leverancier, `[REEDS VERSTUURD] Bestelling week ${week}`, tekst);

    res.json({ status: 'ok', aantal: regels.length });
  } catch (err) {
    console.error('FOUT bij resend:', err);
