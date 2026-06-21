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
