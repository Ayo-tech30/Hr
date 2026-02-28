const { playCommand } = require('./play');
const axios = require('axios');
const config = require('../../config');

async function downloadVideo(url, platform) {
  // Using a free public API endpoint for downloading
  try {
    // Try cobalt.tools API (free, no key needed)
    const res = await axios.post('https://api.cobalt.tools/api/json', {
      url,
      vCodec: 'h264',
      vQuality: '720',
      aFormat: 'mp3',
      isAudioOnly: false,
    }, {
      headers: { 'Accept': 'application/json', 'Content-Type': 'application/json' },
      timeout: 30000
    });
    if (res.data?.url) return res.data.url;
    if (res.data?.urls) return res.data.urls;
  } catch (e) {}
  return null;
}

module.exports = {
  async instagram(ctx) {
    if (!ctx.body) return ctx.reply('Usage: .instagram [URL]');
    await ctx.react('⏳');
    await ctx.reply(`📸 *Instagram Downloader*\n\n🔗 URL: ${ctx.body}\n\n⏳ Processing...\n\n💡 If download fails, try: https://snapinsta.app`);
    const url = await downloadVideo(ctx.body, 'instagram');
    if (url) {
      await ctx.reply(`✅ *Download ready!*\n\n${url}`);
    } else {
      await ctx.reply(`❌ Could not download. Try:\n🔗 https://snapinsta.app\n🔗 https://fastdl.app`);
    }
    await ctx.react('✅');
  },

  async tiktok(ctx) {
    if (!ctx.body) return ctx.reply('Usage: .tiktok [URL]');
    await ctx.react('⏳');
    await ctx.reply(`🎵 *TikTok Downloader*\n\n🔗 URL: ${ctx.body}\n\n⏳ Processing...`);
    const url = await downloadVideo(ctx.body, 'tiktok');
    if (url) {
      await ctx.reply(`✅ *Download ready!*\n\n${url}`);
    } else {
      await ctx.reply(`❌ Could not download. Try:\n🔗 https://snaptik.app\n🔗 https://tikmate.online`);
    }
    await ctx.react('✅');
  },

  async youtube(ctx) {
    if (!ctx.body) return ctx.reply('Usage: .youtube [URL or search term]\nExample: .yt Naruto opening');
    await ctx.react('⏳');

    const isUrl = ctx.body.includes('youtube.com') || ctx.body.includes('youtu.be');

    try {
      let videoId = null;
      let title = ctx.body;
      let channel = 'Unknown';
      let duration = 'Unknown';
      let views = 'Unknown';
      let videoUrl = ctx.body;

      if (!isUrl) {
        // Search YouTube
        const searchRes = await axios.get(
          `https://www.youtube.com/results?search_query=${encodeURIComponent(ctx.body)}`,
          { headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120' }, timeout: 10000 }
        );
        const idMatch = searchRes.data.match(/"videoId":"([a-zA-Z0-9_-]{11})"/);
        const titleMatch = searchRes.data.match(/"title":{"runs":\[{"text":"([^"]+)"/);
        const channelMatch = searchRes.data.match(/"ownerText":{"runs":\[{"text":"([^"]+)"/);
        const viewMatch = searchRes.data.match(/"viewCountText":{"simpleText":"([^"]+)"/);

        if (idMatch) {
          videoId = idMatch[1];
          videoUrl = `https://www.youtube.com/watch?v=${videoId}`;
          if (titleMatch) title = titleMatch[1];
          if (channelMatch) channel = channelMatch[1];
          if (viewMatch) views = viewMatch[1];
        }
      } else {
        const idMatch = ctx.body.match(/(?:v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
        if (idMatch) videoId = idMatch[1];

        // Scrape info from page
        try {
          const res = await axios.get(ctx.body, {
            headers: { 'User-Agent': 'Mozilla/5.0' },
            timeout: 10000
          });
          const titleM = res.data.match(/<title>(.+?) - YouTube<\/title>/);
          const channelM = res.data.match(/"author":"([^"]+)"/);
          const viewM = res.data.match(/"viewCount":"(\d+)"/);
          const durM = res.data.match(/"lengthSeconds":"(\d+)"/);
          if (titleM) title = titleM[1];
          if (channelM) channel = channelM[1];
          if (viewM) {
            const v = parseInt(viewM[1]);
            views = v > 1000000 ? (v / 1000000).toFixed(1) + 'M views'
                  : v > 1000 ? (v / 1000).toFixed(1) + 'K views'
                  : v + ' views';
          }
          if (durM) {
            const s = parseInt(durM[1]);
            duration = `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`;
          }
        } catch {}
      }

      // Try download link
      const dlUrl = await downloadVideo(videoUrl, 'youtube');
      const thumb = videoId ? `https://img.youtube.com/vi/${videoId}/hqdefault.jpg` : null;

      const caption =
        `╭━━━━━━━━━━━━━━━━━━━━━━╮\n` +
        `┃  📺 *YOUTUBE SEARCH*  ┃\n` +
        `╰━━━━━━━━━━━━━━━━━━━━━━╯\n\n` +
        `🎬 *Title*\n` +
        `┗━ ${title.slice(0, 60)}${title.length > 60 ? '...' : ''}\n\n` +
        `👤 *Channel*\n` +
        `┗━ ${channel}\n\n` +
        (views !== 'Unknown' ? `👁️ *Views*\n┗━ ${views}\n\n` : '') +
        (duration !== 'Unknown' ? `⏱️ *Duration*\n┗━ ${duration}\n\n` : '') +
        `🔗 *Link*\n` +
        `┗━ ${videoUrl}\n\n` +
        `━━━━━━━━━━━━━━━━━━━━━━━\n` +
        (dlUrl
          ? `✅ *Download Link:*\n${typeof dlUrl === 'string' ? dlUrl : dlUrl[0]}\n\n🎵 Audio only: *.play ${isUrl ? videoUrl : ctx.body}*`
          : `🎵 *Get audio:* *.play ${isUrl ? videoUrl : ctx.body}*\n🎬 *Download:* https://y2mate.com\n\n⋆☽ Shadow Garden ☾⋆`
        );

      if (thumb) {
        try {
          const thumbRes = await axios.get(thumb, { responseType: 'arraybuffer', timeout: 8000 });
          await ctx.sock.sendMessage(ctx.groupId, {
            image: Buffer.from(thumbRes.data),
            caption
          }, { quoted: ctx.msg });
          await ctx.react('✅');
          return;
        } catch {}
      }

      await ctx.reply(caption);

    } catch {
      await ctx.reply(
        `🔍 *YouTube*\n\n` +
        `Query: *${ctx.body}*\n\n` +
        `🔗 https://www.youtube.com/results?search_query=${encodeURIComponent(ctx.body)}\n\n` +
        `💡 Use *.play ${ctx.body}* to download audio!`
      );
    }
    await ctx.react('✅');
  },

  async twitter(ctx) {
    if (!ctx.body) return ctx.reply('Usage: .twitter [URL]');
    await ctx.react('⏳');
    const url = await downloadVideo(ctx.body, 'twitter');
    if (url) {
      await ctx.reply(`✅ *Twitter Download*\n\n${url}`);
    } else {
      await ctx.reply(`❌ Could not download. Try:\n🔗 https://twittervideodownloader.com`);
    }
    await ctx.react('✅');
  },

  async facebook(ctx) {
    if (!ctx.body) return ctx.reply('Usage: .facebook [URL]');
    await ctx.react('⏳');
    const url = await downloadVideo(ctx.body, 'facebook');
    if (url) {
      await ctx.reply(`✅ *Facebook Download*\n\n${url}`);
    } else {
      await ctx.reply(`❌ Could not download. Try:\n🔗 https://fbdownloader.net`);
    }
    await ctx.react('✅');
  },
  async play(ctx) {
    return playCommand(ctx);
  },

  async pinterest(ctx) {
    if (!ctx.body) return ctx.reply('Usage: .pinterest [search term]');
    await ctx.react('⏳');
    try {
      // Try to get Pinterest images via scraping
      const query = encodeURIComponent(ctx.body);
      await ctx.reply(
        `📌 *Pinterest Search*\n\nQuery: "${ctx.body}"\n\n` +
        `🔗 View on Pinterest: https://www.pinterest.com/search/pins/?q=${query}\n\n` +
        `_Direct image fetch requires Pinterest API. Set PINTEREST_API_KEY in config.js_`
      );
    } catch (e) {
      await ctx.reply('❌ Pinterest search failed!');
    }
    await ctx.react('✅');
  },

  async sauce(ctx) {
    const { msg, sock, groupId } = ctx;
    const quoted = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;
    if (!quoted?.imageMessage) return ctx.reply('❌ Reply to an image to reverse search!');
    await ctx.react('⏳');
    await ctx.reply(`🔍 *Reverse Image Search*\n\n⏳ Searching...\n\n_SauceNAO integration requires API key_\n_Set SAUCENAO_API_KEY in config.js_\n\nManual search: https://saucenao.com`);
    await ctx.react('✅');
  },

  async wallpaper(ctx) {
    if (!ctx.body) return ctx.reply('Usage: .wallpaper [search term]');
    await ctx.react('⏳');
    try {
      // Use Unsplash free API
      const res = await axios.get(`https://source.unsplash.com/1920x1080/?${encodeURIComponent(ctx.body)}`, {
        responseType: 'arraybuffer',
        timeout: 15000,
        maxRedirects: 5
      });
      await ctx.sock.sendMessage(ctx.groupId, {
        image: Buffer.from(res.data),
        caption: `🖼️ Wallpaper: *${ctx.body}*\n📸 Source: Unsplash`
      }, { quoted: ctx.msg });
    } catch (e) {
      await ctx.reply(`🖼️ Wallpaper for: "${ctx.body}"\n\n🔗 https://unsplash.com/s/photos/${encodeURIComponent(ctx.body)}`);
    }
    await ctx.react('✅');
  },

  async image(ctx) {
    if (!ctx.body) return ctx.reply('Usage: .image [search term]');
    await ctx.react('⏳');
    try {
      const res = await axios.get(`https://source.unsplash.com/800x600/?${encodeURIComponent(ctx.body)}`, {
        responseType: 'arraybuffer',
        timeout: 15000,
        maxRedirects: 5
      });
      await ctx.sock.sendMessage(ctx.groupId, {
        image: Buffer.from(res.data),
        caption: `🖼️ Image: *${ctx.body}*`
      }, { quoted: ctx.msg });
    } catch (e) {
      await ctx.reply(`🔍 Image search for: "${ctx.body}"\n\n🔗 https://unsplash.com/s/photos/${encodeURIComponent(ctx.body)}`);
    }
    await ctx.react('✅');
  },

  async lyrics(ctx) {
    if (!ctx.body) return ctx.reply('Usage: .lyrics [song name]');
    await ctx.react('⏳');
    try {
      const res = await axios.get(`https://lyrist.vercel.app/api/${encodeURIComponent(ctx.body)}`, { timeout: 10000 });
      if (res.data?.lyrics) {
        const lyrics = res.data.lyrics.slice(0, 2000);
        await ctx.reply(`🎵 *${res.data.title}* by *${res.data.artist}*\n\n${lyrics}${res.data.lyrics.length > 2000 ? '\n\n... (lyrics cut off, search full on Genius)' : ''}`);
      } else {
        await ctx.reply(`❌ Lyrics not found for "${ctx.body}"\n\n🔗 Search on Genius: https://genius.com/search?q=${encodeURIComponent(ctx.body)}`);
      }
    } catch (e) {
      await ctx.reply(`❌ Could not fetch lyrics.\n\n🔗 Try: https://genius.com/search?q=${encodeURIComponent(ctx.body)}`);
    }
    await ctx.react('✅');
  },
};
