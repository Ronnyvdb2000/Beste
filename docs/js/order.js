const proposalForm = document.getElementById('proposal-form');
const proposalResult = document.getElementById('proposal-result');
const finalForm = document.getElementById('final-form');
const finalResult = document.getElementById('final-result');

proposalForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const product_id = Number(document.getElementById('product_id').value);
  const week = Number(document.getElementById('week').value);

  try {
    const data = await apiPost('/order/proposal', { product_id, week });
    proposalResult.textContent = `Voorstel: ${data.voorstel}`;
    document.getElementById('order_id').value = data.id;
    finalForm.style.display = 'block';
  } catch (err) {
    proposalResult.textContent = 'Fout bij voorstel.';
  }
});

finalForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const order_id = Number(document.getElementById('order_id').value);
  const definitief = Number(document.getElementById('definitief').value);
  const email_leverancier = document.getElementById('email_leverancier').value;

  try {
    const data = await apiPost('/order/finalize', { order_id, definitief, email_leverancier });
    finalResult.textContent = 'Bestelling verstuurd.';
  } catch (err) {
    finalResult.textContent = 'Fout bij versturen.';
  }
});
