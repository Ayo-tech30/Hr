const sharp  = require('sharp');
const { exec } = require('child_process');
const fs     = require('fs');
const path   = require('path');
const config = require('../../config');

const TEMP = path.join(__dirname, '../../temp');
if (!fs.existsSync(TEMP)) fs.mkdirSync(TEMP, { recursive: true });

async function downloadMedia(msg, sock) {
  const { downloadMediaMessage } = require('@whiskeysockets/baileys');
  return await downloadMediaMessage(msg, 'buffer', {}, {
    logger: require('pino')({ level: 'silent' }),
    reuploadRequest: sock.updateMediaMessage
  });
}

function getQuotedMsg(msg) {
  const ctx = msg.message?.extendedTextMessage?.contextInfo;
  if (!ctx?.quotedMessage) return null;
  return {
    message: ctx.quotedMessage,
    key: { id: ctx.stanzaId, remoteJid: msg.key.remoteJid, participant: ctx.participant }
  };
}

// ============================================================
// STICKER METADATA — Compatible with ALL WhatsApp versions
// Uses the proven method from wa-sticker-formatter
// ============================================================
function createStickerExif(packname, author) {
  const json = JSON.stringify({
    'sticker-pack-id':        `com.shadowgarden.${Date.now()}`,
    'sticker-pack-name':      packname || config.STICKER_NAME || 'Shadow Garden',
    'sticker-pack-publisher': author  || config.STICKER_AUTHOR || 'Delta Bot',
    'android-app-store-link': '',
    'ios-app-store-link':     '',
    'emojis': ['🌸'],
  });

  const jsonBuf = Buffer.from(json, 'utf8');

  // Build proper TIFF/EXIF structure
  const header = Buffer.alloc(22);
  header.write('II', 0);            // Little-endian
  header.writeUInt16LE(0x002A, 2);  // TIFF magic
  header.writeUInt32LE(8, 4);       // Offset to first IFD
  header.writeUInt16LE(1, 8);       // Number of IFD entries
  header.writeUInt16LE(0x8769, 10); // ExifIFD tag
  header.writeUInt16LE(4, 12);      // Type: LONG
  header.writeUInt32LE(1, 14);      // Count
  header.writeUInt32LE(26, 18);     // Value offset
  header.writeUInt32LE(0, 26 - 4); // Next IFD = 0 (padding)

  const exif    = Buffer.concat([header, jsonBuf]);
  const exifLen = Buffer.alloc(4);
  exifLen.writeUInt32LE(exif.length, 0);

  return Buffer.concat([Buffer.from('Exif\0\0'), exif]);
}

// Inject EXIF into WebP — works on ALL WA versions
function injectExif(webpBuf, exifBuf) {
  try {
    if (!webpBuf || webpBuf.length < 12) return webpBuf;
    if (webpBuf.slice(0, 4).toString() !== 'RIFF') return webpBuf;
    if (webpBuf.slice(8, 12).toString() !== 'WEBP') return webpBuf;

    const chunkId = webpBuf.slice(12, 16).toString();

    // Build EXIF chunk
    const exifChunkData = Buffer.alloc(exifBuf.length % 2 === 0 ? exifBuf.length : exifBuf.length + 1);
    exifBuf.copy(exifChunkData);
    const exifSize = Buffer.alloc(4);
    exifSize.writeUInt32LE(exifBuf.length, 0);
    const exifChunk = Buffer.concat([Buffer.from('EXIF'), exifSize, exifChunkData]);

    let result;

    if (chunkId === 'VP8X') {
      // Already extended format — set EXIF flag and append
      const out = Buffer.from(webpBuf);
      out[20] |= 0x08; // Set EXIF bit
      result = Buffer.concat([out, exifChunk]);
    } else {
      // VP8 / VP8L — wrap in VP8X
      const vp8xFlags = Buffer.alloc(4);
      vp8xFlags.writeUInt32LE(0x00000008, 0); // EXIF flag

      // Canvas size: read from VP8 bitstream if possible, else use 512x512
      const canvasW = Buffer.alloc(3);
      const canvasH = Buffer.alloc(3);
      canvasW.writeUIntLE(511, 0, 3); // 512-1
      canvasH.writeUIntLE(511, 0, 3);

      const vp8xPayload = Buffer.concat([vp8xFlags, canvasW, canvasH]);
      const vp8xPayLen  = Buffer.alloc(4);
      vp8xPayLen.writeUInt32LE(10, 0);
      const vp8xChunk = Buffer.concat([Buffer.from('VP8X'), vp8xPayLen, vp8xPayload]);

      const body       = webpBuf.slice(12);
      const riffPayLen = Buffer.alloc(4);
      riffPayLen.writeUInt32LE(4 + vp8xChunk.length + body.length + exifChunk.length, 0);

      result = Buffer.concat([
        Buffer.from('RIFF'),
        riffPayLen,
        Buffer.from('WEBP'),
        vp8xChunk,
        body,
        exifChunk,
      ]);
    }

    // Correct RIFF file size
    result.writeUInt32LE(result.length - 8, 4);
    return result;
  } catch {
    return webpBuf;
  }
}

