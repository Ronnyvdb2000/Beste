(async () => {
  const tableBody = document.querySelector('#history-table tbody');
  try {
    const rows = await apiGet('/history');
    rows.forEach(row => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${row.id}</td>
        <td>${row.naam}</td>
        <td>${row.week}</td>
        <td>${row.voorstel}</td>
        <td>${row.definitief ?? ''}</td>
        <td>${row.verstuurd ? 'Ja' : 'Nee'}</td>
      `;
      tableBody.appendChild(tr);
    });
  } catch (err) {
    tableBody.innerHTML = '<tr><td colspan="6">Fout bij laden historiek.</td></tr>';
  }
})();
