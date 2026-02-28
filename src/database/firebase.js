// ============================================================
// LOCAL JSON DATABASE — Zero dependencies, never fails
// Data saved to: data/ folder in bot root
// ============================================================
const fs   = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '../../data');
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

const cache       = {};
const writeQueues = {};

function dbFile(name) { return path.join(DATA_DIR, `${name}.json`); }

function loadTable(name) {
  if (cache[name]) return cache[name];
  try { cache[name] = JSON.parse(fs.readFileSync(dbFile(name), 'utf8')); }
  catch { cache[name] = {}; }
  return cache[name];
}

function saveTable(name) {
  if (writeQueues[name]) clearTimeout(writeQueues[name]);
  writeQueues[name] = setTimeout(() => {
    try { fs.writeFileSync(dbFile(name), JSON.stringify(cache[name] || {}, null, 2)); }
    catch {}
    delete writeQueues[name];
  }, 500);
}

function get(table, key)        { return loadTable(table)[key] ?? null; }
function set(table, key, value) {
  const db = loadTable(table);
  db[key]  = (typeof value === 'object' && value !== null && !Array.isArray(value))
    ? { ...(db[key] || {}), ...value }
    : value;
  saveTable(table);
}
function del(table, key)  { delete loadTable(table)[key]; saveTable(table); }
function getAll(table)    { return loadTable(table); }

function flushAll() {
  for (const name of Object.keys(writeQueues)) {
    clearTimeout(writeQueues[name]);
    try { fs.writeFileSync(dbFile(name), JSON.stringify(cache[name] || {}, null, 2)); } catch {}
  }
}
process.on('exit',    flushAll);
process.on('SIGINT',  () => { flushAll(); process.exit(); });
process.on('SIGTERM', () => { flushAll(); process.exit(); });

