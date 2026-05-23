import sqlite3
from datetime import datetime
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
import smtplib
from email.mime.text import MIMEText

DB_PATH = "voorraad.db"

SMTP_HOST = "smtp.gmail.com"
SMTP_PORT = 587
SMTP_USER = "jouwmail@gmail.com"
SMTP_PASS = "jouw_app_password"   # gebruik app-wachtwoord

LEVERANCIER_EMAIL = "leverancier@example.com"
FROM_EMAIL = SMTP_USER

app = FastAPI()


def get_conn():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def init_db():
    with get_conn() as conn, open("init_db.sql", "r", encoding="utf-8") as f:
        conn.executescript(f.read())


class StockItem(BaseModel):
    productnaam: str
    leverancier: str
    eenheid: str
    minimum_stock: int
    huidige_stock: int


class VerkoopItem(BaseModel):
    product_id: int
    aantal: int


class BestellingCorrectie(BaseModel):
    bestelling_id: int
    definitief_aantal: int


@app.on_event("startup")
def startup():
    init_db()


@app.get("/stock")
def list_stock():
    with get_conn() as conn:
        cur = conn.execute("SELECT * FROM stock ORDER BY productnaam")
        return [dict(r) for r in cur.fetchall()]


@app.post("/stock")
def add_stock(item: StockItem):
    with get_conn() as conn:
        cur = conn.execute(
            """
            INSERT INTO stock (productnaam, leverancier, eenheid, minimum_stock, huidige_stock)
            VALUES (?, ?, ?, ?, ?)
            """,
            (item.productnaam, item.leverancier, item.eenheid, item.minimum_stock, item.huidige_stock),
        )
        conn.commit()
        return {"id": cur.lastrowid}


@app.post("/verkoop")
def add_verkoop(v: VerkoopItem):
    datum = datetime.now().strftime("%Y-%m-%d")
    with get_conn() as conn:
        # check product
        cur = conn.execute("SELECT id, huidige_stock FROM stock WHERE id = ?", (v.product_id,))
        row = cur.fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Product niet gevonden")

        nieuwe_stock = row["huidige_stock"] - v.aantal
        if nieuwe_stock < 0:
            nieuwe_stock = 0

        conn.execute(
            "INSERT INTO verkoop (datum, product_id, aantal) VALUES (?, ?, ?)",
            (datum, v.product_id, v.aantal),
        )
        conn.execute(
            "UPDATE stock SET huidige_stock = ? WHERE id = ?",
            (nieuwe_stock, v.product_id),
        )
        conn.commit()
        return {"status": "ok"}


@app.get("/bestelvoorstel")
def bestel_voorstel():
    """
    Voor elk product waar huidige_stock < minimum_stock:
    voorstel = minimum_stock - huidige_stock
    """
    with get_conn() as conn:
        cur = conn.execute(
            """
            SELECT id, productnaam, leverancier, eenheid, minimum_stock, huidige_stock,
                   (minimum_stock - huidige_stock) AS voorstel
            FROM stock
            WHERE huidige_stock < minimum_stock
            ORDER BY leverancier, productnaam
            """
        )
        rows = cur.fetchall()

        datum = datetime.now().strftime("%Y-%m-%d")
        voorstellen = []
        for r in rows:
            if r["voorstel"] <= 0:
                continue
            c = conn.execute(
                """
                INSERT INTO bestelling (datum, product_id, voorstel_aantal, definitief_aantal, status)
                VALUES (?, ?, ?, NULL, 'voorstel')
                """,
                (datum, r["id"], r["voorstel"]),
            )
            voorstellen.append({
                "bestelling_id": c.lastrowid,
                "product_id": r["id"],
                "productnaam": r["productnaam"],
                "leverancier": r["leverancier"],
                "eenheid": r["eenheid"],
                "voorstel_aantal": r["voorstel"],
            })
        conn.commit()
        return voorstellen


@app.get("/bestelling/open")
def open_bestellingen():
    with get_conn() as conn:
        cur = conn.execute(
            """
            SELECT b.id AS bestelling_id, b.datum, b.voorstel_aantal, b.definitief_aantal, b.status,
                   s.productnaam, s.leverancier, s.eenheid
            FROM bestelling b
            JOIN stock s ON s.id = b.product_id
            WHERE b.status IN ('voorstel','bevestigd')
            ORDER BY b.datum, s.leverancier, s.productnaam
            """
        )
        return [dict(r) for r in cur.fetchall()]


@app.post("/bestelling/correctie")
def corrigeer_bestelling(c: BestellingCorrectie):
    with get_conn() as conn:
        cur = conn.execute("SELECT * FROM bestelling WHERE id = ?", (c.bestelling_id,))
        row = cur.fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Bestelling niet gevonden")

        conn.execute(
            "UPDATE bestelling SET definitief_aantal = ?, status = 'bevestigd' WHERE id = ?",
            (c.definitief_aantal, c.bestelling_id),
        )
        conn.commit()
        return {"status": "ok"}


def stuur_mail_bestelling(bestellingen):
    body_lines = []
    body_lines.append("Beste,\n")
    body_lines.append("Gelieve volgende bestelling te leveren:\n")
    for b in bestellingen:
        line = f"- {b['productnaam']} ({b['eenheid']}): {b['definitief_aantal']}"
        body_lines.append(line)
    body_lines.append("\nMet vriendelijke groeten,\n")
    body = "\n".join(body_lines)

    msg = MIMEText(body, _charset="utf-8")
    msg["Subject"] = "Bestelling"
    msg["From"] = FROM_EMAIL
    msg["To"] = LEVERANCIER_EMAIL

    with smtplib.SMTP(SMTP_HOST, SMTP_PORT) as s:
        s.starttls()
        s.login(SMTP_USER, SMTP_PASS)
        s.send_message(msg)


@app.post("/bestelling/verstuur")
def verstuur_bestelling():
    with get_conn() as conn:
        cur = conn.execute(
            """
            SELECT b.id AS bestelling_id, b.definitief_aantal, s.productnaam, s.eenheid, s.leverancier
            FROM bestelling b
            JOIN stock s ON s.id = b.product_id
            WHERE b.status = 'bevestigd'
            """
        )
        rows = cur.fetchall()
        if not rows:
            raise HTTPException(status_code=400, detail="Geen bevestigde bestellingen")

        # groepeer per leverancier (hier: één leverancier, maar klaar voor meerdere)
        per_leverancier = {}
        for r in rows:
            lev = r["leverancier"]
            per_leverancier.setdefault(lev, []).append({
                "bestelling_id": r["bestelling_id"],
                "productnaam": r["productnaam"],
                "eenheid": r["eenheid"],
                "definitief_aantal": r["definitief_aantal"],
            })

        # stuur mail per leverancier
        for lev, items in per_leverancier.items():
            # als je per leverancier ander mailadres wil, kun je hier mapping doen
            stuur_mail_bestelling(items)

        # status naar 'verstuurd'
        ids = [r["bestelling_id"] for r in rows]
        conn.execute(
            f"UPDATE bestelling SET status = 'verstuurd' WHERE id IN ({','.join('?'*len(ids))})",
            ids,
        )
        conn.commit()

        return {"status": "verstuurd", "aantal": len(rows)}
