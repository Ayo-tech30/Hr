const config = require('../../config');
const { Database } = require('../database/firebase');
const { isOwner, isSudo } = require('../utils/helpers');

const mainCommands        = require('../commands/main');
const adminCommands       = require('../commands/admin');
const economyCommands     = require('../commands/economy');
const gamesCommands       = require('../commands/games');
const gamblingCommands    = require('../commands/gambling');
const interactionCommands = require('../commands/interactions');
const funCommands         = require('../commands/fun');
const aiCommands          = require('../commands/ai');
const converterCommands   = require('../commands/converter');
const animeCommands       = require('../commands/anime');
const downloaderCommands  = require('../commands/downloaders');
const cardCommands        = require('../commands/cards');

// ============================================================
// ADMIN HELPERS
// ============================================================
function getBotJid(sock) {
  const raw = sock.user?.id || '';
  const num = raw.split(':')[0].split('@')[0];
  return num + '@s.whatsapp.net';
}

function normalizeJid(jid) {
  return jid ? jid.split(':')[0].split('@')[0] : '';
}

async function isGroupAdmin(sock, groupId, sender) {
  try {
    const meta = await sock.groupMetadata(groupId);
    const senderNum = normalizeJid(sender);
    return meta.participants.some(p =>
      normalizeJid(p.id) === senderNum && (p.admin === 'admin' || p.admin === 'superadmin')
    );
  } catch { return false; }
}

async function isBotAdmin(sock, groupId) {
  try {
    const meta   = await sock.groupMetadata(groupId);
    const botNum = normalizeJid(getBotJid(sock));
    return meta.participants.some(p =>
      normalizeJid(p.id) === botNum && (p.admin === 'admin' || p.admin === 'superadmin')
    );
  } catch { return false; }
}

// ── If bot number is admin, auto-sync its admin status ────────
async function ensureBotAdminIfNeeded(sock, groupId) {
  try {
    const botIsAdmin = await isBotAdmin(sock, groupId);
    if (!botIsAdmin) {
      // Check if bot's phone number is in OWNER_NUMBER / SUDO
      const botNum  = normalizeJid(getBotJid(sock));
      const ownerNum = normalizeJid(config.OWNER_NUMBER);
      if (botNum === ownerNum) {
        // Try to self-promote (only works if bot is already superadmin)
        await sock.groupParticipantsUpdate(groupId, [getBotJid(sock)], 'promote').catch(() => {});
      }
    }
  } catch {}
}

// ============================================================
// ANTI-LINK
// ============================================================
async function handleAntiLink(sock, msg, groupSettings, sender, groupId) {
  if (!groupSettings.antilink) return;
  const text = msg.message?.conversation || msg.message?.extendedTextMessage?.text || '';
  const linkPattern = /(https?:\/\/[^\s]+|www\.[^\s]+|chat\.whatsapp\.com\/[^\s]+)/gi;
  if (!linkPattern.test(text)) return;
  const botAdmin = await isBotAdmin(sock, groupId);
  const isAdmin  = await isGroupAdmin(sock, groupId, sender);
  if (isAdmin || !botAdmin || isOwner(sender)) return;
  try { await sock.sendMessage(groupId, { delete: msg.key }); } catch {}
  const action = groupSettings.antilink_action || 'warn';
  if (action === 'kick') {
    await sock.groupParticipantsUpdate(groupId, [sender], 'remove').catch(() => {});
    await sock.sendMessage(groupId, { text: `❌ @${sender.split('@')[0]} was removed for sending links!`, mentions: [sender] });
  } else {
    const warns = await Database.addWarn(sender, groupId, 'Sending links');
    await sock.sendMessage(groupId, { text: `⚠️ @${sender.split('@')[0]} warned for links! [${warns}/${config.MAX_WARNS}]`, mentions: [sender] });
    if (warns >= config.MAX_WARNS) {
      await sock.groupParticipantsUpdate(groupId, [sender], 'remove').catch(() => {});
      await Database.resetWarns(sender, groupId);
    }
  }
}