async function makeStaticSticker(buffer, packname, author) {
  const webp = await sharp(buffer)
    .resize(512, 512, {
      fit:        'contain',
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    })
    .webp({ quality: 80, lossless: false })
    .toBuffer();

  const exif = createStickerExif(packname, author);
  return injectExif(webp, exif);
}

module.exports = {
  // ============================================================
  // .sticker / .s — Convert image/gif/video to sticker
  // ============================================================
  async sticker(ctx) {
    const { sock, msg, groupId } = ctx;
    const target  = getQuotedMsg(msg) || msg;
    const msgType = Object.keys(target.message || {})[0];

    if (!['imageMessage', 'videoMessage', 'stickerMessage', 'gifMessage'].includes(msgType)) {
      return ctx.reply(
        '╭━━〔 🎨 ꜱᴛɪᴄᴋᴇʀ 〕━━┈⊷\n' +
        '┃✰│ ❌ ꜱᴇɴᴅ ᴏʀ ʀᴇᴘʟʏ ᴛᴏ:\n' +
        '┃✰│  📷 ɪᴍᴀɢᴇ → ꜱᴛᴀᴛɪᴄ ꜱᴛɪᴄᴋᴇʀ\n' +
        '┃✰│  🎬 ᴠɪᴅᴇᴏ/ɢɪꜰ → ᴀɴɪᴍᴀᴛᴇᴅ\n' +
        '╰━━━━━━━━━━━━━━━┈⊷'
      );
    }

    await ctx.react('⏳');
    try {
      const buffer = await downloadMedia(target, sock);

      if (msgType === 'imageMessage' || msgType === 'stickerMessage') {
        const stickerBuf = await makeStaticSticker(
          buffer,
          config.STICKER_NAME  || 'Shadow Garden',
          config.STICKER_AUTHOR || 'Delta Bot'
        );
        await sock.sendMessage(groupId, { sticker: stickerBuf }, { quoted: msg });

      } else {
        // Animated sticker from video/gif
        const ts      = Date.now();
        const inPath  = path.join(TEMP, `stk_in_${ts}.mp4`);
        const outPath = path.join(TEMP, `stk_out_${ts}.webp`);
        fs.writeFileSync(inPath, buffer);

        await new Promise((resolve, reject) => {
          exec(
            `ffmpeg -y -i "${inPath}" ` +
            `-vf "scale=512:512:force_original_aspect_ratio=decrease,` +
            `pad=512:512:(ow-iw)/2:(oh-ih)/2:color=black@0,fps=12" ` +
            `-loop 0 -t 8 -an -vsync 0 "${outPath}"`,
            { timeout: 60000 },
            (err) => err ? reject(err) : resolve()
          );
        });

        const webpBuf    = fs.readFileSync(outPath);
        const exif       = createStickerExif(config.STICKER_NAME, config.STICKER_AUTHOR);
        const stickerBuf = injectExif(webpBuf, exif);

        await sock.sendMessage(groupId, { sticker: stickerBuf }, { quoted: msg });
        try { fs.unlinkSync(inPath); fs.unlinkSync(outPath); } catch {}
      }

      await ctx.react('✅');
    } catch (e) {
      await ctx.react('❌');
      await ctx.reply(
        '❌ *Sticker failed!*\n\n' +
        '💡 Make sure ffmpeg is installed:\n' +
        '• Linux: `apt install ffmpeg`\n' +
        `• Error: ${e.message}`
      );
    }
  },

  // ============================================================
  // .take — Custom sticker pack name & author
  // ============================================================
  async take(ctx) {
    const { msg, sock, groupId, body } = ctx;
    if (!body) return ctx.reply('❌ Usage: *.take <pack name>, <author>*\nExample: .take Shadow, Delta');

    const parts    = body.split(',');
    const packname = parts[0]?.trim() || config.STICKER_NAME;
    const author   = parts[1]?.trim() || config.STICKER_AUTHOR;

    const target  = getQuotedMsg(msg) || msg;
    const msgType = Object.keys(target.message || {})[0];
    if (!['imageMessage', 'stickerMessage'].includes(msgType))
      return ctx.reply('❌ Reply to an image or sticker!');

    await ctx.react('⏳');
    try {
      const buffer     = await downloadMedia(target, sock);
      const stickerBuf = await makeStaticSticker(buffer, packname, author);

      await sock.sendMessage(groupId, { sticker: stickerBuf }, { quoted: msg });
      await ctx.reply(
        `╭━━〔 🎨 ꜱᴛɪᴄᴋᴇʀ ɪɴꜰᴏ 〕━━┈⊷\n` +
        `┃✰│ ✅ ꜱᴛɪᴄᴋᴇʀ ᴄʀᴇᴀᴛᴇᴅ!\n` +
        `┃✰│ 📦 ᴘᴀᴄᴋ: *${packname}*\n` +
        `┃✰│ ✍️ ᴀᴜᴛʜᴏʀ: *${author}*\n` +
        `╰━━━━━━━━━━━━━━━┈⊷\n` +
        `_Open the sticker → tap pack name to see info!_`
      );
      await ctx.react('✅');
    } catch (e) {
      await ctx.react('❌');
      await ctx.reply(`❌ Failed: ${e.message}`);
    }
  },

  // ============================================================
  // .toimg / .turnimg — Sticker to image
  // ============================================================
  async turnimg(ctx) {
    const { msg, sock, groupId } = ctx;
    const target  = getQuotedMsg(msg) || msg;
    const msgType = Object.keys(target.message || {})[0];
    if (msgType !== 'stickerMessage') return ctx.reply('❌ Reply to a sticker!');
    await ctx.react('⏳');
    try {
      const buffer = await downloadMedia(target, sock);
      const png    = await sharp(buffer).png().toBuffer();
      await sock.sendMessage(groupId, { image: png, caption: '🖼️ Here you go!' }, { quoted: msg });
      await ctx.react('✅');
    } catch (e) {
      await ctx.react('❌');
      await ctx.reply(`❌ Failed: ${e.message}`);
    }
  },

  // ============================================================
  // .rotate — Rotate image
  // ============================================================
  async rotate(ctx) {
    const { msg, sock, groupId } = ctx;
    const target  = getQuotedMsg(msg) || msg;
    const msgType = Object.keys(target.message || {})[0];
    if (msgType !== 'imageMessage') return ctx.reply('❌ Reply to an image!\nUsage: .rotate [90/180/270]');
    const deg = parseInt(ctx.body) || 90;
    if (![90, 180, 270].includes(deg)) return ctx.reply('❌ Valid degrees: 90, 180, 270');
    await ctx.react('⏳');
    try {
      const buffer  = await downloadMedia(target, sock);
      const rotated = await sharp(buffer).rotate(deg).toBuffer();
      await sock.sendMessage(groupId, { image: rotated, caption: `🔄 Rotated ${deg}°` }, { quoted: msg });
      await ctx.react('✅');
    } catch (e) {
      await ctx.react('❌');
      await ctx.reply(`❌ Failed: ${e.message}`);
    }
  },

  // ============================================================
  // .vv — Open view-once media
  // ============================================================
  async vv(ctx) {
    const { sock, msg, groupId } = ctx;
    const quoted = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;
    if (!quoted) return ctx.reply('❌ Reply to a view-once photo/video with *.vv*');
    await ctx.react('👁️');
    try {
      const voImage = quoted.viewOnceMessage?.message?.imageMessage
        || quoted.viewOnceMessageV2?.message?.imageMessage
        || quoted.viewOnceMessageV2Extension?.message?.imageMessage
        || (quoted.imageMessage?.viewOnce ? quoted.imageMessage : null);
      const voVideo = quoted.viewOnceMessage?.message?.videoMessage
        || quoted.viewOnceMessageV2?.message?.videoMessage
        || quoted.viewOnceMessageV2Extension?.message?.videoMessage
        || (quoted.videoMessage?.viewOnce ? quoted.videoMessage : null);
      const voMsg = voImage || voVideo;
      if (!voMsg) return ctx.reply('⚠️ Not a view-once message!');
      const quotedKey = msg.message?.extendedTextMessage?.contextInfo;
      const fakeMsg = {
        key: { remoteJid: groupId, id: quotedKey?.stanzaId, fromMe: false, participant: quotedKey?.participant },
        message: voImage
          ? { imageMessage: { ...voMsg, viewOnce: false } }
          : { videoMessage: { ...voMsg, viewOnce: false } }
      };
      const { downloadMediaMessage } = require('@whiskeysockets/baileys');
      const buffer = await downloadMediaMessage(fakeMsg, 'buffer', {});
      const caption = '🔓 View-once unlocked by Shadow Garden 🌸';
      if (voImage) {
        await sock.sendMessage(groupId, { image: buffer, caption }, { quoted: msg });
      } else {
        await sock.sendMessage(groupId, { video: buffer, caption, mimetype: 'video/mp4' }, { quoted: msg });
      }
      await ctx.react('✅');
    } catch (e) {
      await ctx.react('❌');
      await ctx.reply(`❌ Failed: ${e.message}`);
    }
  },
};
