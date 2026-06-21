const { createClient } = require('@libsql/client');

const db = createClient({
  url: process.env.TURSO_URL,
  authToken: process.env.TURSO_TOKEN,
});

async function initDb() {
  await db.execute(`CREATE TABLE IF NOT EXISTS producten (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    naam TEXT NOT NULL,
    leverancier TEXT,
    minimum_stock INTEGER NOT NULL
  )`);
  await db.execute(`CREATE TABLE IF NOT EXISTS week_stock (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    product_id INTEGER NOT NULL,
    week INTEGER NOT NULL,
    stock_aanvang INTEGER NOT NULL,
    stock_einde INTEGER NOT NULL,
    FOREIGN KEY (product_id) REFERENCES producten(id)
  )`);
  await db.execute(`CREATE TABLE IF NOT EXISTS verbruik (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    product_id INTEGER NOT NULL,
    week INTEGER NOT NULL,
    hoeveelheid INTEGER NOT NULL,
    FOREIGN KEY (product_id) REFERENCES producten(id)
  )`);
  await db.execute(`CREATE TABLE IF NOT EXISTS bestellingen (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    product_id INTEGER NOT NULL,
    week INTEGER NOT NULL,
    voorstel INTEGER NOT NULL,
    definitief INTEGER,
    verstuurd INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (product_id) REFERENCES producten(id)
  )`);

  // Voeg created_at toe als de tabel al bestond zonder deze kolom
  try {
    await db.execute(`ALTER TABLE bestellingen ADD COLUMN created_at TEXT DEFAULT (datetime('now'))`);
  } catch (e) {
    // kolom bestaat al — negeren
  }

  console.log('Database tabellen klaar.');
}

module.exports = { db, initDb };
