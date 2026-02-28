// ============================================================
// SHOOB.GG CARD INTEGRATION
// Fetches real card data from shoob.gg
// ============================================================
const axios = require('axios');

const SHOOB_BASE = 'https://shoob.gg';

// Search shoob.gg for a card by name
async function searchShoobCard(name) {
  try {
    // Shoob.gg has a public API endpoint for card search
    const res = await axios.get(`${SHOOB_BASE}/api/cards/search`, {
      params: { q: name, limit: 5 },
      timeout: 8000,
      headers: {
        'User-Agent': 'Mozilla/5.0',
        'Accept': 'application/json',
      }
    });
    if (res.data?.cards?.length) return res.data.cards[0];
    if (Array.isArray(res.data) && res.data.length) return res.data[0];
  } catch {}

  // Fallback: scrape shoob.gg search page
  try {
    const res = await axios.get(`${SHOOB_BASE}/cards`, {
      params: { search: name },
      timeout: 10000,
      headers: { 'User-Agent': 'Mozilla/5.0' }
    });
    // Extract card info from HTML
    const html  = res.data;
    const match = html.match(/data-card-name="([^"]+)"[^>]*data-card-series="([^"]+)"[^>]*data-card-tier="([^"]+)"[^>]*data-card-img="([^"]+)"/);
    if (match) {
      return {
        name:   match[1],
        series: match[2],
        tier:   match[3],
        image:  match[4].startsWith('http') ? match[4] : SHOOB_BASE + match[4],
      };
    }
  } catch {}
  return null;
}

// Get a random card from shoob.gg for spawning
async function getRandomShoobCard() {
  try {
    const res = await axios.get(`${SHOOB_BASE}/api/cards/random`, {
      timeout: 8000,
      headers: { 'User-Agent': 'Mozilla/5.0', 'Accept': 'application/json' }
    });
    if (res.data) return res.data;
  } catch {}

  // Fallback: use a predefined list of well-known shoob cards
  const shoobCards = [
    { name: 'Luffy',          series: 'One Piece',          tier: 'Legendary', power: 91, emoji: '⚓', image: null },
    { name: 'Gojo Satoru',    series: 'Jujutsu Kaisen',     tier: 'Mythic',    power: 99, emoji: '🌀', image: null },
    { name: 'Naruto Uzumaki', series: 'Naruto',             tier: 'Rare',      power: 85, emoji: '🍥', image: null },
    { name: 'Levi Ackerman',  series: 'Attack on Titan',    tier: 'Epic',      power: 88, emoji: '⚔️', image: null },
    { name: 'Zero Two',       series: 'DITF',               tier: 'Legendary', power: 90, emoji: '🌸', image: null },
    { name: 'Saitama',        series: 'One Punch Man',      tier: 'Mythic',    power: 100, emoji: '👊', image: null },
    { name: 'Mikasa',         series: 'Attack on Titan',    tier: 'Epic',      power: 84, emoji: '🗡️', image: null },
    { name: 'Rem',            series: 'Re:Zero',            tier: 'Rare',      power: 78, emoji: '💙', image: null },
    { name: 'Tanjiro',        series: 'Demon Slayer',       tier: 'Rare',      power: 77, emoji: '🔥', image: null },
    { name: 'Itachi Uchiha',  series: 'Naruto',             tier: 'Legendary', power: 92, emoji: '🔥', image: null },
    { name: 'Goku',           series: 'Dragon Ball Z',      tier: 'Legendary', power: 95, emoji: '💫', image: null },
    { name: 'Vegeta',         series: 'Dragon Ball Z',      tier: 'Legendary', power: 93, emoji: '👑', image: null },
    { name: 'Killua',         series: 'HxH',                tier: 'Epic',      power: 86, emoji: '⚡', image: null },
    { name: 'Todoroki',       series: 'My Hero Academia',   tier: 'Rare',      power: 81, emoji: '❄️', image: null },
    { name: 'Light Yagami',   series: 'Death Note',         tier: 'Epic',      power: 82, emoji: '📓', image: null },
  ];
  return shoobCards[Math.floor(Math.random() * shoobCards.length)];
}

// Fetch card image buffer from URL
async function fetchCardImage(imageUrl) {
  if (!imageUrl) return null;
  try {
    const res = await axios.get(imageUrl, {
      responseType: 'arraybuffer',
      timeout: 10000,
      headers: { 'User-Agent': 'Mozilla/5.0' }
    });
    return Buffer.from(res.data);
  } catch {
    return null;
  }
}

module.exports = { searchShoobCard, getRandomShoobCard, fetchCardImage };
