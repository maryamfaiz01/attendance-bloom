const fs = require('fs');
const path = require('path');
const selfsigned = require('selfsigned');

async function getOrCreateSSLCertificates() {
  const certsDir = path.resolve(__dirname, 'certs');
  const keyPath = path.join(certsDir, 'key.pem');
  const certPath = path.join(certsDir, 'cert.pem');

  if (!fs.existsSync(certsDir)) {
    fs.mkdirSync(certsDir, { recursive: true });
  }

  if (fs.existsSync(keyPath) && fs.existsSync(certPath)) {
    return {
      key: fs.readFileSync(keyPath),
      cert: fs.readFileSync(certPath)
    };
  }

  console.log('Generating self-signed SSL certificate for local HTTPS development...');
  const attrs = [{ name: 'commonName', value: 'localhost' }];
  const pkey = await selfsigned.generate(attrs, { days: 365 });

  fs.writeFileSync(keyPath, pkey.private, 'utf8');
  fs.writeFileSync(certPath, pkey.cert, 'utf8');

  console.log(`SSL Certificates generated in: ${certsDir}`);

  return {
    key: pkey.private,
    cert: pkey.cert
  };
}

module.exports = { getOrCreateSSLCertificates };
