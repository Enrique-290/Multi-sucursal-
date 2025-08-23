const fmt = n => new Intl.NumberFormat('es-MX',{style:'currency',currency:'MXN'}).format(n||0);

async function load() {
  const [stats, low] = await Promise.all([
    fetch('/api/stats/today').then(r=>r.json()),
    fetch('/api/stock/low').then(r=>r.json())
  ]);

  document.getElementById('branchName').textContent = stats.branch.name;
  document.getElementById('branchId').textContent = stats.branch.id;
  document.getElementById('todayDate').textContent = stats.todayLocal;

  document.getElementById('salesTotal').textContent = fmt(stats.totals.total);
  document.getElementById('ticketsCount').textContent = stats.totals.tickets;
  document.getElementById('avgTicket').textContent = fmt(stats.totals.avg_ticket);

  document.getElementById('mixOrigin').textContent = stats.by_origin.map(o=>`${o.origin}: ${fmt(o.total)} (${o.tickets})`).join(' · ');

  const ul = document.getElementById('lowStockList');
  ul.innerHTML = '';
  if (low.items.length === 0) {
    const li = document.createElement('li');
    li.textContent = 'Todo OK 👌';
    ul.appendChild(li);
  } else {
    low.items.forEach(i=>{
      const li = document.createElement('li');
      li.textContent = `${i.sku || i.product_id} — ${i.name}: ${i.stock} (mín ${i.min_stock})`;
      ul.appendChild(li);
    });
  }
}
load();

document.getElementById('sendReportBtn').addEventListener('click', async ()=>{
  const status = document.getElementById('status');
  status.textContent = 'Enviando...';
  const res = await fetch('/api/email/daily', { method:'POST', headers: {'x-api-key': (localStorage.getItem('API_KEY') || '')}});
  if (res.ok) {
    status.textContent = 'Reporte enviado ✅';
  } else {
    status.textContent = 'Error al enviar ❌';
  }
});