// ============================================================
// ANTI-SPAM
// ============================================================
const spamMap = new Map();
async function handleAntiSpam(sock, msg, groupSettings, sender, groupId) {
  if (!groupSettings.antism) return;
  const isAdmin = await isGroupAdmin(sock, groupId, sender);
  if (isAdmin || isOwner(sender)) return;
  const key  = `${groupId}_${sender}`;
  const now  = Date.now();
  const data = spamMap.get(key) || { count: 0, first: now };
  if (now - data.first > 10000) { spamMap.set(key, { count: 1, first: now }); return; }
  data.count++;
  spamMap.set(key, data);
  if (data.count >= 7) {
    await sock.groupParticipantsUpdate(groupId, [sender], 'remove').catch(() => {});
    await sock.sendMessage(groupId, { text: `🔨 @${sender.split('@')[0]} kicked for spamming!`, mentions: [sender] });
    spamMap.delete(key);
  }
}

// ============================================================
// BLACKLIST
// ============================================================
async function handleBlacklist(sock, msg, groupId, sender) {
  try {
    const bl   = await Database.getBlacklist(groupId);
    if (!bl?.length) return;
    const text = (msg.message?.conversation || msg.message?.extendedTextMessage?.text || '').toLowerCase();
    if (bl.find(w => text.includes(w.toLowerCase()))) {
      try { await sock.sendMessage(groupId, { delete: msg.key }); } catch {}
    }
  } catch {}
}

// ============================================================
// MUTE CHECK
// ============================================================
async function handleMuteCheck(sock, msg, groupId, sender) {
  try {
    const muteKey  = 'mute_' + groupId + '_' + sender;
    const muteData = await Database.getGroup(muteKey);
    if (muteData?.muted && muteData.until > Date.now()) {
      const isAdmin = await isGroupAdmin(sock, groupId, sender);
      if (!isAdmin && !isOwner(sender)) {
        try { await sock.sendMessage(groupId, { delete: msg.key }); } catch {}
        return true; // is muted
      }
    } else if (muteData?.muted && muteData.until <= Date.now()) {
      await Database.setGroup(muteKey, { muted: false, until: 0 });
    }
  } catch {}
  return false;
}

// ============================================================
// WELCOME / LEAVE
// ============================================================
async function handleGroupUpdate(sock, update) {
  try {
    const { id, participants, action } = update;
    const gs = await Database.getGroup(id);
    for (const participant of participants) {
      const name = participant.split('@')[0];
      if (action === 'add' && gs.welcome_enabled) {
        const txt = (gs.welcome_message || 'Welcome {user} to the group! 🌸').replace('{user}', `@${name}`);
        await sock.sendMessage(id, { text: txt, mentions: [participant] });
      }
      if (action === 'remove' && gs.leave_enabled) {
        const txt = (gs.leave_message || 'Goodbye {user}! 👋').replace('{user}', `@${name}`);
        await sock.sendMessage(id, { text: txt, mentions: [participant] });
      }
    }
  } catch {}
}

// ============================================================
// ALL COMMAND ALIASES
// ============================================================
const ALIASES = {
  // Economy
  mbal: 'moneybalance', pbal: 'premiumbal', wid: 'withdraw',
  dep: 'deposit', reg: 'register', p: 'profile', inv: 'inventory',
  lb: 'leaderboard', gi: 'groupinfo', gs: 'groupstats',
  richlg: 'richlistglobal', richlistg: 'richlistglobal',
  rename: 'setname', steal: 'rob',
  // Games
  ttt: 'tictactoe', c4: 'connectfour', wcg: 'wordchain',
  stopgame: 'stopgame',
  // RPG
  rpgprofile: 'rpgprofile', setclass: 'setclass',
  dungeon: 'dungeon', quest: 'quest', heal: 'heal', craft: 'craft',
  // Converter
  s: 'sticker', toimg: 'turnimg', tovid: 'turnvid',
  // AI
  tt: 'translate', gpt: 'ai', claude: 'ai',
  compliment: 'compliment', advice: 'advice',
  story: 'story', poem: 'poem', clearchat: 'clearchat',
  // Cards
  coll: 'collection', ci: 'cardinfo',
  mycolls: 'mycollectionseries', cardlb: 'cardleaderboard',
  myauc: 'myauc', listauc: 'listauc', rc: 'rc',
  // Fun
  wyr: 'wouldyourather', td: 'truthordare',
  pp: 'psize', nsfw: 'nude',
  // Gambling
  cf: 'coinflip', db: 'doublebet', dp: 'doublepayout',
};

