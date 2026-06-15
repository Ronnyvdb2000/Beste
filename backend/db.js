const { createClient } = require('@libsql/client');

const db = createClient({
  url: process.env.TURSO_URL,
  authToken: process.env.TURSO_TOKEN,
});

// Initialiseer tabellen als ze nog niet bestaan
async function initDb() {
  await db.executeMultiple(`
    CREATE TABLE IF NOT EXISTS producten (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      naam TEXT NOT NULL,
      leverancier TEXT,
      minimum_stock INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS week_stock (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      product_id INTEGER NOT NULL,
      week INTEGER NOT NULL,
      stock_aanvang INTEGER NOT NULL,
      stock_einde INTEGER NOT NULL,
      FOREIGN KEY (product_id) REFERENCES producten(id)
    );
    CREATE TABLE IF NOT EXISTS verbruik (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      product_id INTEGER NOT NULL,
      week INTEGER NOT NULL,
      hoeveelheid INTEGER NOT NULL,
      FOREIGN KEY (product_id) REFERENCES producten(id)
    );
    CREATE TABLE IF NOT EXISTS bestellingen (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      product_id INTEGER NOT NULL,
      week INTEGER NOT NULL,
      voorstel INTEGER NOT NULL,
      definitief INTEGER,
      verstuurd INTEGER DEFAULT 0,
      FOREIGN KEY (product_id) REFERENCES producten(id)
    );
  `);
  console.log('Database tabellen klaar.');
}

module.exports = { db, initDb };
