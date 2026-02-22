const fs = require('fs');
const path = require('path');
const forge = require('node-forge');

const CERTS_DIR = path.join(__dirname, '../certs');
const CA_KEY_PATH = path.join(CERTS_DIR, 'infershield-ca.key');
const CA_CERT_PATH = path.join(CERTS_DIR, 'infershield-ca.crt');

function ensureCertificate() {
  if (!fs.existsSync(CERTS_DIR)) {
    fs.mkdirSync(CERTS_DIR);
  }

  if (!fs.existsSync(CA_KEY_PATH) || !fs.existsSync(CA_CERT_PATH)) {
    console.log('Generating new root CA certificate...');

    const keys = forge.pki.rsa.generateKeyPair(2048);
    const cert = forge.pki.createCertificate();

    cert.publicKey = keys.publicKey;
    cert.serialNumber = (new Date()).getTime().toString();
    cert.validity.notBefore = new Date();
    cert.validity.notAfter = new Date();
    cert.validity.notAfter.setFullYear(cert.validity.notBefore.getFullYear() + 10);

    const attrs = [{ name: 'commonName', value: 'InferShield Proxy CA' }];
    cert.setSubject(attrs);
    cert.setIssuer(attrs);
    cert.setExtensions([{
      name: 'basicConstraints',
      cA: true
    }]);

    cert.sign(keys.privateKey, forge.md.sha256.create());

    const pemKey = forge.pki.privateKeyToPem(keys.privateKey);
    const pemCert = forge.pki.certificateToPem(cert);

    fs.writeFileSync(CA_KEY_PATH, pemKey);
    fs.writeFileSync(CA_CERT_PATH, pemCert);

    console.log(`Root CA generated at ${CA_CERT_PATH}`);
  } else {
    console.log('Root CA already exists.');
  }
}

module.exports = { ensureCertificate };