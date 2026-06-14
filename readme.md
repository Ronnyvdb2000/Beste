📦 Stock App 

Voorraadbeheer • Verbruik • Bestelvoorstellen • Bestellingen • Historiek
Een moderne webapplicatie voor intern voorraadbeheer.
De app combineert een lichte frontend met een Node.js backend en SQLite‑database.
Ontworpen voor eenvoud, snelheid en betrouwbaarheid.

🚀 Features
🔐 Login met gebruikersnaam & wachtwoord

📦 Wekelijkse stock ingave

📉 Automatische verbruiksberekening

🧮 Bestelvoorstellen op basis van minimum stock

📧 Definitieve bestelling + e‑mail naar leverancier

🗂 Volledige historiek van alle orders

🗄 SQLite database (zero‑maintenance)

🌐 Backend draait op Render

💻 Frontend werkt lokaal of via GitHub Pages

🧱 Projectstructuur
Code
/frontend
  index.html
  stock.html
  history.html
  css/style.css
  js/api.js

/backend
  server.js
  database.js
  stock.db
🔐 Login
De login gebeurt volledig client‑side.

Standaard:

Gebruikersnaam: admin

Wachtwoord: 1234

Aanpassen kan in index.html:

js
const CORRECT_USER = "admin";
const CORRECT_PASS = "1234";
🌐 API‑Endpoints
Alle endpoints beginnen met:

Code
https://beste-a9oq.onrender.com/api
Stock ingave
POST /api/stock  
Slaat stock + verbruik op.

Bestelvoorstel
POST /api/order/proposal  
Genereert voorstel + maakt order aan.

Definitieve bestelling
POST /api/order/finalize  
Slaat definitieve hoeveelheid op + verstuurt e‑mail.

Historiek
GET /api/history  
Toont alle orders.

🗄 Database Schema
products
kolom	type	uitleg
id	INTEGER PK	product ID
naam	TEXT	productnaam
minimum_stock	INTEGER	minimum voorraad


week_stock
kolom	type
id	INTEGER PK
product_id	INTEGER FK
week	INTEGER
stock_aanvang	INTEGER
stock_einde	INTEGER
verbruik	INTEGER


orders
kolom	type
id	INTEGER PK
product_id	INTEGER FK
week	INTEGER
verbruik	INTEGER
voorstel	INTEGER
definitief	INTEGER
email_leverancier	TEXT
datum	TEXT


🛠 Backend installeren
Ga naar de backend‑map

Installeer dependencies:

Code
npm install
Start lokaal:

Code
node server.js
Of deploy op Render (Node Web Service)

💻 Frontend gebruiken
Je kan de frontend:

lokaal openen (dubbelklik op index.html)

of hosten via GitHub Pages

De frontend communiceert automatisch met de backend via api.js.

🧪 Testflow
Login

Product kiezen

Stock ingeven

Bestelvoorstel genereren

Definitieve bestelling versturen

Historiek bekijken

📜 Licentie
Vrij te gebruiken voor interne of persoonlijke projecten, na kennisgeving aan de maker.
