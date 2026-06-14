const express = require('express');
const cors = require('cors');
const db = require('./db');
const { sendOrderMail } = require('./mail');

const app = express();
app.use(cors());
app.use(express.json());

// ============================================================
// LOGIN - gebruikersnaam en wachtwoord staan HIER op de server
// Stel in via omgevingsvariabelen op Render (Environment tab)
// ============================================================
app.post('/api/login', (req, res) => {
  const { username, password } = req.body;

  const correctUser = process.env.APP_USER || 'admin';
  const correctPass = process.env.APP_PASS || 'changeme';

  if (username === correctUser && password === correctPass) {
    res.json({ success: true, token: 'loggedIn' });
  } else {
    res.status(401).json({ success: false, error: 'Foutieve gebruikersnaam of wachtwoord' });
  }
});

// producten lijst
app.get('/api/products', (req, res) => {
  db.all('SELECT * FROM producten', [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

// stock ingave
app.post('/api/stock', (req, res) => {
  const { product_id, week, stock_aanvang, stock_einde } = req.body;

  db.run(
    `INSERT INTO week_stock (product_id, week, stock_aanvang, stock_einde)
     VALUES (?, ?, ?, ?)`,
    [product_id, week, stock_aanvang, stock_einde],
    function (err) {
      if (err) return res.status(500).json({ error: err.message });

      const verbruik = stock_aanvang - stock_einde;
      db.run(
        `INSERT INTO verbruik (product_id, week, hoeveelheid)
         VALUES (?, ?, ?)`,
        [product_id, week, verbruik],
        function (err2) {
          if (err2) return res.status(500).json({ error: err2.message });
          res.json({ id: this.lastID, verbruik });
        }
      );
    }
  );
});

// bestelvoorstel
app.post('/api/order/proposal', (req, res) => {
  const { product_id, week } = req.body;

  db.get(
    `SELECT minimum_stock FROM producten WHERE id = ?`,
    [product_id],
    (err, product) => {
      if (err || !product) return res.status(500).json({ error: 'Product niet gevonden' });

      db.get(
        `SELECT stock_einde FROM week_stock WHERE product_id = ? AND week = ?`,
        [product_id, week],
        (err2, stockRow) => {
          if (err2 || !stockRow) return res.status(500).json({ error: 'Stock niet gevonden' });

          const voorstel = Math.max(product.minimum_stock - stockRow.stock_einde, 0);

          db.run(
            `INSERT INTO bestellingen (product_id, week, voorstel)
             VALUES (?, ?, ?)`,
            [product_id, week, voorstel],
            function (err3) {
              if (err3) return res.status(500).json({ error: err3.message });
              res.json({ id: this.lastID, voorstel });
            }
          );
        }
      );
    }
  );
});

// definitieve bestelling + mail
app.post('/api/order/finalize', async (req, res) => {
  const { order_id, definitief, email_leverancier } = req.body;

  db.run(
    `UPDATE bestellingen SET definitief = ? WHERE id = ?`,
    [definitief, order_id],
    function (err) {
      if (err) return res.status(500).json({ error: err.message });

      db.get(
        `SELECT p.naam, b.week
         FROM bestellingen b
         JOIN producten p ON p.id = b.product_id
         WHERE b.id = ?`,
        [order_id],
        async (err2, row) => {
          if (err2 || !row) return res.status(500).json({ error: 'Bestelling niet gevonden' });

          const subject = `Bestelling week ${row.week}`;
          const text = `Product: ${row.naam}\nBestelde hoeveelheid: ${definitief}`;

          try {
            await sendOrderMail(email_leverancier, subject, text);
            db.run(
              `UPDATE bestellingen SET verstuurd = 1 WHERE id = ?`,
              [order_id]
            );
            res.json({ status: 'ok' });
          } catch (e) {
            res.status(500).json({ error: 'Mail versturen mislukt', details: e.message });
          }
        }
      );
    }
  );
});

// historiek
app.get('/api/history', (req, res) => {
  db.all(
    `SELECT b.id, p.naam, b.week, b.voorstel, b.definitief, b.verstuurd
     FROM bestellingen b
     JOIN producten p ON p.id = b.product_id
     ORDER BY b.week DESC`,
    [],
    (err, rows) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json(rows);
    }
  );
});

app.listen(3000, () => {
  console.log('Backend draait op http://localhost:3000');
});
