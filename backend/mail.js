async function sendOrderMail(to, subject, text) {
  const response = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: {
      'accept': 'application/json',
      'api-key': process.env.BREVO_API_KEY,
      'content-type': 'application/json'
    },
    body: JSON.stringify({
      sender: { name: 'Bestellingen', email: process.env.EMAIL_USER },
      to: [{ email: to }],
      subject,
      textContent: text
    })
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`Brevo API fout (${response.status}): ${errorBody}`);
  }

  return response.json();
}

module.exports = { sendOrderMail };
