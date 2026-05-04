const { getStore } = require('@netlify/blobs');

exports.handler = async (event) => {
  const { email, token } = event.queryStringParameters;
  if (!email || !token) {
    return { statusCode: 400, body: '<html><body>Invalid request</body></html>', headers: { 'Content-Type': 'text/html' } };
  }

  const store = getStore('verification-codes');
  const raw = await store.get(email);
  if (!raw) {
    return { statusCode: 401, body: '<html><body>Code expired or not found</body></html>' };
  }

  const { otp: storedOtp, expiresAt } = JSON.parse(raw);
  if (Date.now() > expiresAt) {
    await store.delete(email);
    return { statusCode: 401, body: '<html><body>Code expired</body></html>' };
  }
  if (storedOtp !== token) {
    return { statusCode: 401, body: '<html><body>Invalid code</body></html>' };
  }

  await store.delete(email);
  const sessionToken = Buffer.from(JSON.stringify({ email, expires: Date.now() + 7*24*60*60*1000 })).toString('base64');

  return {
    statusCode: 200,
    headers: { 'Content-Type': 'text/html' },
    body: `<!DOCTYPE html>
    <html>
    <head><script>
      localStorage.setItem('roce-verified', '${sessionToken}');
      window.location.href = '/investor-portal';
    </script></head>
    <body>Verifying... redirecting.</body>
    </html>`
  };
};
