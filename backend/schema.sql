CREATE TABLE producten (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    naam TEXT NOT NULL,
    leverancier TEXT,
    minimum_stock INTEGER NOT NULL
);

CREATE TABLE week_stock (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    product_id INTEGER NOT NULL,
    week INTEGER NOT NULL,
    stock_aanvang INTEGER NOT NULL,
    stock_einde INTEGER NOT NULL,
    FOREIGN KEY (product_id) REFERENCES producten(id)
);

CREATE TABLE verbruik (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    product_id INTEGER NOT NULL,
    week INTEGER NOT NULL,
    hoeveelheid INTEGER NOT NULL,
    FOREIGN KEY (product_id) REFERENCES producten(id)
);

CREATE TABLE bestellingen (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    product_id INTEGER NOT NULL,
    week INTEGER NOT NULL,
    voorstel INTEGER NOT NULL,
    definitief INTEGER,
    verstuurd INTEGER DEFAULT 0,
    FOREIGN KEY (product_id) REFERENCES producten(id)
);
