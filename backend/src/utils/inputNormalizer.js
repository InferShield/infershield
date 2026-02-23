/**
 * Pre-normalization layer for encoding evasion mitigation
 * Decodes common encodings to detect obfuscated payloads
 */

function isValidBase64(input) {
  try {
    // Decode and re-encode to check if it's valid Base64
    const decoded = Buffer.from(input, 'base64');
    const reencoded = decoded.toString('base64');
    // Remove padding differences for comparison
    const inputNorm = input.replace(/=+$/, '');
    const reencodedNorm = reencoded.replace(/=+$/, '');
    return inputNorm === reencodedNorm;
  } catch (e) {
    return false;
  }
}

function isReasonableText(text) {
  // Check if decoded text contains reasonable characters (not binary garbage)
  // Allow ASCII printable + whitespace + common UTF-8, but reject if too many weird chars
  const weirdChars = text.match(/[^\x20-\x7E\r\n\t\xA0-\xFF]/g) || [];
  return weirdChars.length / text.length < 0.2; // Less than 20% weird characters
}

function normalizeInput(input) {
  let normalized = input;
  let wasBase64Decoded = false;

  try {
    // 1. URL decode
    normalized = decodeURIComponent(normalized);
  } catch (e) {
    // Silently ignore decoding issues
  }

  try {
    // 2. Base64 decode (if valid pattern and actually valid Base64)
    const base64Pattern = /^[A-Za-z0-9+/]+=*$/;
    if (base64Pattern.test(normalized) && normalized.length % 4 === 0 && normalized.length >= 4) {
      if (isValidBase64(normalized)) {
        const decoded = Buffer.from(normalized, 'base64').toString('utf-8');
        // Only use decoded if it produces reasonable text
        if (decoded && isReasonableText(decoded)) {
          normalized = decoded;
          wasBase64Decoded = true;
        }
      }
    }
  } catch (e) {
    // Handle invalid Base64 gracefully - keep original
  }

  // 3. Merge fragments (only if not Base64 decoded - remove spaces/+ for concatenation)
  if (!wasBase64Decoded) {
    normalized = normalized.replace(/[\s+]/g, '');
  }

  try {
    // 4. Handle double encoding (try one more decode)
    const doubleDecoded = decodeURIComponent(normalized);
    if (doubleDecoded !== normalized) {
      normalized = doubleDecoded;
    }
  } catch (e) {
    // Silently ignore decoding issues
  }

  return normalized;
}

module.exports = { normalizeInput };