const axios = require('axios');
const fs = require('fs');
const path = require('path');

// ============================================================
// SUDO NUMBERS - Loaded from file, persisted across restarts
// ============================================================
const SUDO_FILE = path.join(__dirname, '../../assets/sudo.json');

function loadSudo() {
  try {
    if (fs.existsSync(SUDO_FILE)) return JSON.parse(fs.readFileSync(SUDO_FILE, 'utf8'));
  } catch {}
  return [];
}

function saveSudo(list) {
  try {
    fs.mkdirSync(path.dirname(SUDO_FILE), { recursive: true });
    fs.writeFileSync(SUDO_FILE, JSON.stringify(list, null, 2));
  } catch {}
}

function addSudo(number) {
  const list = loadSudo();
  const jid = number.includes('@') ? number : `${number}@s.whatsapp.net`;
  if (!list.includes(jid)) { list.push(jid); saveSudo(list); }
  return list;
}

function removeSudo(number) {
  let list = loadSudo();
  const jid = number.includes('@') ? number : `${number}@s.whatsapp.net`;
  list = list.filter(n => n !== jid);
  saveSudo(list);
  return list;
}

function isSudo(sender) {
  const list = loadSudo();
  return list.includes(sender);
}

// ============================================================
// OWNER CHECK
// ============================================================
const { config } = (() => {
  try { return { config: require('../../config') }; } catch { return { config: { OWNER_NUMBER: '2349049460676' } }; }
})();

function isOwner(sender) {
  if (!sender) return false;
  const senderNum = sender.split(':')[0].split('@')[0];
  const ownerNum  = config.OWNER_NUMBER.replace(/\D/g, '');
  if (senderNum === ownerNum) return true;
  // Also check full JID
  const ownerJid = `${ownerNum}@s.whatsapp.net`;
  if (sender === ownerJid) return true;
  return isSudo(sender);
}

// ============================================================
// ANIME GIF FETCHER - NO API KEY NEEDED
// Multiple free sources with automatic failover
// ============================================================
const ANIME_GIF_SOURCES = {
  hug:     ['https://api.waifu.pics/sfw/hug',      'https://nekos.life/api/v2/img/hug',     'https://api.otakugifs.xyz/gif?reaction=hug'],
  kiss:    ['https://api.waifu.pics/sfw/kiss',     'https://nekos.life/api/v2/img/kiss',    'https://api.otakugifs.xyz/gif?reaction=kiss'],
  slap:    ['https://api.waifu.pics/sfw/slap',     'https://nekos.life/api/v2/img/slap',    'https://api.otakugifs.xyz/gif?reaction=slap'],
  pat:     ['https://api.waifu.pics/sfw/pat',      'https://nekos.life/api/v2/img/pat',     'https://api.otakugifs.xyz/gif?reaction=pat'],
  wave:    ['https://api.waifu.pics/sfw/wave',     'https://api.otakugifs.xyz/gif?reaction=wave'],
  dance:   ['https://api.waifu.pics/sfw/dance',    'https://api.otakugifs.xyz/gif?reaction=dance'],
  sad:     ['https://api.waifu.pics/sfw/cry',      'https://api.otakugifs.xyz/gif?reaction=cry'],
  smile:   ['https://api.waifu.pics/sfw/smile',    'https://api.otakugifs.xyz/gif?reaction=smile'],
  laugh:   ['https://api.waifu.pics/sfw/laugh',    'https://api.otakugifs.xyz/gif?reaction=laugh'],
  punch:   ['https://api.waifu.pics/sfw/punch',    'https://api.otakugifs.xyz/gif?reaction=punch'],
  kill:    ['https://api.waifu.pics/sfw/kill',     'https://api.otakugifs.xyz/gif?reaction=kill'],
  hit:     ['https://api.waifu.pics/sfw/kick',     'https://api.otakugifs.xyz/gif?reaction=kick'],
  bonk:    ['https://api.waifu.pics/sfw/bonk',     'https://api.otakugifs.xyz/gif?reaction=bonk'],
  lick:    ['https://api.waifu.pics/sfw/lick',     'https://api.otakugifs.xyz/gif?reaction=lick'],
  tickle:  ['https://api.waifu.pics/sfw/tickle',   'https://api.otakugifs.xyz/gif?reaction=tickle'],
  shrug:   ['https://api.waifu.pics/sfw/shrug',    'https://api.otakugifs.xyz/gif?reaction=shrug'],
  wank:    ['https://api.waifu.pics/nsfw/wank'],
  fuck:    ['https://api.waifu.pics/nsfw/fuck'],
  kidnap:  ['https://api.waifu.pics/sfw/handhold', 'https://api.otakugifs.xyz/gif?reaction=handhold'],
  jihad:   ['https://api.otakugifs.xyz/gif?reaction=explode', 'https://api.waifu.pics/sfw/wave'],
  crusade: ['https://api.waifu.pics/sfw/wave',     'https://api.otakugifs.xyz/gif?reaction=wave'],
};

