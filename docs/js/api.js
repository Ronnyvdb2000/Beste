const API_BASE = 'https://beste-a9oq.onrender.com/api';

async function apiPost(path, data) {
  const res = await fetch(`${API_BASE}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  const json = await res.json();
  if (!res.ok) {
    throw new Error(json.error || 'Er ging iets mis.');
  }
  return json;
}

async function apiGet(path) {
  const res = await fetch(`${API_BASE}${path}`);
  const json = await res.json();
  if (!res.ok) {
    throw new Error(json.error || 'Er ging iets mis.');
  }
  return json;
}
// Logt ook wanneer een antwoord daadwerkelijk verstuurd is, met duur
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    console.log(`${req.method} ${req.path} -> ${res.statusCode} (${Date.now() - start}ms)`);
  });
  next();
});

// Helper: geeft een expliciete fout i.p.v. eeuwig te hangen
function metTimeout(promise, ms, label) {
  return Promise.race([
    promise,
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error(`Timeout na ${ms}ms bij ${label}`)), ms)
    )
  ]);
}
