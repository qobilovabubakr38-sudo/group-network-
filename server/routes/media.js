import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { requireAuth } from '../middleware/auth.js';
import { upload } from '../middleware/upload.js';
import { encryptBuffer, decryptBuffer, stripExifFromJpeg } from '../utils/crypto.js';
import { uploadToTelegram, downloadFromTelegram, getTelegramConfig } from '../utils/telegramStorage.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const uploadDir = path.join(__dirname, '../../uploads');

const router = express.Router();

// POST /api/upload - Secure file upload with GPS stripping, AES-256 encryption, and Telegram Cloud Mirror
router.post('/', requireAuth, (req, res) => {
  upload.single('file')(req, res, async (err) => {
    if (err) {
      console.error('[Upload Error]:', err.message);
      return res.status(400).json({ error: err.message || 'Fayl yuklashda xatolik yuz berdi.' });
    }

    if (!req.file) {
      return res.status(400).json({ error: 'Hech qanday fayl tanlanmadi.' });
    }

    try {
      const filePath = req.file.path;
      let fileBuffer = fs.readFileSync(filePath);

      // 1. Privacy Shield: Strip EXIF GPS metadata if it's a JPEG image
      if (req.file.mimetype === 'image/jpeg' || req.file.mimetype === 'image/jpg') {
        fileBuffer = stripExifFromJpeg(fileBuffer);
      }

      // 2. Military Grade Encryption: Encrypt buffer with AES-256-GCM
      const encryptedBuffer = encryptBuffer(fileBuffer);
      fs.writeFileSync(filePath, encryptedBuffer);

      // 3. Infinite Cloud Redundancy: Mirror to Telegram Private Channel if enabled
      let cloudFileId = null;
      let storageType = 'local';

      const config = await getTelegramConfig();
      if (config.isEnabled && config.botToken && config.channelId) {
        const tgResult = await uploadToTelegram(
          encryptedBuffer,
          req.file.filename,
          `Family Network Encrypted: ${req.file.originalname}`
        );
        if (tgResult && tgResult.fileId) {
          cloudFileId = tgResult.fileId;
          storageType = 'hybrid';
        }
      }

      const fileUrl = `/api/upload/file/${req.file.filename}`;

      return res.status(201).json({
        url: fileUrl,
        fileName: req.file.originalname,
        mimeType: req.file.mimetype,
        fileSize: req.file.size,
        storageType,
        cloudFileId,
      });
    } catch (processErr) {
      console.error('[File Processing Error]:', processErr);
      return res.status(500).json({ error: 'Faylni shifrlashda xatolik yuz berdi.' });
    }
  });
});

// GET /api/upload/file/:filename - Securely stream and decrypt media on-the-fly
router.get('/file/:filename', async (req, res) => {
  try {
    const filename = path.basename(req.params.filename); // Sanitize path traversal
    const filePath = path.join(uploadDir, filename);

    let encryptedBuffer = null;

    // First check local disk
    if (fs.existsSync(filePath)) {
      encryptedBuffer = fs.readFileSync(filePath);
    } else {
      // If local disk doesn't have it (e.g. fresh cloud instance), fetch from Telegram mirror!
      if (req.query.cloud_id) {
        encryptedBuffer = await downloadFromTelegram(req.query.cloud_id);
      }
    }

    if (!encryptedBuffer) {
      return res.status(404).json({ error: 'Fayl topilmadi.' });
    }

    // Decrypt on-the-fly
    let decryptedBuffer;
    try {
      decryptedBuffer = decryptBuffer(encryptedBuffer);
    } catch (decErr) {
      // If file was an older unencrypted upload, serve as-is
      decryptedBuffer = encryptedBuffer;
    }

    // Determine basic MIME type by extension
    const ext = path.extname(filename).toLowerCase();
    const mimeTypes = {
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.webp': 'image/webp',
      '.gif': 'image/gif',
      '.webm': 'audio/webm',
      '.ogg': 'audio/ogg',
      '.mp3': 'audio/mpeg',
      '.mp4': 'video/mp4',
      '.pdf': 'application/pdf',
      '.txt': 'text/plain',
    };

    const contentType = mimeTypes[ext] || 'application/octet-stream';
    res.setHeader('Content-Type', contentType);
    res.setHeader('Cache-Control', 'public, max-age=86400');
    return res.send(decryptedBuffer);
  } catch (err) {
    console.error('[File Stream Error]:', err);
    return res.status(500).json({ error: 'Faylni yuklashda xatolik.' });
  }
});

export default router;
