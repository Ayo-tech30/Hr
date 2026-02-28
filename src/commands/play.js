const { exec, execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const axios = require('axios');

const TEMP = path.join(__dirname, '../../temp');
if (!fs.existsSync(TEMP)) fs.mkdirSync(TEMP, { recursive: true });

// ============================================================
// CHECK WHICH DOWNLOADER IS AVAILABLE
// ============================================================
function getYtDlpPath() {
  const possible = ['yt-dlp', 'yt-dlp.exe', '/usr/local/bin/yt-dlp', '/usr/bin/yt-dlp'];
  for (const p of possible) {
    try { execSync(`${p} --version`, { stdio: 'ignore' }); return p; } catch {}
  }
  return null;
}

function getYoutubeDlPath() {
  try { execSync('youtube-dl --version', { stdio: 'ignore' }); return 'youtube-dl'; } catch {}
  return null;
}

// ============================================================
// SEARCH YOUTUBE FOR A VIDEO URL
// ============================================================
async function searchYouTube(query) {
  // Method 1: Use yt-dlp to search
  const ytdlp = getYtDlpPath();
  if (ytdlp) {
    try {
      const result = execSync(
        `${ytdlp} "ytsearch1:${query}" --get-id --no-warnings 2>/dev/null`,
        { encoding: 'utf8', timeout: 30000 }
      ).trim();
      if (result) return `https://www.youtube.com/watch?v=${result}`;
    } catch {}
  }

  // Method 2: YouTube search via scraping (no API key)
  try {
    const res = await axios.get(
      `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`,
      {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36',
          'Accept-Language': 'en-US,en;q=0.9',
        },
        timeout: 15000,
      }
    );
    const match = res.data.match(/"videoId":"([a-zA-Z0-9_-]{11})"/);
    if (match) return `https://www.youtube.com/watch?v=${match[1]}`;
  } catch {}

  // Method 3: Use invidious (YouTube frontend, no API key)
  try {
    const res = await axios.get(
      `https://invidious.io/search?q=${encodeURIComponent(query)}&type=video`,
      { timeout: 10000, headers: { 'User-Agent': 'Mozilla/5.0' } }
    );
    const match = res.data.match(/href="\/watch\?v=([a-zA-Z0-9_-]{11})"/);
    if (match) return `https://www.youtube.com/watch?v=${match[1]}`;
  } catch {}

  return null;
}

// ============================================================
// GET VIDEO INFO (title, duration, thumbnail)
// ============================================================
async function getVideoInfo(url) {
  const ytdlp = getYtDlpPath();
  if (ytdlp) {
    try {
      const raw = execSync(
        `${ytdlp} "${url}" --dump-json --no-warnings 2>/dev/null`,
        { encoding: 'utf8', timeout: 30000 }
      );
      const info = JSON.parse(raw);
      return {
        title: info.title,
        duration: info.duration,
        uploader: info.uploader,
        thumbnail: info.thumbnail,
        views: info.view_count,
      };
    } catch {}
  }

  // Fallback: scrape basic info
  try {
    const res = await axios.get(url, {
      headers: { 'User-Agent': 'Mozilla/5.0' },
      timeout: 10000,
    });
    const titleMatch = res.data.match(/<title>(.*?)<\/title>/);
    const title = titleMatch ? titleMatch[1].replace(' - YouTube', '') : 'Unknown Title';
    return { title, duration: 0, uploader: 'Unknown', thumbnail: null };
  } catch {}

  return { title: 'Unknown', duration: 0, uploader: 'Unknown', thumbnail: null };
}

// ============================================================
// DOWNLOAD AUDIO USING YT-DLP (PRIMARY METHOD)
// ============================================================
async function downloadWithYtDlp(url, outputPath) {
  const ytdlp = getYtDlpPath();
  if (!ytdlp) return false;

  return new Promise((resolve) => {
    const cmd = [
      ytdlp,
      `"${url}"`,
      '-x',                          // Extract audio only
      '--audio-format mp3',          // Convert to mp3
      '--audio-quality 0',           // Best quality
      '--no-playlist',
      '--no-warnings',
      `--output "${outputPath}"`,
      '--max-filesize 50m',          // WhatsApp limit
    ].join(' ');

    exec(cmd, { timeout: 120000 }, (err, stdout, stderr) => {
      if (err) { resolve(false); return; }
      resolve(fs.existsSync(outputPath));
    });
  });
}

