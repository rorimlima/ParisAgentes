const { crypto } = require('crypto').webcrypto;

async function testCryptoSubtle(message) {
  const msgBuffer = new TextEncoder().encode(message);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

testCryptoSubtle("2026").then(hash => console.log("Subtle Crypto Hash:", hash));
