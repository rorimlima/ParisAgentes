async function sha256(message) {
  // Try Web Crypto API first (HTTPS/localhost)
  // FORCING FALLBACK FOR TEST:
  // if (typeof crypto !== 'undefined' && crypto.subtle) { ... }
  
  // Pure JS SHA-256 fallback for file:// or insecure contexts
  function rightRotate(value, amount) {
    return (value >>> amount) | (value << (32 - amount));
  }
  const mathPow = Math.pow;
  const maxWord = mathPow(2, 32);
  let result = '';
  const k = [];
  let h0 = 0x6a09e667, h1 = 0xbb67ae85, h2 = 0x3c6ef372, h3 = 0xa54ff53a,
      h4 = 0x510e527f, h5 = 0x9b05688c, h6 = 0x1f83d9ab, h7 = 0x5be0cd19;
  const words = [];
  const asciiBitLength = message.length * 8;
  let i, j, isComposite;
  // Generate k values
  let primeCounter = 0;
  for (let candidate = 2; primeCounter < 64; candidate++) {
    isComposite = false;
    for (let factor = 2; factor * factor <= candidate; factor++) {
      if (candidate % factor === 0) { isComposite = true; break; }
    }
    if (!isComposite) {
      if (primeCounter < 8) {
        const h = mathPow(candidate, 0.5);
        [h0,h1,h2,h3,h4,h5,h6,h7][primeCounter] = (h - Math.floor(h)) * maxWord | 0;
      }
      k[primeCounter] = (mathPow(candidate, 1/3) - Math.floor(mathPow(candidate, 1/3))) * maxWord | 0;
      primeCounter++;
    }
  }
  message += '\x80';
  while (message.length % 64 - 56) message += '\x00';
  for (i = 0; i < message.length; i++) {
    j = message.charCodeAt(i);
    if (j >> 8) return; // ASCII only
    words[i >> 2] |= j << ((3 - i) % 4) * 8;
  }
  words[words.length] = (asciiBitLength / maxWord) | 0;
  words[words.length] = asciiBitLength;

  for (j = 0; j < words.length;) {
    const w = words.slice(j, j += 16);
    const oldHash = [h0, h1, h2, h3, h4, h5, h6, h7];
    for (i = 0; i < 64; i++) {
      const w15 = w[i - 15] || 0, w2 = w[i - 2] || 0; // Added || 0 to avoid NaN if out of bounds?
      if (i >= 16) {
        const s0 = rightRotate(w15, 7) ^ rightRotate(w15, 18) ^ (w15 >>> 3);
        const s1 = rightRotate(w2, 17) ^ rightRotate(w2, 19) ^ (w2 >>> 10);
        w[i] = ((w[i - 16] || 0) + s0 + (w[i - 7] || 0) + s1) | 0;
      }
      const S1 = rightRotate(h4, 6) ^ rightRotate(h4, 11) ^ rightRotate(h4, 25);
      const ch = (h4 & h5) ^ (~h4 & h6);
      const temp1 = (h7 + S1 + ch + k[i] + (w[i] || 0)) | 0;
      const S0 = rightRotate(h0, 2) ^ rightRotate(h0, 13) ^ rightRotate(h0, 22);
      const maj = (h0 & h1) ^ (h0 & h2) ^ (h1 & h2);
      const temp2 = (S0 + maj) | 0;
      h7 = h6; h6 = h5; h5 = h4; h4 = (h3 + temp1) | 0;
      h3 = h2; h2 = h1; h1 = h0; h0 = (temp1 + temp2) | 0;
    }
    h0 = (h0 + oldHash[0]) | 0; h1 = (h1 + oldHash[1]) | 0;
    h2 = (h2 + oldHash[2]) | 0; h3 = (h3 + oldHash[3]) | 0;
    h4 = (h4 + oldHash[4]) | 0; h5 = (h5 + oldHash[5]) | 0;
    h6 = (h6 + oldHash[6]) | 0; h7 = (h7 + oldHash[7]) | 0;
  }
  for (const val of [h0, h1, h2, h3, h4, h5, h6, h7]) {
    result += (val >>> 0).toString(16).padStart(8, '0');
  }
  return result;
}

async function test() {
  const hash = await sha256("2026");
  console.log("Hash for '2026':", hash);
  console.log("Expected:       ", "158a323a7ba44870f23d96f1516dd70aa48e9a72db4ebb026b0a89e212a208ab");
}
test();