// ============================================================
// DOWNLOAD AUDIO USING YTDL-CORE (FALLBACK)
// ============================================================
async function downloadWithYtdlCore(url, outputPath) {
  try {
    const ytdl = require('ytdl-core');
    const ffmpeg = require('fluent-ffmpeg');

    return new Promise((resolve) => {
      try {
        const stream = ytdl(url, {
          filter: 'audioonly',
          quality: 'highestaudio',
        });

        ffmpeg(stream)
          .audioBitrate(128)
          .toFormat('mp3')
          .on('end', () => resolve(fs.existsSync(outputPath)))
          .on('error', () => resolve(false))
          .save(outputPath);
      } catch {
        resolve(false);
      }
    });
  } catch {
    return false;
  }
}

// ============================================================
// DOWNLOAD AUDIO USING FREE API (LAST RESORT)
// ============================================================
async function downloadWithFreeApi(url, outputPath) {
  const videoId = url.match(/(?:v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/)?.[1];
  if (!videoId) return false;

  const apis = [
    // Various free yt-mp3 conversion APIs
    `https://api.vevioz.com/api/button/mp3/${videoId}`,
    `https://www.yt-download.org/api/button/mp3/${videoId}`,
    `https://loader.to/api/button/?url=https://www.youtube.com/watch?v=${videoId}&f=mp3`,
  ];

  for (const apiUrl of apis) {
    try {
      const res = await axios.get(apiUrl, {
        responseType: 'arraybuffer',
        timeout: 60000,
        headers: {
          'User-Agent': 'Mozilla/5.0',
          'Accept': 'audio/mpeg,audio/*;q=0.9,*/*;q=0.8',
        },
        maxRedirects: 10,
      });

      // Check if response is actually audio
      const contentType = res.headers['content-type'] || '';
      if (contentType.includes('audio') || contentType.includes('octet-stream')) {
        fs.writeFileSync(outputPath, Buffer.from(res.data));
        return fs.existsSync(outputPath) && fs.statSync(outputPath).size > 10000;
      }
    } catch {}
  }
  return false;
}

// ============================================================
// FORMAT DURATION
// ============================================================
function formatDuration(seconds) {
  if (!seconds) return 'Unknown';
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

// ============================================================
// MAIN PLAY COMMAND
// ============================================================
async function playCommand(ctx) {
  const { sock, msg, groupId, body } = ctx;

  if (!body) {
    return ctx.reply(
      '🎵 *Music Player*\n\n' +
      'Usage: *.play [song name or YouTube URL]*\n\n' +
      'Examples:\n' +
      '• .play Naruto opening\n' +
      '• .play https://youtu.be/...\n' +
      '• .play Believer Imagine Dragons'
    );
  }

  await ctx.react('🎵');
  const searching = await sock.sendMessage(groupId, {
    text: `🔍 *Searching for:* "${body}"\n\n⏳ Please wait...`
  }, { quoted: msg });

  try {
    // ── Step 1: Get YouTube URL ──────────────────────────────
    let videoUrl = body;
    if (!body.includes('youtube.com') && !body.includes('youtu.be')) {
      videoUrl = await searchYouTube(body);
      if (!videoUrl) {
        await sock.sendMessage(groupId, { delete: searching.key }).catch(() => {});
        await ctx.react('❌');
        return ctx.reply(
          `❌ *Could not find:* "${body}"\n\n` +
          `💡 Try:\n` +
          `• Being more specific\n` +
          `• Using the full song name\n` +
          `• Pasting a YouTube URL directly`
        );
      }
    }

    // ── Step 2: Get Video Info ───────────────────────────────
    const info = await getVideoInfo(videoUrl);
    const duration = info.duration || 0;

    // Don't download videos longer than 10 minutes
    if (duration > 600) {
      await sock.sendMessage(groupId, { delete: searching.key }).catch(() => {});
      await ctx.react('❌');
      return ctx.reply(`❌ Song is too long! (${formatDuration(duration)})\nMax: 10 minutes`);
    }

    // Update status
    await sock.sendMessage(groupId, { delete: searching.key }).catch(() => {});
    const downloading = await sock.sendMessage(groupId, {
      text:
        `🎵 *Found:* ${info.title}\n` +
        `👤 *Artist:* ${info.uploader || 'Unknown'}\n` +
        `⏱️ *Duration:* ${formatDuration(duration)}\n\n` +
        `⬇️ Downloading...`
    }, { quoted: msg });

    // ── Step 3: Download Audio ───────────────────────────────
    const filename = `audio_${Date.now()}.mp3`;
    const outputPath = path.join(TEMP, filename);
    let downloaded = false;

    // Try methods in order
    const ytdlpAvailable = !!getYtDlpPath();

    if (ytdlpAvailable) {
      downloaded = await downloadWithYtDlp(videoUrl, outputPath);
    }

    if (!downloaded) {
      downloaded = await downloadWithYtdlCore(videoUrl, outputPath);
    }

    if (!downloaded) {
      downloaded = await downloadWithFreeApi(videoUrl, outputPath);
    }

    // Delete downloading message
    await sock.sendMessage(groupId, { delete: downloading.key }).catch(() => {});

    if (!downloaded || !fs.existsSync(outputPath)) {
      await ctx.react('❌');
      return ctx.reply(
        `❌ *Download failed for:* ${info.title}\n\n` +
        `💡 *Fix:* Install yt-dlp on your system!\n` +
        `Windows: https://github.com/yt-dlp/yt-dlp/releases\n` +
        `Linux/Mac: pip install yt-dlp\n\n` +
        `🔗 Direct link: ${videoUrl}`
      );
    }

    // ── Step 4: Check File Size ──────────────────────────────
    const fileSizeMB = fs.statSync(outputPath).size / (1024 * 1024);
    if (fileSizeMB > 50) {
      fs.unlinkSync(outputPath);
      await ctx.react('❌');
      return ctx.reply(`❌ File too large (${fileSizeMB.toFixed(1)}MB)! WhatsApp limit is 50MB.`);
    }

    // ── Step 5: Send Audio ───────────────────────────────────
    const audioBuffer = fs.readFileSync(outputPath);

    // Always get thumbnail from YouTube CDN — works even without yt-dlp
    const videoId = videoUrl.match(/(?:v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/)?.[1];
    const thumbUrl = videoId
      ? `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`
      : info.thumbnail;

    // Send image with caption first
    if (thumbUrl) {
      try {
        const thumbRes = await axios.get(thumbUrl, {
          responseType: 'arraybuffer',
          timeout: 10000,
          headers: { 'User-Agent': 'Mozilla/5.0' },
        });
        await sock.sendMessage(groupId, {
          image: Buffer.from(thumbRes.data),
          caption:
            `╭━━〔 🎵 ᴍᴜꜱɪᴄ 〕━━┈⊷\n` +
            `┃✰│ 🎶 *${info.title}*\n` +
            `┃✰│ 👤 ${info.uploader || 'Unknown'}\n` +
            `┃✰│ ⏱️ ${formatDuration(duration)}\n` +
            `┃✰│ 📦 ${fileSizeMB.toFixed(1)}MB\n` +
            `╰━━━━━━━━━━━━━━━┈⊷`,
        }, { quoted: msg });
      } catch {}
    }

    // Send the audio file
    await sock.sendMessage(groupId, {
      audio: audioBuffer,
      mimetype: 'audio/mpeg',
      fileName: `${info.title}.mp3`,
      ptt: false,
    }, { quoted: msg });

    // Cleanup
    fs.unlinkSync(outputPath);
    await ctx.react('✅');

  } catch (err) {
    await ctx.react('❌');
    await ctx.reply(`❌ An error occurred: ${err.message}`);
    // Cleanup temp file if exists
    try {
      const files = fs.readdirSync(TEMP).filter(f => f.startsWith('audio_'));
      files.forEach(f => {
        try { fs.unlinkSync(path.join(TEMP, f)); } catch {}
      });
    } catch {}
  }
}

module.exports = { playCommand };