// ============================================================
// DATABASE API
// ============================================================
const Database = {

  // ── Users ──────────────────────────────────────────────────
  async getUser(jid)        { return get('users', jid); },
  async setUser(jid, data)  { set('users', jid, data); },
  async updateUser(jid, data) { set('users', jid, data); },

  // ── Economy ────────────────────────────────────────────────
  async getBalance(jid) {
    const u = get('users', jid); return u ? (u.balance || 0) : 0;
  },
  async addBalance(jid, amount) {
    const u = get('users', jid) || { balance: 0 };
    set('users', jid, { balance: (u.balance || 0) + amount });
  },
  async removeBalance(jid, amount) {
    const u = get('users', jid) || { balance: 0 };
    const n = Math.max(0, (u.balance || 0) - amount);
    set('users', jid, { balance: n });
    return n;
  },

  // ── Groups ─────────────────────────────────────────────────
  async getGroup(groupId)        { return get('groups', groupId) || {}; },
  async setGroup(groupId, data)  { set('groups', groupId, data); },

  // ── Warns ──────────────────────────────────────────────────
  async getWarns(jid, groupId) {
    const d = get('warns', `${groupId}_${jid}`);
    return d ? (d.warns || 0) : 0;
  },
  async addWarn(jid, groupId, reason) {
    const key  = `${groupId}_${jid}`;
    const d    = get('warns', key) || { warns: 0, reasons: [] };
    const w    = (d.warns || 0) + 1;
    set('warns', key, { warns: w, reasons: [...(d.reasons || []), reason] });
    return w;
  },
  async resetWarns(jid, groupId) { del('warns', `${groupId}_${jid}`); },

  // ── Banned ─────────────────────────────────────────────────
  async getBan(jid)     { return get('banned', jid); },    // legacy compat
  async isBanned(jid)   { return get('banned', jid) !== null; },
  async banUser(jid)    { set('banned', jid, { banned: true, at: Date.now() }); },
  async unbanUser(jid)  { del('banned', jid); },

  // ── Blacklist ──────────────────────────────────────────────
  async getBlacklist(groupId) {
    const d = get('blacklist', groupId); return d ? (d.words || []) : [];
  },
  async addBlacklist(groupId, word) {
    const d = get('blacklist', groupId) || { words: [] };
    set('blacklist', groupId, { words: [...new Set([...(d.words || []), word.toLowerCase()])] });
  },
  async removeBlacklist(groupId, word) {
    const d = get('blacklist', groupId) || { words: [] };
    set('blacklist', groupId, { words: (d.words || []).filter(w => w !== word.toLowerCase()) });
  },

  // ── Activity ───────────────────────────────────────────────
  async logActivity(jid, groupId) {
    const key = `${groupId}_${jid}`;
    const d   = get('activity', key) || { jid, groupId, count: 0 };
    set('activity', key, { jid, groupId, count: (d.count || 0) + 1, last: Date.now() });
  },
  async getGroupActivity(groupId) {
    return Object.values(getAll('activity'))
      .filter(d => d.groupId === groupId)
      .sort((a, b) => (b.count || 0) - (a.count || 0))
      .slice(0, 10);
  },

  // ── AFK ────────────────────────────────────────────────────
  async setAFK(jid, reason)   { set('afk', jid, { reason, since: Date.now() }); },
  async getAFK(jid)           { return get('afk', jid); },
  async clearAFK(jid)         { del('afk', jid); },
  async removeAFK(jid)        { del('afk', jid); },

  // ── Cards ──────────────────────────────────────────────────
  async getCards(jid) {
    const d = get('cards', jid); return d ? (d.cards || []) : [];
  },
  async addCard(jid, card) {
    const d = get('cards', jid) || { cards: [] };
    set('cards', jid, { cards: [...(d.cards || []), card] });
  },

  // ── Richlist ───────────────────────────────────────────────
  async getRichlist(groupId) {
    return Object.entries(getAll('users'))
      .map(([jid, u]) => ({ jid, ...u }))
      .filter(u => u.registered)
      .sort((a, b) => (b.balance || 0) - (a.balance || 0))
      .slice(0, 10);
  },
  async getGlobalRichlist() {
    return Object.entries(getAll('users'))
      .map(([jid, u]) => ({ jid, ...u }))
      .filter(u => u.registered)
      .sort((a, b) => (b.balance || 0) - (a.balance || 0))
      .slice(0, 10);
  },

  // ── Stardust ───────────────────────────────────────────────
  async getStardust(jid) {
    const u = get('users', jid); return u ? (u.stardust || 0) : 0;
  },
  async addStardust(jid, amount) {
    const u = get('users', jid) || { stardust: 0 };
    set('users', jid, { stardust: (u.stardust || 0) + amount });
  },

  // ── Spawns ─────────────────────────────────────────────────
  async setSpawn(spawnId, data)  { set('spawns', spawnId, data); },
  async getSpawn(spawnId)        { return get('spawns', spawnId); },
  async getSpawnByShortId(shortId) {
    const found = Object.entries(getAll('spawns')).find(([, d]) =>
      d.shortId === shortId.toUpperCase() && !d.claimed
    );
    return found ? { id: found[0], ...found[1] } : null;
  },
  async claimSpawn(id) { set('spawns', id, { claimed: true, claimedAt: Date.now() }); },

  // ── Cooldowns ──────────────────────────────────────────────
  async getDailyCooldown(jid) {
    const d = get('cooldowns', `daily_${jid}`); return d ? d.timestamp : 0;
  },
  async setDailyCooldown(jid) { set('cooldowns', `daily_${jid}`, { timestamp: Date.now() }); },
  async getCooldown(key) {
    const d = get('cooldowns', key.replace(/[^a-zA-Z0-9_]/g, '_')); return d ? d.timestamp : 0;
  },
  async setCooldown(key, ts) {
    set('cooldowns', key.replace(/[^a-zA-Z0-9_]/g, '_'), { timestamp: ts });
  },

  // ── Sudo ───────────────────────────────────────────────────
  async getSudoList() {
    const d = get('config', 'sudo'); return d ? (d.numbers || []) : [];
  },
  async addSudo(number) {
    const d = get('config', 'sudo') || { numbers: [] };
    set('config', 'sudo', { numbers: [...new Set([...(d.numbers || []), number])] });
  },
  async removeSudo(number) {
    const d = get('config', 'sudo') || { numbers: [] };
    set('config', 'sudo', { numbers: (d.numbers || []).filter(n => n !== number) });
  },
};

const db    = { get, set, del, getAll };
const admin = { firestore: { FieldValue: { increment: n => n, arrayUnion: (...a) => a, arrayRemove: () => [] } } };

module.exports = { db, admin, Database };
