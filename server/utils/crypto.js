import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const keyPath = path.join(__dirname, '../../data/family_master.key');

let cachedKey = null;

// Get or generate 32-byte master key for AES-256-GCM
export function getMasterKey() {
  if (cachedKey) return cachedKey;

  if (process.env.FAMILY_ENCRYPTION_KEY) {
    cachedKey = crypto.createHash('sha256').update(process.env.FAMILY_ENCRYPTION_KEY).digest();
    return cachedKey;
  }

  if (fs.existsSync(keyPath)) {
    const raw = fs.readFileSync(keyPath);
    if (raw.length === 32) {
      cachedKey = raw;
      return cachedKey;
    }
  }

  // Generate new 32-byte cryptographically secure random key
  const newKey = crypto.randomBytes(32);
  const dir = path.dirname(keyPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  fs.writeFileSync(keyPath, newKey);
  cachedKey = newKey;
  console.log('[Security] New Master AES-256 Encryption Key generated & secured.');
  return cachedKey;
}

// Encrypt a Buffer using AES-256-GCM
// Format: [IV (12 bytes)] + [Auth Tag (16 bytes)] + [Ciphertext]
export function encryptBuffer(buffer) {
  const key = getMasterKey();
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);

  const encrypted = Buffer.concat([cipher.update(buffer), cipher.final()]);
  const authTag = cipher.getAuthTag();

  return Buffer.concat([iv, authTag, encrypted]);
}

// Decrypt a Buffer encrypted with AES-256-GCM
export function decryptBuffer(encryptedBuffer) {
  if (encryptedBuffer.length < 28) {
    throw new Error('Yaroqsiz shifrlangan ma‘lumot');
  }

  const key = getMasterKey();
  const iv = encryptedBuffer.subarray(0, 12);
  const authTag = encryptedBuffer.subarray(12, 28);
  const ciphertext = encryptedBuffer.subarray(28);

  const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(authTag);

  return Buffer.concat([decipher.update(ciphertext), decipher.final()]);
}

// Remove EXIF metadata (GPS location coordinates & camera info) from JPEG images
export function stripExifFromJpeg(buffer) {
  try {
    if (buffer.length < 4 || buffer[0] !== 0xFF || buffer[1] !== 0xD8) {
      return buffer; // Not JPEG
    }

    let offset = 2;
    const pieces = [buffer.subarray(0, 2)]; // Start of Image

    while (offset < buffer.length) {
      if (buffer[offset] !== 0xFF) break;
      const marker = buffer[offset + 1];

      // End of Image or Start of Scan (image data begins)
      if (marker === 0xD9 || marker === 0xDA) {
        pieces.push(buffer.subarray(offset));
        break;
      }

      const length = buffer.readUInt16BE(offset + 2);

      // Marker 0xE1 is APP1 (EXIF metadata)
      if (marker === 0xE1) {
        // Skip this EXIF block! (Removes GPS tags)
        offset += 2 + length;
      } else {
        pieces.push(buffer.subarray(offset, offset + 2 + length));
        offset += 2 + length;
      }
    }

    return Buffer.concat(pieces);
  } catch (err) {
    console.warn('[Exif Stripper Warning]:', err.message);
    return buffer; // Fallback to original buffer
  }
}
