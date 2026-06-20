// DEFINITIEVE BESTELLING - ALLES IN ÉÉN MAIL
app.post('/api/order/finalize-all', async (req, res) => {
  const { orders, email_leverancier, week } = req.body;
  // orders = [{ order_id, definitief }, ...]
  try {
    if (!Array.isArray(orders) || orders.length === 0) {
      return res.status(400).json({ error: 'Geen bestellingen meegegeven' });
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

      await db.execute({
        sql: `UPDATE bestellingen SET verstuurd = 1 WHERE id = ?`,
        args: [o.order_id]
      });
    }

    const tekst = `Bestelling week ${week}\n\n${regels.join('\n')}`;
    await sendOrderMail(email_leverancier, `Bestelling week ${week}`, tekst);

    res.json({ status: 'ok', aantal: regels.length });
  } catch (err) {
    res.status(500).json({ error: 'Mail versturen mislukt', details: err.message });
  }
});
