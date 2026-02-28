const { Database } = require('../database/firebase');
const { getRandomInt } = require('../utils/helpers');
const config = require('../../config');

const CARDS = [
  { id: 1, name: 'Naruto Uzumaki', series: 'Naruto', tier: 'Rare', power: 85, emoji: '🍥' },
  { id: 2, name: 'Goku', series: 'Dragon Ball Z', tier: 'Legendary', power: 95, emoji: '💫' },
  { id: 3, name: 'Levi Ackerman', series: 'Attack on Titan', tier: 'Epic', power: 88, emoji: '⚔️' },
  { id: 4, name: 'Itachi Uchiha', series: 'Naruto', tier: 'Legendary', power: 92, emoji: '🔥' },
  { id: 5, name: 'Zero Two', series: 'Darling in the FranXX', tier: 'Legendary', power: 90, emoji: '🌸' },
  { id: 6, name: 'Saitama', series: 'One Punch Man', tier: 'Mythic', power: 100, emoji: '👊' },
  { id: 7, name: 'Gojo Satoru', series: 'Jujutsu Kaisen', tier: 'Mythic', power: 99, emoji: '🌀' },
  { id: 8, name: 'Killua', series: 'Hunter x Hunter', tier: 'Epic', power: 86, emoji: '⚡' },
  { id: 9, name: 'Mikasa Ackerman', series: 'Attack on Titan', tier: 'Epic', power: 84, emoji: '🗡️' },
  { id: 10, name: 'Rem', series: 'Re:Zero', tier: 'Rare', power: 78, emoji: '💙' },
  { id: 11, name: 'Edward Elric', series: 'Fullmetal Alchemist', tier: 'Rare', power: 80, emoji: '⚗️' },
  { id: 12, name: 'Light Yagami', series: 'Death Note', tier: 'Epic', power: 82, emoji: '📓' },
  { id: 13, name: 'Luffy', series: 'One Piece', tier: 'Legendary', power: 91, emoji: '⚓' },
  { id: 14, name: 'Sasuke Uchiha', series: 'Naruto', tier: 'Epic', power: 87, emoji: '⚡' },
  { id: 15, name: 'Nezuko Kamado', series: 'Demon Slayer', tier: 'Rare', power: 76, emoji: '🌸' },
  { id: 16, name: 'Tanjiro Kamado', series: 'Demon Slayer', tier: 'Rare', power: 77, emoji: '🔥' },
  { id: 17, name: 'Ryuk', series: 'Death Note', tier: 'Epic', power: 83, emoji: '🍎' },
  { id: 18, name: 'Vegeta', series: 'Dragon Ball Z', tier: 'Legendary', power: 93, emoji: '👑' },
  { id: 19, name: 'Todoroki', series: 'My Hero Academia', tier: 'Rare', power: 81, emoji: '❄️' },
  { id: 20, name: 'Deku', series: 'My Hero Academia', tier: 'Rare', power: 79, emoji: '💥' },
];

function getTierEmoji(tier) {
  const tiers = { 'Common': '⚪', 'Rare': '🔵', 'Epic': '🟣', 'Legendary': '🟡', 'Mythic': '🔴' };
  return tiers[tier] || '⚪';
}

function getRandomCard(avoidTier = null) {
  const tierWeights = { 'Common': 40, 'Rare': 30, 'Epic': 20, 'Legendary': 8, 'Mythic': 2 };
  let rand = getRandomInt(1, 100);
  let tier = 'Common';
  let cumulative = 0;
  for (const [t, w] of Object.entries(tierWeights)) {
    cumulative += w;
    if (rand <= cumulative) { tier = t; break; }
  }
  const tieredCards = CARDS.filter(c => c.tier === tier);
  return tieredCards[getRandomInt(0, tieredCards.length - 1)] || CARDS[getRandomInt(0, CARDS.length - 1)];
}

// Export cards list for spawncard
const CARDS_LIST = CARDS;
module.exports.CARDS_LIST = CARDS;

// Auction storage
const auctions = new Map();

