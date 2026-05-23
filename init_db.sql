CREATE TABLE IF NOT EXISTS stock (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    productnaam TEXT NOT NULL,
    leverancier TEXT NOT NULL,
    eenheid TEXT NOT NULL,
    minimum_stock INTEGER NOT NULL,
    huidige_stock INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS verkoop (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    datum TEXT NOT NULL,          -- ISO string: 2026-05-23
    product_id INTEGER NOT NULL,
    aantal INTEGER NOT NULL,
    FOREIGN KEY (product_id) REFERENCES stock(id)
);

CREATE TABLE IF NOT EXISTS bestelling (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    datum TEXT NOT NULL,
    product_id INTEGER NOT NULL,
    voorstel_aantal INTEGER NOT NULL,
    definitief_aantal INTEGER,
    status TEXT NOT NULL,         -- 'voorstel','bevestigd','verstuurd'
    FOREIGN KEY (product_id) REFERENCES stock(id)
);