// Scrape giphy for anime GIFs as last resort (no API key)
async function scrapeGiphyGif(query) {
  try {
    const searchUrl = `https://giphy.com/search/${encodeURIComponent('anime ' + query)}`;
    const res = await axios.get(searchUrl, {
      timeout: 8000,
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36' }
    });
    // Extract media URLs from giphy HTML
    const matches = res.data.match(/https:\/\/media[0-9]*\.giphy\.com\/media\/[^"]+\/giphy\.gif/g);
    if (matches && matches.length > 0) {
      return matches[Math.floor(Math.random() * Math.min(matches.length, 5))];
    }
  } catch {}
  return null;
}

async function getAnimeGif(action) {
  const sources = ANIME_GIF_SOURCES[action] || ANIME_GIF_SOURCES['wave'];

  for (const url of sources) {
    try {
      const res = await axios.get(url, {
        timeout: 8000,
        headers: { 'User-Agent': 'ShadowGardenBot/2.0', 'Accept': 'application/json' }
      });
      // All these APIs return { url: "..." }
      if (res.data?.url && typeof res.data.url === 'string') return res.data.url;
    } catch {}
  }

  // Try scraping giphy as second fallback
  const giphyUrl = await scrapeGiphyGif(action);
  if (giphyUrl) return giphyUrl;

  return null; // Will fall back to text-only response
}

async function downloadGif(url) {
  if (!url) return null;
  try {
    const res = await axios.get(url, {
      responseType: 'arraybuffer',
      timeout: 20000,
      headers: { 'User-Agent': 'ShadowGardenBot/1.0' }
    });
    return Buffer.from(res.data);
  } catch {
    return null;
  }
}

// ============================================================
// FORMAT UPTIME
// ============================================================
function formatUptime(ms) {
  const s = Math.floor(ms / 1000);
  const m = Math.floor(s / 60);
  const h = Math.floor(m / 60);
  const d = Math.floor(h / 24);
  if (d > 0) return `${d}d ${h % 24}h ${m % 60}m`;
  if (h > 0) return `${h}h ${m % 60}m ${s % 60}s`;
  if (m > 0) return `${m}m ${s % 60}s`;
  return `${s}s`;
}

// ============================================================
// RANDOM INT
// ============================================================
function getRandomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

// ============================================================
// SLEEP
// ============================================================
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// ============================================================
// TRUTHS & DARES
// ============================================================
const TRUTHS = [
  "What's the most embarrassing thing you've ever done?",
  "Have you ever lied to your best friend? What about?",
  "What's your biggest fear?",
  "Have you ever had a crush on someone in this group?",
  "What's the worst thing you've ever said about someone behind their back?",
  "Have you ever cheated on a test?",
  "What's the most childish thing you still do?",
  "What's a secret you've never told anyone?",
  "Have you ever stolen something?",
  "What's the most embarrassing thing in your search history?",
  "Who do you have a crush on right now?",
  "What's the biggest lie you've ever told?",
  "Have you ever broken someone's heart?",
  "What's something you're really insecure about?",
  "What's the most trouble you've ever gotten into?",
];

const DARES = [
  "Send a voice note singing your favourite song!",
  "Change your WhatsApp name to 'I Love Garlic Bread' for 10 minutes!",
  "Send a cringe selfie!",
  "Text your crush something sweet right now!",
  "Do 20 pushups and send proof!",
  "Send your most embarrassing photo!",
  "Call someone random in your contacts and sing happy birthday!",
  "Send a screenshot of your last Google search!",
  "Let the group write your status for 30 minutes!",
  "Send a voice note of your best impression of a celebrity!",
  "Post an embarrassing status for 5 minutes!",
  "Send a love message to the last person you texted!",
  "Let the next person to reply dare you to do something!",
  "Send a voice note speaking in an accent for 30 seconds!",
  "Send the 10th photo in your gallery!",
];

module.exports = {
  isOwner, isSudo, addSudo, removeSudo, loadSudo,
  getAnimeGif, downloadGif,
  formatUptime, getRandomInt, sleep,
  TRUTHS, DARES,
};

// ============================================================
// FORMAT BALANCE
// ============================================================
function formatBalance(n) {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M';
  if (n >= 1_000)     return (n / 1_000).toFixed(1) + 'K';
  return n.toString();
}

// ============================================================
// ROASTS LIST
// ============================================================
const ROASTS = [
  "You're not stupid; you just have bad luck thinking.",
  "I'd agree with you but then we'd both be wrong.",
  "I'd insult you, but my mama said I have to be nice to people with disabilities.",
  "You're like a software update — when I see you, I think 'not now'.",
  "If brains were petrol, you wouldn't have enough to power an ant's go-kart.",
  "You are proof that even evolution can have off days.",
  "I would roast you further but I left my good jokes at home.",
  "You're the human equivalent of a participation trophy.",
  "Calling you an idiot would be an insult to all the idiots out there.",
  "I'd say you're funny but looks aren't everything.",
];

// ============================================================
// BEG RESPONSES
// ============================================================
const BEG_RESPONSES = [
  "A kind stranger gave you {amount} coins! 🪙",
  "You found {amount} coins on the ground! 💰",
  "You begged and got {amount} coins! 🙏",
  "A mysterious benefactor gave you {amount} coins! 🎩",
  "You sang on the street corner and earned {amount} coins! 🎵",
  "You looked so pitiful that someone gave you {amount} coins! 😢💰",
  "You found {amount} coins in your old jacket! 🧥",
  "You did a TikTok dance and got tipped {amount} coins! 💃",
];

module.exports.formatBalance  = formatBalance;
module.exports.ROASTS         = ROASTS;
module.exports.BEG_RESPONSES  = BEG_RESPONSES;