module.exports = {
  async collection(ctx) {
    const { sender } = ctx;
    const user = await Database.getUser(sender);
    if (!user?.registered) return ctx.reply('❌ Register first!');
    const cards = await Database.getCards(sender);
    if (!cards.length) return ctx.reply('📦 No cards yet!\nUse *.cardshop* to get cards!');
    
    const cardList = cards.slice(0, 20).map((c, i) => {
      const card = CARDS.find(card => card.id === c.id) || c;
      return `${i+1}. ${card.emoji || '🃏'} *${card.name}* [${getTierEmoji(card.tier)}${card.tier}] ⚡${card.power}`;
    }).join('\n');
    
    await ctx.reply(`🎴 *Your Card Collection* (${cards.length} cards)\n\n${cardList}${cards.length > 20 ? `\n\n... and ${cards.length - 20} more` : ''}`);
  },

  async deck(ctx) {
    await ctx.reply('🃏 *Your Deck*\n\nUse *.card [index]* to view a specific card from your collection.\nUse *.vs @user* to battle!');
  },

  async card(ctx) {
    const idx = parseInt(ctx.body) - 1;
    const cards = await Database.getCards(ctx.sender);
    if (!cards.length) return ctx.reply('📦 No cards!');
    if (isNaN(idx) || idx < 0 || idx >= cards.length) return ctx.reply(`❌ Invalid index! You have ${cards.length} cards.`);
    const c = cards[idx];
    const card = CARDS.find(card => card.id === c.id) || c;
    await ctx.reply(
      `🃏 *Card Details*\n\n` +
      `${card.emoji} *${card.name}*\n` +
      `📺 Series: ${card.series}\n` +
      `${getTierEmoji(card.tier)} Tier: ${card.tier}\n` +
      `⚡ Power: ${card.power}/100\n` +
      `🏷️ Card #${idx + 1} in collection`
    );
  },

  async cardinfo(ctx) {
    const [, ...nameParts] = ctx.args;
    const name = nameParts.join(' ');
    if (!name) return ctx.reply('Usage: .ci [card name]');
    await ctx.react('⏳');

    const { searchShoobCard, fetchCardImage } = require('../utils/shoob');

    // First check local CARDS list
    const localCard = CARDS.find(c => c.name.toLowerCase().includes(name.toLowerCase()));

    // Try shoob.gg search
    const shoobCard = await searchShoobCard(name).catch(() => null);
    const card = shoobCard || localCard;

    if (!card) {
      await ctx.react('❌');
      return ctx.reply(`❌ Card "*${name}*" not found on shoob.gg or local list!`);
    }

    const tierEmoji = { Common: '⚪', Rare: '🔵', Epic: '🟣', Legendary: '🟡', Mythic: '🔴' };
    const cardText =
      `╭━━〔 🎴 ᴄᴀʀᴅ ɪɴꜰᴏ 〕━━┈⊷\n` +
      `┃✰│ 📛 *${card.name}*\n` +
      `┃✰│ 📺 ꜱᴇʀɪᴇꜱ: *${card.series || 'Unknown'}*\n` +
      `┃✰│ ${tierEmoji[card.tier] || '⚪'} ᴛɪᴇʀ: *${card.tier || 'Common'}*\n` +
      `┃✰│ ⚡ ᴘᴏᴡᴇʀ: *${card.power || '??'}/100*\n` +
      `┃✰│ 🌐 ꜱᴏᴜʀᴄᴇ: *shoob.gg*\n` +
      `╰━━━━━━━━━━━━━━━┈⊷`;

    // Try to fetch card image from shoob.gg
    const imgBuf = card.image ? await fetchCardImage(card.image).catch(() => null) : null;

    if (imgBuf) {
      await ctx.sock.sendMessage(ctx.groupId, {
        image:   imgBuf,
        caption: cardText,
      }, { quoted: ctx.msg });
    } else {
      await ctx.reply(cardText);
    }
    await ctx.react('✅');
  },

  async cardshop(ctx) {
    const user = await Database.getUser(ctx.sender);
    if (!user?.registered) return ctx.reply('❌ Register first!');
    await ctx.reply(
      `🛒 *Card Shop*\n\n` +
      `📦 Card Pack - 800 coins\nContains 3 random cards!\n\n` +
      `Buy a card pack from *.shop* and use *.use card pack* to open it!\n\n` +
      `Or use *.claim [id]* to claim a specific card (costs 500 coins)\n\n` +
      `Card IDs: ${CARDS.map(c => `${c.id}. ${c.name}`).slice(0, 10).join(', ')}...`
    );
  },

  async claim(ctx) {
    const { sender, body } = ctx;
    const user = await Database.getUser(sender);
    if (!user?.registered) return ctx.reply('❌ Register first with .register!');
    if (!body) return ctx.reply('Usage: .claim [spawn_id or card_id]');

    // ── Check if it's a spawn claim ──────────────────────────
    const isSpawnId = /^[a-z0-9_]+$/i.test(body) && body.length > 4 && isNaN(body);
    if (isSpawnId) {
      // Find spawn - try partial match (last 8 chars of spawn ID)
      const spawn = await Database.getSpawnByShortId(body.trim());
      if (!spawn) return ctx.reply(`❌ Spawn *${body}* not found or already claimed!`);
      if (spawn.claimed) return ctx.reply(`❌ This card was already claimed by someone else!`);
      if (spawn.groupId !== ctx.groupId) return ctx.reply(`❌ This card was spawned in a different group!`);

      // Cooldown by tier
      const tierCooldowns = { Common: 0, Rare: 60, Epic: 90, Legendary: 110, Mythic: 120 };
      const cooldownSecs = tierCooldowns[spawn.card.tier] || 60;
      if (cooldownSecs > 0) {
        const cooldownKey = \`claim_\${sender}_\${spawn.card.tier}\`;
        const last = await Database.getCooldown(cooldownKey);
        const now = Date.now();
        if (last && now - last < cooldownSecs * 1000) {
          const left = Math.ceil((cooldownSecs * 1000 - (now - last)) / 1000);
          return ctx.reply(\`⏳ You need to wait *\${left}s* before claiming another \${spawn.card.tier} card!\`);
        }
        await Database.setCooldown(cooldownKey, Date.now());
      }

      // Claim it!
      await Database.claimSpawn(spawn.id);
      await Database.addCard(sender, { id: spawn.card.id, obtainedAt: Date.now(), spawnClaimed: true });

      const tierEmoji = { Common: '⚪', Rare: '🔵', Epic: '🟣', Legendary: '🟡', Mythic: '🔴' };
      await ctx.sock.sendMessage(ctx.groupId, {
        text:
          \`🎉 *CARD CLAIMED!*\n\n\` +
          \`@\${sender.split('@')[0]} claimed:\n\` +
          \`\${spawn.card.emoji} *\${spawn.card.name}*\n\` +
          \`\${tierEmoji[spawn.card.tier]} Tier: *\${spawn.card.tier}*\n\` +
          \`⚡ Power: *\${spawn.card.power}/100*\n\n\` +
          \`🌸 Added to your collection!\`,
        mentions: [sender]
      }, { quoted: ctx.msg });
      return;
    }

    // ── Buy card by ID from cardshop ──────────────────────────
    const id = parseInt(body);
    if (!id) return ctx.reply('Usage: .claim [spawn_id] or .claim [card_number]');
    const card = CARDS.find(c => c.id === id);
    if (!card) return ctx.reply(\`❌ Card #\${id} not found! See .cardshop\`);

    // Cooldown by tier for shop claims
    const tierCooldowns = { Common: 0, Rare: 60, Epic: 90, Legendary: 110, Mythic: 120 };
    const cooldownSecs = tierCooldowns[card.tier] || 0;
    if (cooldownSecs > 0) {
      const cooldownKey = \`claim_\${sender}_\${card.tier}\`;
      const last = await Database.getCooldown(cooldownKey);
      const now = Date.now();
      if (last && now - last < cooldownSecs * 1000) {
        const left = Math.ceil((cooldownSecs * 1000 - (now - last)) / 1000);
        return ctx.reply(\`⏳ Wait *\${left}s* before claiming another \${card.tier} card!\`);
      }
      await Database.setCooldown(cooldownKey, Date.now());
    }

    const cost = card.tier === 'Mythic' ? 5000 : card.tier === 'Legendary' ? 2000 : card.tier === 'Epic' ? 1000 : card.tier === 'Rare' ? 500 : 200;
    if ((user.balance || 0) < cost) return ctx.reply(\`❌ Need \${cost} coins! You have \${user.balance || 0}\`);
    await Database.removeBalance(sender, cost);
    await Database.addCard(sender, { id: card.id, obtainedAt: Date.now() });
    await ctx.reply(\`✅ Claimed *\${card.emoji} \${card.name}*!\n\${getTierEmoji(card.tier)} \${card.tier} | ⚡ \${card.power} power\nCost: \${cost} coins\`);
  },

  async stardust(ctx) {
    const dust = await Database.getStardust(ctx.sender);
    await ctx.reply(`✨ *Stardust*\n\nYou have: *${dust} stardust*\n\nStardust is used to upgrade and evolve cards!`);
  },

  async vs(ctx) {
    const { msg } = ctx;
    const mentioned = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid;
    if (!mentioned?.length) return ctx.reply('❌ Mention someone to battle!\nUsage: .vs @user');
    
    const myCards = await Database.getCards(ctx.sender);
    const theirCards = await Database.getCards(mentioned[0]);
    
    if (!myCards.length) return ctx.reply('❌ You have no cards! Get some from *.cardshop*');
    if (!theirCards.length) return ctx.reply('❌ Opponent has no cards!');
    
    const myCard = CARDS.find(c => c.id === myCards[getRandomInt(0, myCards.length - 1)].id) || CARDS[0];
    const theirCard = CARDS.find(c => c.id === theirCards[getRandomInt(0, theirCards.length - 1)].id) || CARDS[0];
    
    const myPow = myCard.power + getRandomInt(-10, 10);
    const theirPow = theirCard.power + getRandomInt(-10, 10);
    const iWon = myPow > theirPow;
    const winnings = iWon ? 200 : 0;
    if (winnings) await Database.addBalance(ctx.sender, winnings);
    
    await ctx.sock.sendMessage(ctx.groupId, {
      text: `⚔️ *Card Battle!*\n\n` +
        `@${ctx.sender.split('@')[0]}: ${myCard.emoji} ${myCard.name} (⚡${myPow})\nvs\n` +
        `@${mentioned[0].split('@')[0]}: ${theirCard.emoji} ${theirCard.name} (⚡${theirPow})\n\n` +
        `${iWon ? `🏆 *@${ctx.sender.split('@')[0]} WINS! +200 coins!*` : `💀 *@${mentioned[0].split('@')[0]} WINS!*`}`,
      mentions: [ctx.sender, mentioned[0]]
    }, { quoted: ctx.msg });
  },

  async auction(ctx) {
    const id = parseInt(ctx.args[1]);
    const price = parseInt(ctx.args[2]);
    if (!id || !price) return ctx.reply('Usage: .auction [card_id] [starting_price]');
    const user = await Database.getUser(ctx.sender);
    if (!user?.registered) return ctx.reply('❌ Register first!');
    const cards = await Database.getCards(ctx.sender);
    const cardEntry = cards.find(c => c.id === id);
    if (!cardEntry) return ctx.reply('❌ You don\'t have this card!');
    const card = CARDS.find(c => c.id === id);
    const auctionId = `${ctx.sender}_${id}_${Date.now()}`;
    auctions.set(auctionId, { card, seller: ctx.sender, currentBid: price, highestBidder: null, endTime: Date.now() + 3600000 });
    await ctx.reply(`🏷️ *Auction Started!*\n\n${card.emoji} ${card.name}\nStarting bid: ${price} coins\nAuction ID: ${auctionId.slice(-8)}\nEnds in: 1 hour\n\nBid with *.bid ${auctionId.slice(-8)} [amount]*`);
  },

  async cancelauc(ctx) {
    await ctx.reply('❌ *Cancel Auction*\n\nPlease contact a bot admin to cancel your auction.');
  },

  async anticamp(ctx) {
    await ctx.reply('⚔️ *Anticamp*\n\n🚧 Anti-camping system for card spawns coming soon!\nThis will prevent users from monopolizing card drops.');
  },

  async seriesleaderboard(ctx) {
    await ctx.reply('🏆 *Series Leaderboard*\n\n🚧 Coming soon!\nThis will show who has the most complete series collections.');
  },

  async cardleaderboard(ctx) {
    await ctx.reply('🃏 *Card Leaderboard*\n\n🚧 Coming soon!\nThis will show who has the most/rarest cards.');
  },

  async mycollectionseries(ctx) {
    const cards = await Database.getCards(ctx.sender);
    const series = {};
    for (const c of cards) {
      const card = CARDS.find(ca => ca.id === c.id);
      if (card) series[card.series] = (series[card.series] || 0) + 1;
    }
    const list = Object.entries(series).map(([s, count]) => `• ${s}: ${count} cards`).join('\n');
    await ctx.reply(`📚 *My Series Collections*\n\n${list || 'No cards yet!'}`);
  },

  async sellccard(ctx) {
    await ctx.reply('💸 *Sell Card*\n\nUsage: .sellccard @user [card_index] [price]\n\n🚧 Direct card trading coming soon!');
  },

  async sellccardpublic(ctx) {
    await ctx.reply('🏪 *Public Card Market*\n\n🚧 Public marketplace coming soon!\nYou\'ll be able to list cards for anyone to buy.');
  },

  async lendcard(ctx) {
    await ctx.reply('🤝 *Lend Card*\n\n🚧 Card lending system coming soon!');
  },

  async myauc(ctx) {
    const myAuctions = [...auctions.entries()].filter(([_, a]) => a.seller === ctx.sender);
    if (!myAuctions.length) return ctx.reply('📋 No active auctions!');
    const list = myAuctions.map(([id, a]) => `• ${a.card.name} - Current: ${a.currentBid} coins`).join('\n');
    await ctx.reply(`🏷️ *My Auctions*\n\n${list}`);
  },

  async listauc(ctx) {
    if (!auctions.size) return ctx.reply('📋 No active auctions!');
    const list = [...auctions.entries()].map(([id, a]) => 
      `• ${a.card.emoji} ${a.card.name}\n  Current bid: ${a.currentBid} coins\n  ID: ${id.slice(-8)}`
    ).join('\n\n');
    await ctx.reply(`🏷️ *Active Auctions*\n\n${list}`);
  },

  async remauc(ctx) {
    await ctx.reply('🚧 Relist auction - coming soon!');
  },

  async rc(ctx) {
    // Random card from collection
    const cards = await Database.getCards(ctx.sender);
    if (!cards.length) return ctx.reply('No cards!');
    const c = cards[getRandomInt(0, cards.length - 1)];
    const card = CARDS.find(ca => ca.id === c.id);
    if (!card) return ctx.reply('Card not found!');
    await ctx.reply(`🎲 *Random Card*\n\n${card.emoji} *${card.name}*\n${getTierEmoji(card.tier)} ${card.tier} | ⚡${card.power}`);
  },

  async tc(ctx) {
    // Trade card
    const { msg } = ctx;
    const mentioned = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid;
    if (!mentioned?.length) return ctx.reply('Usage: .tc @user [your_card_idx] [their_card_idx]');
    await ctx.reply('🤝 *Card Trade*\n\n🚧 Card trading system coming soon!\nYou\'ll be able to trade cards directly with other players.');
  },

  async deckcard(ctx) {
    const idx = parseInt(ctx.body) - 1;
    const cards = await Database.getCards(ctx.sender);
    if (!cards.length || isNaN(idx) || idx < 0 || idx >= cards.length) return ctx.reply('❌ Invalid card index!');
    const c = cards[idx];
    const card = CARDS.find(ca => ca.id === c.id);
    if (!card) return ctx.reply('Card not found!');
    await ctx.reply(`🃏 *Deck Card #${idx+1}*\n\n${card.emoji} *${card.name}*\n${getTierEmoji(card.tier)} ${card.tier} | ⚡${card.power}\n📺 ${card.series}`);
  },

  async submit(ctx) {
    const [, idx, price] = ctx.args;
    await ctx.reply(`🏷️ *Card Submission*\n\n🚧 Card marketplace submissions coming soon!\nCard index: ${idx}, Price: ${price} coins`);
  },

  async claim(ctx) {
    const spawnId = ctx.body?.trim();
    if (!spawnId) return ctx.reply('❌ Usage: .claim <spawn_id>\n\nWait for a card to be spawned by the owner!');
    
    const spawn = await Database.getSpawn(spawnId);
    if (!spawn) return ctx.reply('❌ Invalid spawn ID! This card may not exist or has already been claimed.');
    if (spawn.claimed) return ctx.reply('❌ This card has already been claimed! Better luck next time 😔');
    if (Date.now() - spawn.spawnedAt > 5 * 60 * 1000) {
      await Database.setSpawn(spawnId, { ...spawn, claimed: true, expired: true });
      return ctx.reply('❌ This card has *expired*! It disappeared 💨');
    }
    
    const card = CARDS.find(c => c.id === spawn.cardId);
    if (!card) return ctx.reply('❌ Card data not found!');
    
    // Mark as claimed
    await Database.setSpawn(spawnId, { ...spawn, claimed: true, claimedBy: ctx.sender, claimedAt: Date.now() });
    
    // Add card to claimer
    await Database.addCard(ctx.sender, spawn.cardId);
    
    const tierEmoji = getTierEmoji(card.tier);
    await ctx.reply(
      `🎉 *YOU CLAIMED IT!*\n\n` +
      `${card.emoji} *${card.name}*\n` +
      `${tierEmoji} *${card.tier}* Card\n` +
      `⚡ Power: *${card.power}*\n\n` +
      `✅ Added to your collection!\n` +
      `Use *.collection* to view your cards.`
    );
    await ctx.react('🎴');
  },
};
// ============================================================
// SPAWN CARD - Owner sends a card to a group for anyone to claim
// ============================================================
async function spawnCard(ctx, sock) {
  const { groupId, body, msg, sender } = ctx;
  const args = body.trim().split(' ');

  // Get a random card to spawn
  const tierRoll = Math.random() * 100;
  let pool;
  if (tierRoll < 2) pool = CARDS.filter(c => c.tier === 'Mythic');
  else if (tierRoll < 10) pool = CARDS.filter(c => c.tier === 'Legendary');
  else if (tierRoll < 30) pool = CARDS.filter(c => c.tier === 'Epic');
  else if (tierRoll < 60) pool = CARDS.filter(c => c.tier === 'Rare');
  else pool = CARDS.filter(c => c.tier === 'Common');

  if (!pool.length) pool = CARDS;
  const card = pool[Math.floor(Math.random() * pool.length)];

  // Generate a unique spawn ID
  const spawnId = `spawn_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;

  // Save spawn to DB so claim can verify
  await Database.setSpawn(spawnId, {
    cardId: card.id,
    spawnedAt: Date.now(),
    claimed: false,
    groupId,
  });

  const tierEmoji = getTierEmoji(card.tier);
  const customMsg = args.slice(1).join(' ') || '✨ A wild card has appeared! Be the first to claim it!';

  const spawnText =
    `╭━━━━━━━━━━━━━━━━━━━╮
` +
    `┃   🎴 *CARD SPAWNED!* 🎴   
` +
    `╰━━━━━━━━━━━━━━━━━━━╯

` +
    `${card.emoji} *${card.name}*
` +
    `${tierEmoji} *${card.tier}* Card
` +
    `📺 Series: *${card.series}*
` +
    `⚡ Power: *${card.power}*

` +
    `💬 ${customMsg}

` +
    `┏━━━━━━━━━━━━━━━━━━━┓
` +
    `┃ 🏃 First to claim wins!
` +
    `┃ Type: *.claim ${spawnId}*
` +
    `┗━━━━━━━━━━━━━━━━━━━┛

` +
    `⏳ Expires in *5 minutes!*
` +
    `⋆☽ ᴘᴏᴡᴇʀᴇᴅ ʙʏ Sʜᴀᴅᴏᴡ Gᴀʀᴅᴇɴ ☾⋆`;

  await sock.sendMessage(groupId, { text: spawnText }, { quoted: msg });

  // Auto-expire after 5 minutes
  setTimeout(async () => {
    try {
      const spawn = await Database.getSpawn(spawnId);
      if (spawn && !spawn.claimed) {
        await Database.setSpawn(spawnId, { ...spawn, claimed: true, expired: true });
        await sock.sendMessage(groupId, { text: `⏰ The *${card.name}* card was not claimed in time and has disappeared! 💨` });
      }
    } catch {}
  }, 5 * 60 * 1000);
}

module.exports.spawnCard = spawnCard;


// ============================================================
// AUTO-SPAWN SYSTEM — Spawns a shoob.gg card every 1hr per group
// Call startAutoSpawn(sock) after bot connects
// ============================================================
const activeGroupSpawns = new Map(); // groupId -> lastSpawnTime

async function doAutoSpawn(sock, groupId) {
  try {
    const { getRandomShoobCard, fetchCardImage } = require('../utils/shoob');
    const card = await getRandomShoobCard();
    if (!card) return;

    const shortId = Math.random().toString(36).substr(2, 6).toUpperCase();
    const spawnId = `auto_${shortId}`;
    const tierEmoji = { Common: '⚪', Rare: '🔵', Epic: '🟣', Legendary: '🟡', Mythic: '🔴' };

    await Database.setSpawn(spawnId, {
      card,
      shortId,
      claimed:   false,
      claimedBy: null,
      groupId,
      spawnedAt: Date.now(),
    });

    const spawnText =
      `${card.emoji || '🎴'} ✨ *A WILD CARD APPEARED!* ✨\n\n` +
      `╭━━〔 🌸 Sʜᴀᴅᴏᴡ Gᴀʀᴅᴇɴ 〕━━┈⊷\n` +
      `┃✰│ 📛 *${card.name}*\n` +
      `┃✰│ 📺 ꜱᴇʀɪᴇꜱ: *${card.series || 'Unknown'}*\n` +
      `┃✰│ ${tierEmoji[card.tier] || '⚪'} ᴛɪᴇʀ: *${card.tier || 'Common'}*\n` +
      `┃✰│ ⚡ ᴘᴏᴡᴇʀ: *${card.power || '??'}/100*\n` +
      `┃✰│ 🌐 ꜱᴏᴜʀᴄᴇ: *shoob.gg*\n` +
      `╰━━━━━━━━━━━━━━━┈⊷\n\n` +
      `🎯 *First to claim wins!*\n` +
      `Type: *.claim ${shortId}*\n\n` +
      `⏳ Expires in *5 minutes!*\n` +
      `⋆☽ ᴘᴏᴡᴇʀᴇᴅ ʙʏ Sʜᴀᴅᴏᴡ Gᴀʀᴅᴇɴ ☾⋆`;

    // Try to send with image
    const imgBuf = card.image ? await fetchCardImage(card.image).catch(() => null) : null;
    if (imgBuf) {
      await sock.sendMessage(groupId, { image: imgBuf, caption: spawnText });
    } else {
      await sock.sendMessage(groupId, { text: spawnText });
    }

    // Auto-expire after 5 minutes
    setTimeout(async () => {
      try {
        const spawn = await Database.getSpawn(spawnId);
        if (spawn && !spawn.claimed) {
          await Database.setSpawn(spawnId, { ...spawn, claimed: true, expired: true });
          await sock.sendMessage(groupId, {
            text: `⏰ The *${card.name}* card was not claimed in time! 💨`
          });
        }
      } catch {}
    }, 5 * 60 * 1000);

    activeGroupSpawns.set(groupId, Date.now());
  } catch {}
}

// Track activity per group; spawn if 1hr has passed since last spawn
async function trackActivityAndSpawn(sock, groupId) {
  const last = activeGroupSpawns.get(groupId) || 0;
  const ONE_HOUR = 60 * 60 * 1000;
  if (Date.now() - last >= ONE_HOUR) {
    activeGroupSpawns.set(groupId, Date.now());
    await doAutoSpawn(sock, groupId);
  }
}

module.exports.trackActivityAndSpawn = trackActivityAndSpawn;
module.exports.doAutoSpawn           = doAutoSpawn;