// ============================================================
// MAIN MESSAGE HANDLER
// ============================================================
async function messageHandler(sock, msg) {
  try {
    if (!msg.message) return;
    if (msg.key.fromMe) return;

    const sender  = msg.key.participant || msg.key.remoteJid;
    const groupId = msg.key.remoteJid;
    const isGroup = groupId.endsWith('@g.us');

    const msgText = (
      msg.message?.conversation ||
      msg.message?.extendedTextMessage?.text ||
      msg.message?.imageMessage?.caption ||
      msg.message?.videoMessage?.caption ||
      ''
    ).trim();

    // ── Ban check (use isBanned method) ──
    try {
      const banned = await Database.isBanned(sender);
      if (banned) return;
    } catch {}

    // ── AFK check ──
    if (isGroup && msgText) {
      const mentioned = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid || [];
      for (const jid of mentioned) {
        try {
          const afkData = await Database.getAFK(jid);
          if (afkData?.reason) {
            await sock.sendMessage(groupId, {
              text: `💤 @${jid.split('@')[0]} is AFK!\n📝 Reason: ${afkData.reason}`,
              mentions: [jid]
            }, { quoted: msg });
          }
        } catch {}
      }
      try {
        const myAfk = await Database.getAFK(sender);
        if (myAfk?.reason && !msgText.startsWith(config.PREFIX)) {
          await Database.removeAFK(sender);
        }
      } catch {}
    }

    // ── Activity tracking + auto-spawn ──
    if (isGroup) {
      try { await Database.logActivity(sender, groupId); } catch {}
      // Trigger card auto-spawn check (every 1hr of group activity)
      try {
        const { trackActivityAndSpawn } = require('../commands/cards');
        await trackActivityAndSpawn(sock, groupId);
      } catch {}
    }

    // ── Group moderation ──
    if (isGroup && !isOwner(sender)) {
      const gs = await Database.getGroup(groupId).catch(() => ({}));
      await handleAntiLink(sock, msg, gs, sender, groupId);
      await handleAntiSpam(sock, msg, gs, sender, groupId);
      await handleBlacklist(sock, msg, groupId, sender);
      const muted = await handleMuteCheck(sock, msg, groupId, sender);
      if (muted) return;
    }

    // ── Non-command game response ──
    if (isGroup && msgText && !msgText.startsWith(config.PREFIX)) {
      const gameCtx = {
        sock, msg, sender, groupId, isGroup,
        body: msgText,
        reply: (text) => sock.sendMessage(groupId, { text }, { quoted: msg }),
        react: (emoji) => sock.sendMessage(groupId, { react: { text: emoji, key: msg.key } }),
      };
      await gamesCommands.handleGameResponse(gameCtx).catch(() => {});
      return;
    }

    if (!msgText.startsWith(config.PREFIX)) return;

    const args    = msgText.slice(config.PREFIX.length).trim().split(/\s+/);
    let   command = args[0].toLowerCase();
    const body    = args.slice(1).join(' ');

    // Resolve alias (also handle hyphenated anime commands)
    if (ALIASES[command]) command = ALIASES[command];
    // Normalize hyphenated anime commands: mori-calliope -> moricalliope etc
    const hyphenMap = {
      'mori-calliope': 'moricalliope',
      'raiden-shogun': 'raidenshogun',
      'kamisato-ayaka': 'kamisatoayaka',
    };
    if (hyphenMap[command]) command = hyphenMap[command];

    const senderIsAdmin = isGroup ? await isGroupAdmin(sock, groupId, sender) : true;
    const botAdmin      = isGroup ? await isBotAdmin(sock, groupId)           : true;
    const senderIsOwner = isOwner(sender);

    // ── If paired number is admin, treat bot as admin too ──
    const botJid    = getBotJid(sock);
    const botNumStr = normalizeJid(botJid);
    const ownerNum  = normalizeJid(config.OWNER_NUMBER);
    const effectiveBotAdmin = botAdmin || (botNumStr === ownerNum && senderIsAdmin);

    const ctx = {
      sock, msg, sender, groupId,
      isGroup, isPrivate: !isGroup,
      args, command, body,
      isAdmin:       senderIsAdmin,
      isBotAdmin:    effectiveBotAdmin,
      isOwner:       senderIsOwner,
      reply: (text) => sock.sendMessage(
        isGroup ? groupId : sender,
        { text },
        { quoted: msg }
      ),
      react: (emoji) => sock.sendMessage(
        isGroup ? groupId : sender,
        { react: { text: emoji, key: msg.key } }
      ),
    };

    // ── OWNER COMMANDS ──────────────────────────────────────
    if (command === 'sudo' && args[1] !== 'add' && args[1] !== 'remove' && args[1] !== 'list') {
      // Pass to admin commands
    }

    if (command === 'ban') {
      if (!ctx.isOwner) return ctx.reply('❌ Owner/Sudo only!');
      const mentioned = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid;
      if (!mentioned?.length) return ctx.reply('❌ Mention someone to ban!');
      await Database.banUser(mentioned[0]);
      return ctx.reply(`🔨 @${mentioned[0].split('@')[0]} has been banned!`);
    }

    if (command === 'unban') {
      if (!ctx.isOwner) return ctx.reply('❌ Owner/Sudo only!');
      const mentioned = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid;
      if (!mentioned?.length) return ctx.reply('❌ Mention someone to unban!');
      await Database.unbanUser(mentioned[0]);
      return ctx.reply(`✅ @${mentioned[0].split('@')[0]} has been unbanned!`);
    }

    if (command === 'join') {
      if (!ctx.isOwner) return ctx.reply('❌ Owner/Sudo only!');
      if (!body) return ctx.reply('❌ Usage: .join https://chat.whatsapp.com/xxx');
      try {
        const link = body.split('chat.whatsapp.com/')[1];
        await sock.groupAcceptInvite(link);
        return ctx.reply('✅ Joined!');
      } catch (e) { return ctx.reply(`❌ Failed: ${e.message}`); }
    }

    if (command === 'exit') {
      if (!ctx.isOwner && !ctx.isAdmin) return ctx.reply('❌ Admins only!');
      if (!isGroup) return ctx.reply('❌ Groups only!');
      await sock.sendMessage(groupId, { text: '👋 *Goodbye!* 🌸' });
      await new Promise(r => setTimeout(r, 1500));
      await sock.groupLeave(groupId).catch(() => {});
      return;
    }

    if (command === 'spawncard') {
      if (!ctx.isOwner) return ctx.reply('❌ Owner only!');
      return adminCommands.spawncard(ctx);
    }

    // ── ROUTE COMMANDS ──────────────────────────────────────
    const rpgCommands  = gamesCommands.rpg || {};
    const commandSets  = [
      mainCommands, adminCommands, economyCommands, gamesCommands,
      gamblingCommands, interactionCommands, funCommands, aiCommands,
      converterCommands, animeCommands, downloaderCommands, cardCommands,
      rpgCommands,
    ];

    const allCmds = Object.assign({}, ...commandSets);

    if (allCmds[command]) {
      try {
        await allCmds[command](ctx);
      } catch (err) {
        // Silent error — never crash, never log
      }

      // XP gain
      try {
        const user = await Database.getUser(sender);
        if (user?.registered) {
          const xpGain  = Math.floor(Math.random() * 11) + 5;
          const newXp   = (user.xp || 0) + xpGain;
          const newLevel = Math.floor(newXp / 1000) + 1;
          const oldLevel = user.level || 1;
          await Database.setUser(sender, { xp: newXp, level: Math.max(newLevel, oldLevel) });
          if (newLevel > oldLevel) {
            const reward = newLevel * 500;
            await Database.addBalance(sender, reward);
            await sock.sendMessage(isGroup ? groupId : sender, {
              text: `🎉 @${sender.split('@')[0]} leveled up to *Level ${newLevel}*! 🌸\n💰 Reward: *${reward.toLocaleString()} coins*`,
              mentions: [sender]
            });
          }
        }
      } catch {}
    }

  } catch {
    // Silent — never crash
  }
}

module.exports = { messageHandler, handleGroupUpdate, isGroupAdmin, isBotAdmin };
