const axios = require('axios');
const { Database } = require('../database/firebase');

const NEKOS_BASE = 'https://nekos.fun/api';

// SFW endpoints
const SFW_ENDPOINTS = {
  waifu: 'waifu',
  neko: 'neko',
  maid: 'maid',
  oppai: 'waifu',
  selfies: 'selfies',
  uniform: 'uniform',
  'mori-calliope': 'waifu',
  'raiden-shogun': 'waifu',
  'kamisato-ayaka': 'waifu',
};

// NSFW endpoints (requires group NSFW enabled)
const NSFW_ENDPOINTS = {
  milf: 'milf',
  ass: 'ass',
  hentai: 'hentai',
  oral: 'oral',
  ecchi: 'ecchi',
  paizuri: 'paizuri',
  ero: 'ero',
  ehentai: 'ero',
  nhentai: 'hentai',
};

async function fetchAnimeImage(endpoint) {
  try {
    const res = await axios.get(`${NEKOS_BASE}/${endpoint}`, { timeout: 10000 });
    return res.data.url || res.data.image || null;
  } catch (e) {
    // Fallback to waifu.pics
    try {
      const nsfwEndpoints = Object.keys(NSFW_ENDPOINTS);
      const isNsfw = nsfwEndpoints.includes(endpoint);
      const base = isNsfw ? 'https://api.waifu.pics/nsfw/' : 'https://api.waifu.pics/sfw/';
      const safeEndpoint = isNsfw ? 'waifu' : 'waifu';
      const res2 = await axios.get(`${base}${safeEndpoint}`, { timeout: 10000 });
      return res2.data?.url || null;
    } catch { return null; }
  }
}

async function sendAnimeImage(ctx, endpoint, caption) {
  await ctx.react('⏳');
  const url = await fetchAnimeImage(endpoint);
  if (!url) {
    await ctx.react('❌');
    return ctx.reply('❌ Failed to fetch image. Try again!');
  }
  try {
    const axios2 = require('axios');
    const res = await axios2.get(url, { responseType: 'arraybuffer', timeout: 15000 });
    const buffer = Buffer.from(res.data);
    await ctx.sock.sendMessage(ctx.groupId, { image: buffer, caption }, { quoted: ctx.msg });
    await ctx.react('✅');
  } catch (e) {
    await ctx.reply(`🖼️ ${caption}\n\n${url}`);
  }
}

// SFW commands
const sfwCommands = {};
for (const [cmd, endpoint] of Object.entries(SFW_ENDPOINTS)) {
  sfwCommands[cmd] = async (ctx) => {
    const captions = {
      waifu: '🌸 Here\'s your waifu!',
      neko: '🐱 Neko~',
      maid: '🍵 Your maid awaits!',
      oppai: '🌸 Anime time~',
      selfies: '📸 Anime selfie!',
      uniform: '👕 Uniform~',
      'mori-calliope': '💀 Mori Calliope!',
      'raiden-shogun': '⚡ Raiden Shogun!',
      'kamisato-ayaka': '❄️ Kamisato Ayaka!',
    };
    await sendAnimeImage(ctx, endpoint, captions[cmd] || '🌸 Anime~');
  };
}

// NSFW commands
const nsfwCommands = {};
for (const [cmd, endpoint] of Object.entries(NSFW_ENDPOINTS)) {
  nsfwCommands[cmd] = async (ctx) => {
    if (!ctx.isGroup) return ctx.reply('❌ NSFW commands only work in groups!');
    const settings = await Database.getGroup(ctx.groupId);
    if (!settings.nsfw_enabled) return ctx.reply('❌ NSFW is disabled in this group!\nAdmin use: .nude on');
    await sendAnimeImage(ctx, endpoint, '🔞 NSFW Content');
  };
}

// NSFW toggle command
const nsfwToggle = {
  async nude(ctx) {
    if (!ctx.isGroup) return ctx.reply('❌ Groups only!');
    if (!ctx.isAdmin) return ctx.reply('❌ Admins only!');
    const state = ctx.body.toLowerCase();
    if (!['on', 'off'].includes(state)) return ctx.reply('Usage: .nude on/off');
    await Database.setGroup(ctx.groupId, { nsfw_enabled: state === 'on' });
    await ctx.reply(`🔞 NSFW content ${state === 'on' ? '🟢 enabled' : '🔴 disabled'}!`);
  }
};

module.exports = { ...sfwCommands, ...nsfwCommands, ...nsfwToggle };

// Extra normalized aliases for hyphenated commands (called after normalization)
module.exports.moricalliope  = module.exports['mori-calliope']  || sfwCommands['mori-calliope'];
module.exports.raidenshogun  = module.exports['raiden-shogun']  || sfwCommands['raiden-shogun'];
module.exports.kamisatoayaka = module.exports['kamisato-ayaka'] || sfwCommands['kamisato-ayaka'];
