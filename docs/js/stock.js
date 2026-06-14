document.getElementById('stock-form').addEventListener('submit', async (e) => {
  e.preventDefault();

  const product_id = Number(document.getElementById('product_id').value);
  const week = Number(document.getElementById('week').value);
  const stock_aanvang = Number(document.getElementById('stock_aanvang').value);
  const stock_einde = Number(document.getElementById('stock_einde').value);

  const resultEl = document.getElementById('result');

  try {
    const data = await apiPost('/stock', {
      product_id,
      week,
      stock_aanvang,
      stock_einde
    });
    resultEl.textContent = `Stock opgeslagen. Verbruik: ${data.verbruik}`;
  } catch (err) {
    resultEl.textContent = 'Fout bij opslaan.';
  }
});
