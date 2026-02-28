const { getRandomInt } = require('../utils/helpers');
const { Database } = require('../database/firebase');
const axios = require('axios');

// ============================================================
// ACTIVE GAME SESSIONS (in-memory)
// ============================================================
const activeGames = new Map();

// ============================================================
// WORDCHAIN - Real dictionary validation via Free Dictionary API
// ============================================================
async function isValidWord(word) {
  try {
    const res = await axios.get(
      `https://api.dictionaryapi.dev/api/v2/entries/en/${word.toLowerCase()}`,
      { timeout: 5000 }
    );
    return Array.isArray(res.data) && res.data.length > 0;
  } catch {
    // If API is down, accept the word (don't punish players)
    return true;
  }
}

// ============================================================
// AKINATOR - Real 20 questions style with character database
// ============================================================
const AKINATOR_CHARACTERS = [
  { name: 'Naruto', anime: true, male: true, hero: true, blond: true, ninja: true, power: true },
  { name: 'Goku', anime: true, male: true, hero: true, saiyan: true, power: true, fighter: true },
  { name: 'Luffy', anime: true, male: true, hero: true, pirate: true, rubber: true, power: true },
  { name: 'Levi', anime: true, male: true, hero: true, soldier: true, short: true, titan: true },
  { name: 'Saitama', anime: true, male: true, hero: true, bald: true, power: true, strongest: true },
  { name: 'Zero Two', anime: true, female: true, hero: true, horns: true, pink: true, power: true },
  { name: 'Rem', anime: true, female: true, hero: true, maid: true, blue: true },
  { name: 'Gojo Satoru', anime: true, male: true, hero: true, power: true, white: true, blindfold: true },
  { name: 'Itachi', anime: true, male: true, villain: true, ninja: true, power: true, tragic: true },
  { name: 'Light Yagami', anime: true, male: true, villain: true, genius: true, notebook: true },
  { name: 'Vegeta', anime: true, male: true, hero: true, saiyan: true, pride: true, power: true },
  { name: 'Mikasa', anime: true, female: true, hero: true, soldier: true, titan: true, strong: true },
  { name: 'Nezuko', anime: true, female: true, hero: true, demon: true, pink: true, bamboo: true },
  { name: 'Tanjiro', anime: true, male: true, hero: true, demon: true, swordsman: true },
  { name: 'Killua', anime: true, male: true, hero: true, white: true, assassin: true, electric: true },
  { name: 'Todoroki', anime: true, male: true, hero: true, fire: true, ice: true, scar: true },
];

const AKINATOR_QUESTIONS = [
  { q: 'Is your character from an anime? 🎌', key: 'anime' },
  { q: 'Is your character male? 👦', key: 'male' },
  { q: 'Is your character female? 👧', key: 'female' },
  { q: 'Is your character a hero/protagonist? 🦸', key: 'hero' },
  { q: 'Is your character a villain/antagonist? 😈', key: 'villain' },
  { q: 'Does your character have special powers? ⚡', key: 'power' },
  { q: 'Is your character a fighter/warrior? ⚔️', key: 'fighter' },
  { q: 'Is your character a ninja? 🥷', key: 'ninja' },
  { q: 'Is your character blond/has yellow hair? 💛', key: 'blond' },
  { q: 'Is your character white-haired? ⬜', key: 'white' },
  { q: 'Is your character bald? 😐', key: 'bald' },
  { q: 'Does your character have pink features? 🌸', key: 'pink' },
  { q: 'Is your character a Saiyan? 🐒', key: 'saiyan' },
  { q: 'Is your character a pirate? ☠️', key: 'pirate' },
  { q: 'Is your character a maid? 🍵', key: 'maid' },
  { q: 'Is your character a demon? 👹', key: 'demon' },
  { q: 'Is your character a genius? 🧠', key: 'genius' },
  { q: 'Is your character an assassin? 🗡️', key: 'assassin' },
  { q: 'Is your character a soldier? 🪖', key: 'soldier' },
  { q: 'Is your character the strongest in their universe? 💪', key: 'strongest' },
];

function guessCharacter(answers) {
  let candidates = [...AKINATOR_CHARACTERS];
  for (const [key, val] of Object.entries(answers)) {
    if (val === true) candidates = candidates.filter(c => c[key] === true);
    else if (val === false) candidates = candidates.filter(c => !c[key]);
  }
  return candidates.length === 1 ? candidates[0] : candidates.length === 0 ? null : candidates[0];
}

// ============================================================
// UNO - Full multiplayer
// ============================================================
const UNO_COLORS = ['🔴', '🔵', '🟢', '🟡'];
const UNO_NUMBERS = ['0','1','2','3','4','5','6','7','8','9'];
const UNO_SPECIALS = ['⏭️ Skip', '🔄 Reverse', '+2'];
const UNO_WILDS = ['🌈 Wild', '🌈 Wild +4'];

function createUnoDeck() {
  const deck = [];
  for (const color of UNO_COLORS) {
    for (const num of UNO_NUMBERS) {
      deck.push(`${color} ${num}`);
      if (num !== '0') deck.push(`${color} ${num}`);
    }
    for (const sp of UNO_SPECIALS) {
      deck.push(`${color} ${sp}`);
      deck.push(`${color} ${sp}`);
    }
  }
  for (const wild of UNO_WILDS) {
    for (let i = 0; i < 4; i++) deck.push(wild);
  }
  return deck.sort(() => Math.random() - 0.5);
}

function dealHand(deck, count = 7) {
  return deck.splice(0, count);
}

function formatHand(cards) {
  return cards.map((c, i) => `${i + 1}. ${c}`).join('\n');
}

function canPlay(card, topCard, currentColor) {
  if (card.includes('Wild')) return true;
  const cardColor = UNO_COLORS.find(c => card.startsWith(c));
  const topColor = currentColor || UNO_COLORS.find(c => topCard.startsWith(c));
  if (cardColor === topColor) return true;
  // Same number/special
  const cardVal = card.replace(/🔴|🔵|🟢|🟡/g, '').trim();
  const topVal = topCard.replace(/🔴|🔵|🟢|🟡/g, '').trim();
  return cardVal === topVal;
}

// ============================================================
// TIC TAC TOE WINNER CHECK
// ============================================================
function checkTTTWinner(board, marks) {
  const wins = [[0,1,2],[3,4,5],[6,7,8],[0,3,6],[1,4,7],[2,5,8],[0,4,8],[2,4,6]];
  for (const mark of marks) {
    for (const [a,b,c] of wins) {
      if (board[a] === mark && board[b] === mark && board[c] === mark) return mark;
    }
  }
  return null;
}

module.exports = {
  // ============================================================
  // TIC TAC TOE
  // ============================================================
  async tictactoe(ctx) {
    const { sock, msg, groupId } = ctx;
    if (!ctx.isGroup) return ctx.reply('❌ Groups only!');
    const mentioned = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid;
    if (!mentioned?.length) return ctx.reply('❌ Mention someone to play!\nUsage: .ttt @user');

    const gameId = `ttt_${groupId}`;
    if (activeGames.has(gameId)) return ctx.reply('❌ A TicTacToe game is already running! Finish it first.');

    const board = ['1️⃣','2️⃣','3️⃣','4️⃣','5️⃣','6️⃣','7️⃣','8️⃣','9️⃣'];
    activeGames.set(gameId, {
      type: 'tictactoe',
      board,
      players: [ctx.sender, mentioned[0]],
      turn: 0,
      marks: ['❌','⭕']
    });

    const boardStr = `${board[0]}${board[1]}${board[2]}\n${board[3]}${board[4]}${board[5]}\n${board[6]}${board[7]}${board[8]}`;
    await sock.sendMessage(groupId, {
      text: `🎮 *TicTacToe Started!*\n\n❌ @${ctx.sender.split('@')[0]}\nvs\n⭕ @${mentioned[0].split('@')[0]}\n\n${boardStr}\n\n@${ctx.sender.split('@')[0]}'s turn!\nSend a number *1-9* to place your mark.`,
      mentions: [ctx.sender, mentioned[0]]
    }, { quoted: msg });
  },

  // ============================================================
  // CONNECT FOUR
  // ============================================================
  async connectfour(ctx) {
    const { sock, msg, groupId } = ctx;
    if (!ctx.isGroup) return ctx.reply('❌ Groups only!');
    const mentioned = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid;
    if (!mentioned?.length) return ctx.reply('❌ Mention someone to play!\nUsage: .c4 @user');

    const gameId = `c4_${groupId}`;
    if (activeGames.has(gameId)) return ctx.reply('❌ A Connect Four game is already running!');

    const cols = 7, rows = 6;
    const board = Array(rows).fill(null).map(() => Array(cols).fill('⬜'));

    activeGames.set(gameId, {
      type: 'connectfour',
      board, cols, rows,
      players: [ctx.sender, mentioned[0]],
      pieces: ['🔴','🟡'],
      turn: 0
    });

    const colNums = '1️⃣2️⃣3️⃣4️⃣5️⃣6️⃣7️⃣';
    const boardStr = board.map(r => r.join('')).join('\n');
    await sock.sendMessage(groupId, {
      text: `🔴🟡 *Connect Four!*\n\n🔴 @${ctx.sender.split('@')[0]}\nvs\n🟡 @${mentioned[0].split('@')[0]}\n\n${colNums}\n${boardStr}\n\n@${ctx.sender.split('@')[0]}'s turn!\nSend a number *1-7* to drop your piece.`,
      mentions: [ctx.sender, mentioned[0]]
    }, { quoted: msg });
  },

  // ============================================================
  // WORDCHAIN - With real dictionary validation
  // ============================================================
  async wordchain(ctx) {
    const { groupId } = ctx;
    if (!ctx.isGroup) return ctx.reply('❌ Groups only!');

    const gameId = `wc_${groupId}`;
    if (activeGames.has(gameId)) return ctx.reply('❌ A Word Chain game is already running!\nSend .stopgame to end it.');

    const startWords = ['APPLE','ORANGE','ELEPHANT','TIGER','ROBOT','GALAXY','NINJA','DRAGON'];
    const word = startWords[getRandomInt(0, startWords.length - 1)];

    activeGames.set(gameId, {
      type: 'wordchain',
      lastWord: word,
      used: new Set([word]),
      lastPlayer: null,
      scores: {}
    });

    await ctx.reply(
      `🔤 *Word Chain Game Started!*\n\n` +
      `📏 *Rules:*\n` +
      `• Each word must start with the last letter of the previous word\n` +
      `• No repeating words\n` +
      `• Must be a real English word (checked automatically!)\n` +
      `• If you fail, you're out!\n\n` +
      `🎯 Starting word: *${word}*\n` +
      `➡️ Next word must start with: *${word[word.length - 1].toUpperCase()}*\n\n` +
      `Send .stopgame to end the game.`
    );
  },

  // ============================================================
  // BATTLE
  // ============================================================
  async startbattle(ctx) {
    const { sock, msg, groupId } = ctx;
    if (!ctx.isGroup) return ctx.reply('❌ Groups only!');
    const mentioned = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid;
    if (!mentioned?.length) return ctx.reply('❌ Mention someone to battle!');

    const user = await Database.getUser(ctx.sender);
    const opponent = await Database.getUser(mentioned[0]);
    if (!user?.registered) return ctx.reply('❌ Register first with .register!');
    if (!opponent?.registered) return ctx.reply('❌ Opponent is not registered!');

    const gameId = `battle_${groupId}`;
    if (activeGames.has(gameId)) return ctx.reply('❌ A battle is already running!');

    activeGames.set(gameId, {
      type: 'battle',
      players: [ctx.sender, mentioned[0]],
      hp: [100, 100],
      turn: 0,
      defending: null
    });

    await sock.sendMessage(groupId, {
      text:
        `⚔️ *BATTLE STARTED!*\n\n` +
        `🗡️ @${ctx.sender.split('@')[0]} — ❤️ 100 HP\n` +
        `⚔️ @${mentioned[0].split('@')[0]} — ❤️ 100 HP\n\n` +
        `@${ctx.sender.split('@')[0]}'s turn! Choose your move:\n\n` +
        `1️⃣ ⚔️ Attack (30-50 dmg)\n` +
        `2️⃣ 🛡️ Defend (blocks 70% next hit)\n` +
        `3️⃣ ✨ Special (50-80 dmg, 50% miss)\n` +
        `4️⃣ 🏃 Dodge (50% chance to avoid)\n\n` +
        `Reply with *1, 2, 3, or 4*`,
      mentions: [ctx.sender, mentioned[0]]
    }, { quoted: msg });
  },

  // ============================================================
  // TRUTH OR DARE
  // ============================================================
  async truthordare(ctx) {
    const { TRUTHS, DARES } = require('../utils/helpers');
    const isT = Math.random() > 0.5;
    if (isT) {
      await ctx.reply(`🫣 *TRUTH*\n\n${TRUTHS[getRandomInt(0, TRUTHS.length - 1)]}`);
    } else {
      await ctx.reply(`😈 *DARE*\n\n${DARES[getRandomInt(0, DARES.length - 1)]}`);
    }
  },

  // ============================================================
  // AKINATOR - Real 20 questions AI guessing game
  // ============================================================
  async akinator(ctx) {
    const { groupId } = ctx;
    const gameId = `aki_${groupId}`;

    if (activeGames.has(gameId)) {
      return ctx.reply('❌ An Akinator game is already running!\nAnswer yes/no or send .stopgame to end it.');
    }

    activeGames.set(gameId, {
      type: 'akinator',
      questionIndex: 0,
      answers: {},
      starter: ctx.sender
    });

    await ctx.reply(
      `🔮 *AKINATOR*\n\n` +
      `Think of an anime character! I will try to guess who it is.\n\n` +
      `Answer each question with *yes* or *no*\n\n` +
      `❓ Question 1/${AKINATOR_QUESTIONS.length}:\n` +
      `*${AKINATOR_QUESTIONS[0].q}*`
    );
  },

  // ============================================================
  // UNO - Full multiplayer
  // ============================================================
  async uno(ctx) {
    const { sock, msg, groupId } = ctx;
    if (!ctx.isGroup) return ctx.reply('❌ Groups only!');

    const gameId = `uno_${groupId}`;

    // Join existing game
    if (activeGames.has(gameId)) {
      const game = activeGames.get(gameId);
      if (game.started) return ctx.reply('❌ UNO game already started! Wait for next round.');
      if (game.players.includes(ctx.sender)) return ctx.reply('❌ You already joined!');
      if (game.players.length >= 6) return ctx.reply('❌ Max 6 players!');

      game.players.push(ctx.sender);
      await sock.sendMessage(groupId, {
        text: `🃏 @${ctx.sender.split('@')[0]} joined UNO! (${game.players.length}/6 players)\n\nMore players can type *.uno* to join.\nHost type *.startuno* to begin!`,
        mentions: [ctx.sender]
      }, { quoted: msg });
      return;
    }

    // Create new game lobby
    activeGames.set(gameId, {
      type: 'uno',
      players: [ctx.sender],
      hands: {},
      deck: [],
      discardPile: [],
      currentColor: null,
      direction: 1,
      started: false,
      host: ctx.sender,
      pendingDraw: 0
    });

    await ctx.reply(
      `🃏 *UNO Game Created!*\n\n` +
      `Host: @${ctx.sender.split('@')[0]}\n` +
      `Players: 1/6\n\n` +
      `Others type *.uno* to join!\n` +
      `Host type *.startuno* when ready (min 2 players).\n` +
      `Type *.stopgame* to cancel.`
    );
  },

  async startuno(ctx) {
    const { sock, groupId } = ctx;
    const gameId = `uno_${groupId}`;
    const game = activeGames.get(gameId);

    if (!game || game.type !== 'uno') return ctx.reply('❌ No UNO lobby! Type .uno to create one.');
    if (game.host !== ctx.sender) return ctx.reply('❌ Only the host can start!');
    if (game.players.length < 2) return ctx.reply('❌ Need at least 2 players!');
    if (game.started) return ctx.reply('❌ Game already started!');

    game.started = true;
    game.deck = createUnoDeck();

    // Deal 7 cards to each player
    for (const p of game.players) {
      game.hands[p] = dealHand(game.deck, 7);
    }

    // Flip first card (avoid wilds as first card)
    let firstCard = game.deck.shift();
    while (firstCard.includes('Wild')) {
      game.deck.push(firstCard);
      game.deck.sort(() => Math.random() - 0.5);
      firstCard = game.deck.shift();
    }
    game.discardPile = [firstCard];
    game.currentColor = UNO_COLORS.find(c => firstCard.startsWith(c)) || UNO_COLORS[0];
    game.turnIndex = 0;

    // Send each player their hand via DM mention in group
    for (const p of game.players) {
      await sock.sendMessage(groupId, {
        text: `🃏 @${p.split('@')[0]}, your hand:\n\n${formatHand(game.hands[p])}\n\n_Play with: .play [card number]_`,
        mentions: [p]
      });
    }

    const currentPlayer = game.players[game.turnIndex];
    await sock.sendMessage(groupId, {
      text:
        `🃏 *UNO STARTED!*\n\n` +
        `Players: ${game.players.map(p => `@${p.split('@')[0]}`).join(', ')}\n\n` +
        `🃏 Top card: *${firstCard}*\n` +
        `🎨 Current color: ${game.currentColor}\n\n` +
        `@${currentPlayer.split('@')[0]}'s turn!\n` +
        `Use *.unoplay [number]* to play a card\n` +
        `Use *.unodraw* to draw a card`,
      mentions: game.players
    });
  },

  async unoplay(ctx) {
    const { sock, groupId, sender } = ctx;
    const gameId = `uno_${groupId}`;
    const game = activeGames.get(gameId);

    if (!game?.started) return ctx.reply('❌ No UNO game running!');
    if (!game.players.includes(sender)) return ctx.reply('❌ You are not in this game!');
    if (game.players[game.turnIndex] !== sender) return ctx.reply(`❌ It's not your turn! Wait for @${game.players[game.turnIndex].split('@')[0]}`);

    const cardIdx = parseInt(ctx.body) - 1;
    const hand = game.hands[sender];
    if (isNaN(cardIdx) || cardIdx < 0 || cardIdx >= hand.length) {
      return ctx.reply(`❌ Invalid card! You have ${hand.length} cards (1-${hand.length})`);
    }

    const card = hand[cardIdx];
    const topCard = game.discardPile[game.discardPile.length - 1];

    if (!canPlay(card, topCard, game.currentColor)) {
      return ctx.reply(`❌ Can't play *${card}*!\nTop card: ${topCard} | Color: ${game.currentColor}`);
    }

    // Remove card from hand
    hand.splice(cardIdx, 1);
    game.discardPile.push(card);

    // Update color
    if (!card.includes('Wild')) {
      game.currentColor = UNO_COLORS.find(c => card.startsWith(c)) || game.currentColor;
    }

    // Check win
    if (hand.length === 0) {
      activeGames.delete(gameId);
      return sock.sendMessage(groupId, {
        text: `🎉 *@${sender.split('@')[0]} WINS UNO!* 🃏\n\nCongratulations! 🏆`,
        mentions: [sender]
      });
    }

    // UNO warning
    if (hand.length === 1) {
      await sock.sendMessage(groupId, { text: `⚠️ *UNO!* @${sender.split('@')[0]} has 1 card left!`, mentions: [sender] });
    }

    // Handle special cards
    let skipNext = false;
    let drawAmount = 0;

    if (card.includes('Skip') || card.includes('⏭️')) skipNext = true;
    if (card.includes('Reverse') || card.includes('🔄')) game.direction *= -1;
    if (card.includes('+2')) drawAmount = 2;
    if (card.includes('+4')) drawAmount = 4;

    // Wild color choice
    if (card.includes('Wild')) {
      await sock.sendMessage(groupId, {
        text: `🌈 @${sender.split('@')[0]} played Wild!\nReply with color:\n1. 🔴 Red\n2. 🔵 Blue\n3. 🟢 Green\n4. 🟡 Yellow`,
        mentions: [sender]
      });
      game.waitingForColor = sender;
    }

    // Advance turn
    game.turnIndex = (game.turnIndex + game.direction + game.players.length) % game.players.length;
    if (skipNext) {
      game.turnIndex = (game.turnIndex + game.direction + game.players.length) % game.players.length;
    }

    // Apply draw cards
    if (drawAmount > 0) {
      const nextPlayer = game.players[game.turnIndex];
      for (let i = 0; i < drawAmount; i++) {
        if (game.deck.length === 0) game.deck = game.discardPile.splice(0, game.discardPile.length - 1).sort(() => Math.random() - 0.5);
        game.hands[nextPlayer].push(game.deck.shift());
      }
      await sock.sendMessage(groupId, {
        text: `📥 @${nextPlayer.split('@')[0]} draws ${drawAmount} cards!`,
        mentions: [nextPlayer]
      });
      game.turnIndex = (game.turnIndex + game.direction + game.players.length) % game.players.length;
    }

    const nextPlayer = game.players[game.turnIndex];
    await sock.sendMessage(groupId, {
      text:
        `🃏 @${sender.split('@')[0]} played: *${card}*\n` +
        `🎨 Color: ${game.currentColor}\n` +
        `📚 Cards left: ${hand.length}\n\n` +
        `@${nextPlayer.split('@')[0]}'s turn! (${game.hands[nextPlayer].length} cards)\n` +
        `*.unoplay [num]* or *.unodraw*`,
      mentions: [sender, nextPlayer]
    });
  },

  async unodraw(ctx) {
    const { sock, groupId, sender } = ctx;
    const gameId = `uno_${groupId}`;
    const game = activeGames.get(gameId);

    if (!game?.started) return ctx.reply('❌ No UNO game running!');
    if (game.players[game.turnIndex] !== sender) return ctx.reply('❌ Not your turn!');

    if (game.deck.length === 0) {
      game.deck = game.discardPile.splice(0, game.discardPile.length - 1).sort(() => Math.random() - 0.5);
    }

    const drawn = game.deck.shift();
    game.hands[sender].push(drawn);

    await sock.sendMessage(groupId, {
      text: `📥 @${sender.split('@')[0]} drew a card!\n\nYour hand:\n${formatHand(game.hands[sender])}\n\nIf you can play the drawn card, use *.unoplay ${game.hands[sender].length}*\nOtherwise your turn passes.`,
      mentions: [sender]
    });

    // Auto advance turn after drawing
    game.turnIndex = (game.turnIndex + game.direction + game.players.length) % game.players.length;
    const nextPlayer = game.players[game.turnIndex];
    await sock.sendMessage(groupId, {
      text: `@${nextPlayer.split('@')[0]}'s turn! (${game.hands[nextPlayer].length} cards)\n*.unoplay [num]* or *.unodraw*`,
      mentions: [nextPlayer]
    });
  },

  async unohand(ctx) {
    const { groupId, sender } = ctx;
    const game = activeGames.get(`uno_${groupId}`);
    if (!game?.started) return ctx.reply('❌ No UNO game running!');
    if (!game.hands[sender]) return ctx.reply('❌ You are not in this game!');
    await ctx.reply(`🃏 *Your Hand:*\n\n${formatHand(game.hands[sender])}\n\n🎨 Current color: ${game.currentColor}`);
  },

  // ============================================================
  // STOP GAME - Universal game stopper
  // ============================================================
  async stopgame(ctx) {
    const { groupId } = ctx;
    const gameTypes = ['ttt', 'c4', 'wc', 'battle', 'aki', 'uno'];
    let stopped = false;
    for (const t of gameTypes) {
      const key = `${t}_${groupId}`;
      if (activeGames.has(key)) {
        activeGames.delete(key);
        stopped = true;
      }
    }
    if (stopped) await ctx.reply('🛑 Game stopped!');
    else await ctx.reply('❌ No active game found!');
  },

  async chess(ctx) {
    await ctx.reply(`♟️ *Chess*\n\n🚧 Full chess coming soon!\n\nFor now try *.startbattle @user* for a turn-based RPG battle! ⚔️`);
  },

  async greekgod(ctx) {
    const gods = ['Zeus ⚡', 'Hera 👑', 'Poseidon 🌊', 'Athena 🦉', 'Apollo ☀️', 'Artemis 🌙', 'Ares ⚔️', 'Aphrodite 💕', 'Hermes 🪽', 'Hephaestus 🔥'];
    const god = gods[getRandomInt(0, gods.length - 1)];
    await ctx.reply(`⚡ *Your Greek God*\n\nYou are *${god}*!\n\n🏛️ Worship at the temple of Olympus!`);
  },

  // ============================================================
  // HANDLE ALL GAME RESPONSES
  // ============================================================
  async handleGameResponse(ctx) {
    const { groupId, sender, body, sock } = ctx;
    const text = body.trim().toLowerCase();

    // ── TicTacToe ───────────────────────────────────────────
    const ttt = activeGames.get(`ttt_${groupId}`);
    if (ttt && ttt.players[ttt.turn] === sender) {
      const pos = parseInt(text) - 1;
      if (isNaN(pos) || pos < 0 || pos > 8) return;
      if (ttt.board[pos] === '❌' || ttt.board[pos] === '⭕') return ctx.reply('❌ Spot taken!');

      ttt.board[pos] = ttt.marks[ttt.turn];
      const boardStr = `${ttt.board[0]}${ttt.board[1]}${ttt.board[2]}\n${ttt.board[3]}${ttt.board[4]}${ttt.board[5]}\n${ttt.board[6]}${ttt.board[7]}${ttt.board[8]}`;
      const winner = checkTTTWinner(ttt.board, ttt.marks);

      if (winner) {
        activeGames.delete(`ttt_${groupId}`);
        return sock.sendMessage(groupId, {
          text: `🎮 *TicTacToe*\n\n${boardStr}\n\n🏆 *@${ttt.players[ttt.turn].split('@')[0]} WINS!*`,
          mentions: ttt.players
        });
      }
      if (!ttt.board.some(c => !['❌','⭕'].includes(c))) {
        activeGames.delete(`ttt_${groupId}`);
        return sock.sendMessage(groupId, { text: `🎮 *TicTacToe*\n\n${boardStr}\n\n🤝 *It's a TIE!*`, mentions: ttt.players });
      }
      ttt.turn = ttt.turn === 0 ? 1 : 0;
      return sock.sendMessage(groupId, {
        text: `🎮 *TicTacToe*\n\n${boardStr}\n\n@${ttt.players[ttt.turn].split('@')[0]}'s turn!`,
        mentions: ttt.players
      });
    }

    // ── Connect Four ─────────────────────────────────────────
    const c4 = activeGames.get(`c4_${groupId}`);
    if (c4 && c4.players[c4.turn] === sender) {
      const col = parseInt(text) - 1;
      if (isNaN(col) || col < 0 || col >= c4.cols) return;

      // Drop piece
      let placed = false;
      for (let r = c4.rows - 1; r >= 0; r--) {
        if (c4.board[r][col] === '⬜') {
          c4.board[r][col] = c4.pieces[c4.turn];
          placed = true;
          break;
        }
      }
      if (!placed) return ctx.reply('❌ Column is full!');

      const colNums = '1️⃣2️⃣3️⃣4️⃣5️⃣6️⃣7️⃣';
      const boardStr = c4.board.map(r => r.join('')).join('\n');

      // Check win (simplified - check 4 in a row)
      const piece = c4.pieces[c4.turn];
      let won = false;
      const b = c4.board;
      for (let r = 0; r < c4.rows && !won; r++) {
        for (let c2 = 0; c2 < c4.cols && !won; c2++) {
          if (b[r][c2] !== piece) continue;
          if (c2 + 3 < c4.cols && b[r][c2+1] === piece && b[r][c2+2] === piece && b[r][c2+3] === piece) won = true;
          if (r + 3 < c4.rows && b[r+1][c2] === piece && b[r+2][c2] === piece && b[r+3][c2] === piece) won = true;
          if (r + 3 < c4.rows && c2 + 3 < c4.cols && b[r+1][c2+1] === piece && b[r+2][c2+2] === piece && b[r+3][c2+3] === piece) won = true;
          if (r + 3 < c4.rows && c2 - 3 >= 0 && b[r+1][c2-1] === piece && b[r+2][c2-2] === piece && b[r+3][c2-3] === piece) won = true;
        }
      }

      if (won) {
        activeGames.delete(`c4_${groupId}`);
        return sock.sendMessage(groupId, {
          text: `🔴🟡 *Connect Four*\n\n${colNums}\n${boardStr}\n\n🏆 *@${c4.players[c4.turn].split('@')[0]} WINS!*`,
          mentions: c4.players
        });
      }

      c4.turn = c4.turn === 0 ? 1 : 0;
      return sock.sendMessage(groupId, {
        text: `🔴🟡 *Connect Four*\n\n${colNums}\n${boardStr}\n\n@${c4.players[c4.turn].split('@')[0]}'s turn! (${c4.pieces[c4.turn]})`,
        mentions: c4.players
      });
    }

    // ── Word Chain ───────────────────────────────────────────
    const wc = activeGames.get(`wc_${groupId}`);
    if (wc && text.length >= 2 && /^[a-z]+$/i.test(text)) {
      const word = text.toUpperCase();
      const lastLetter = wc.lastWord[wc.lastWord.length - 1].toUpperCase();

      if (word[0].toUpperCase() !== lastLetter) return; // Wrong start letter, ignore
      if (wc.used.has(word)) {
        return sock.sendMessage(groupId, {
          text: `❌ *"${word}"* was already used!\n@${sender.split('@')[0]} loses a point!`,
          mentions: [sender]
        });
      }

      // Validate word
      const valid = await isValidWord(word);
      if (!valid) {
        return sock.sendMessage(groupId, {
          text: `❌ *"${word}"* is not a valid English word!\n@${sender.split('@')[0]} is out! ☠️`,
          mentions: [sender]
        });
      }

      wc.used.add(word);
      wc.lastWord = word;
      wc.lastPlayer = sender;
      wc.scores[sender] = (wc.scores[sender] || 0) + word.length;

      return sock.sendMessage(groupId, {
        text:
          `✅ *${word}* — Valid! (+${word.length} pts)\n` +
          `@${sender.split('@')[0]} Score: ${wc.scores[sender]}\n\n` +
          `➡️ Next word must start with: *${word[word.length-1].toUpperCase()}*`,
        mentions: [sender]
      });
    }

    // ── Akinator ─────────────────────────────────────────────
    const aki = activeGames.get(`aki_${groupId}`);
    if (aki) {
      const isYes = ['yes','y','yeah','yep','yup','true'].includes(text);
      const isNo = ['no','n','nope','nah','false'].includes(text);
      if (!isYes && !isNo) return;

      const q = AKINATOR_QUESTIONS[aki.questionIndex];
      aki.answers[q.key] = isYes;
      aki.questionIndex++;

      // Try to guess early if confident
      const guess = guessCharacter(aki.answers);
      const remaining = AKINATOR_QUESTIONS.length - aki.questionIndex;

      if (aki.questionIndex >= AKINATOR_QUESTIONS.length || (guess && aki.questionIndex >= 5)) {
        activeGames.delete(`aki_${groupId}`);
        if (guess) {
          return ctx.reply(
            `🔮 *I think I know!*\n\n` +
            `Is your character...\n\n` +
            `✨ *${guess.name}*?\n\n` +
            `Type *yes* if correct or *no* if wrong!`
          );
        } else {
          return ctx.reply(`🔮 *You stumped me!* 😲\n\nI couldn't guess your character after ${aki.questionIndex} questions!\n\nWho were you thinking of? 👀`);
        }
      }

      const nextQ = AKINATOR_QUESTIONS[aki.questionIndex];
      return ctx.reply(
        `${isYes ? '✅' : '❌'} Got it!\n\n` +
        `❓ Question ${aki.questionIndex + 1}/${AKINATOR_QUESTIONS.length}:\n` +
        `*${nextQ.q}*\n\n` +
        `_(${remaining} questions remaining)_`
      );
    }

    // ── Battle ───────────────────────────────────────────────
    const battle = activeGames.get(`battle_${groupId}`);
    if (battle && battle.players[battle.turn] === sender) {
      const move = parseInt(text);
      if (![1,2,3,4].includes(move)) return;

      const attackerIdx = battle.turn;
      const defenderIdx = attackerIdx === 0 ? 1 : 0;
      let damage = 0, moveText = '';

      if (move === 1) {
        damage = getRandomInt(30, 50);
        moveText = `⚔️ *Attack!* ${damage} damage!`;
      } else if (move === 2) {
        battle.defending = attackerIdx;
        moveText = `🛡️ *Defending!* (blocks 70% of next hit)`;
      } else if (move === 3) {
        if (Math.random() > 0.5) {
          damage = getRandomInt(50, 80);
          moveText = `✨ *Special Hit!* ${damage} damage!`;
        } else {
          moveText = `✨ *Special MISSED!* 😅`;
        }
      } else {
        if (Math.random() > 0.5) {
          moveText = `🏃 *Dodged!* No damage taken!`;
          battle.turn = defenderIdx;
          return sock.sendMessage(groupId, {
            text:
              `⚔️ *Battle!*\n\n${moveText}\n\n` +
              `❤️ @${battle.players[0].split('@')[0]}: ${battle.hp[0]} HP\n` +
              `❤️ @${battle.players[1].split('@')[0]}: ${battle.hp[1]} HP\n\n` +
              `@${battle.players[battle.turn].split('@')[0]}'s turn!\n1️⃣ Attack  2️⃣ Defend  3️⃣ Special  4️⃣ Dodge`,
            mentions: battle.players
          });
        } else {
          moveText = `🏃 *Dodge failed!*`;
        }
      }

      // Apply defense reduction
      if (battle.defending === defenderIdx && damage > 0) {
        damage = Math.floor(damage * 0.3);
        battle.defending = null;
        moveText += ` (blocked! only ${damage} dmg)`;
      }

      if (damage > 0) battle.hp[defenderIdx] = Math.max(0, battle.hp[defenderIdx] - damage);

      if (battle.hp[defenderIdx] <= 0) {
        activeGames.delete(`battle_${groupId}`);
        const winner = battle.players[attackerIdx];
        const loser  = battle.players[defenderIdx];
        const combatXpGain = 150;
        await Database.addBalance(winner, 300).catch(() => {});
        // Track combat XP and battle stats for winner
        try {
          const winUser = await Database.getUser(winner);
          if (winUser?.registered) {
            const newXp = (winUser.xp || 0) + combatXpGain;
            const newLevel = Math.floor(newXp / 1000) + 1;
            const prevRpgXp = winUser.rpgXp || {};
            await Database.setUser(winner, {
              xp: newXp,
              level: Math.max(newLevel, winUser.level || 1),
              rpg: { ...winUser.rpg, wins: (winUser.rpg?.wins || 0) + 1, battlesPlayed: (winUser.rpg?.battlesPlayed || 0) + 1 },
              rpgXp: { ...prevRpgXp, combat: (prevRpgXp.combat || 0) + combatXpGain }
            });
          }
          // Track battles played for loser
          const loseUser = await Database.getUser(loser);
          if (loseUser?.registered) {
            await Database.setUser(loser, {
              rpg: { ...loseUser.rpg, battlesPlayed: (loseUser.rpg?.battlesPlayed || 0) + 1 }
            });
          }
        } catch {}
        return sock.sendMessage(groupId, {
          text:
            `⚔️ *BATTLE OVER!*\n\n${moveText}\n\n` +
            `🏆 *@${winner.split('@')[0]} WINS!*\n💰 +300 coins!\n✨ +${combatXpGain} Combat XP!`,
          mentions: battle.players
        });
      }

      battle.turn = defenderIdx;
      return sock.sendMessage(groupId, {
        text:
          `⚔️ *Battle!*\n\n${moveText}\n\n` +
          `❤️ @${battle.players[0].split('@')[0]}: ${battle.hp[0]} HP\n` +
          `❤️ @${battle.players[1].split('@')[0]}: ${battle.hp[1]} HP\n\n` +
          `@${battle.players[battle.turn].split('@')[0]}'s turn!\n1️⃣ Attack  2️⃣ Defend  3️⃣ Special  4️⃣ Dodge`,
        mentions: battle.players
      });
    }
  }
};

// ============================================================
// RPG SYSTEM — Exported separately for messageHandler routing
// ============================================================
const RPG_CLASSES = {
  warrior:  { emoji: '⚔️', hp: 150, atk: 25, def: 20, spd: 10 },
  mage:     { emoji: '🔮', hp: 100, atk: 40, def: 10, spd: 15 },
  archer:   { emoji: '🏹', hp: 120, atk: 30, def: 15, spd: 25 },
  assassin: { emoji: '🗡️', hp: 110, atk: 35, def: 12, spd: 30 },
  tank:     { emoji: '🛡️', hp: 200, atk: 15, def: 40, spd: 5  },
};

const DUNGEONS = [
  { name: '🌲 Forest of Shadows',   minLevel: 1,  reward: [100, 300],  xp: 150, boss: 'Shadow Wolf' },
  { name: '🏚️ Haunted Mansion',     minLevel: 3,  reward: [250, 600],  xp: 300, boss: 'Ghost Knight' },
  { name: '🌋 Volcano Depths',      minLevel: 5,  reward: [500, 1000], xp: 500, boss: 'Fire Drake' },
  { name: '🌊 Sunken Temple',       minLevel: 8,  reward: [800, 1500], xp: 800, boss: 'Sea Serpent' },
  { name: '🏔️ Dragon\'s Peak',      minLevel: 12, reward: [1500, 3000],xp: 1200, boss: 'Ancient Dragon' },
  { name: '👁️ Void Realm',          minLevel: 20, reward: [3000, 6000],xp: 2000, boss: 'Void God' },
];

const QUESTS = [
  { id: 'fish10',    name: '🎣 Fisher\'s Quest',    desc: 'Fish 10 times',       reward: 500,  xp: 200 },
  { id: 'dig10',     name: '⛏️ Digger\'s Quest',    desc: 'Dig 10 times',        reward: 500,  xp: 200 },
  { id: 'win5',      name: '🎰 Gambler\'s Quest',   desc: 'Win 5 gambles',       reward: 800,  xp: 300 },
  { id: 'rob3',      name: '🦹 Thief\'s Quest',     desc: 'Rob 3 people',        reward: 600,  xp: 250 },
  { id: 'battle5',   name: '⚔️ Warrior\'s Quest',   desc: 'Win 5 battles',       reward: 1000, xp: 400 },
  { id: 'dungeon3',  name: '🏚️ Explorer\'s Quest',  desc: 'Clear 3 dungeons',    reward: 1500, xp: 600 },
];

module.exports.rpg = {
  async rpgprofile(ctx) {
    const { Database } = require('../database/firebase');
    const user = await Database.getUser(ctx.sender);
    if (!user?.registered) return ctx.reply('❌ Register first with .register!');

    const rpg = user.rpg || {};
    const cls = rpg.class || 'warrior';
    const base = RPG_CLASSES[cls] || RPG_CLASSES.warrior;
    const level = user.level || 1;
    const hp = rpg.hp ?? base.hp;
    const maxHp = base.hp + (level * 10);
    const hpBar = '█'.repeat(Math.floor((hp / maxHp) * 10)) + '░'.repeat(10 - Math.floor((hp / maxHp) * 10));

    await ctx.reply(
      `${base.emoji} *RPG Profile*\n\n` +
      `┏━━━━━━━━━━━━━❥❥❥\n` +
      `┃ 👤 ${user.name}\n` +
      `┃ 🏆 Level: *${level}*\n` +
      `┃ ⚔️ Class: *${cls.charAt(0).toUpperCase() + cls.slice(1)}*\n` +
      `┣━━━━━━━━━━━━━❥❥❥\n` +
      `┃ ❤️ HP: *${hp}/${maxHp}*\n` +
      `┃ [${hpBar}]\n` +
      `┃ ⚔️ Attack: *${base.atk + (level * 2)}*\n` +
      `┃ 🛡️ Defense: *${base.def + level}*\n` +
      `┃ 💨 Speed: *${base.spd}*\n` +
      `┣━━━━━━━━━━━━━❥❥❥\n` +
      `┃ 🏟️ Dungeons: *${rpg.dungeons || 0}*\n` +
      `┃ ⚔️ Battles won: *${rpg.wins || 0}*\n` +
      `┃ 📜 Quests done: *${rpg.quests || 0}*\n` +
      `┗━━━━━━━━━━━━━❥❥❥\n\n` +
      `Change class: *.setclass [warrior/mage/archer/assassin/tank]*`
    );
  },

  async setclass(ctx) {
    const { Database } = require('../database/firebase');
    const cls = ctx.body?.toLowerCase();
    if (!cls || !RPG_CLASSES[cls]) {
      return ctx.reply(
        `❌ Invalid class!\n\n` +
        `Available classes:\n` +
        `⚔️ *warrior* — High HP, balanced stats\n` +
        `🔮 *mage* — Highest attack, low defense\n` +
        `🏹 *archer* — Balanced, high speed\n` +
        `🗡️ *assassin* — High attack, very fast\n` +
        `🛡️ *tank* — Highest defense and HP`
      );
    }
    const base = RPG_CLASSES[cls];
    await Database.setUser(ctx.sender, { rpg: { class: cls, hp: base.hp } });
    await ctx.reply(`✅ Class set to *${cls.charAt(0).toUpperCase() + cls.slice(1)}* ${base.emoji}\n\nHP: ${base.hp} | ATK: ${base.atk} | DEF: ${base.def} | SPD: ${base.spd}`);
  },

  async dungeon(ctx) {
    const { Database } = require('../database/firebase');
    const { getRandomInt } = require('../utils/helpers');
    const user = await Database.getUser(ctx.sender);
    if (!user?.registered) return ctx.reply('❌ Register first!');

    const level = user.level || 1;
    const available = DUNGEONS.filter(d => d.minLevel <= level);
    if (!ctx.body) {
      const list = available.map((d, i) =>
        `*${i + 1}.* ${d.name}\n` +
        `   Min Level: ${d.minLevel} | Boss: ${d.boss}\n` +
        `   Reward: ${d.reward[0]}-${d.reward[1]} coins`
      ).join('\n\n');
      return ctx.reply(
        `🏟️ *Dungeons*\n\n${list}\n\n` +
        `Enter with: *.dungeon [number]*`
      );
    }

    const idx = parseInt(ctx.body) - 1;
    if (isNaN(idx) || !available[idx]) return ctx.reply('❌ Invalid dungeon number!');

    const dungeon = available[idx];

    // 5 min cooldown
    const wait = await (async () => {
      const last = await Database.getCooldown(`dungeon_${ctx.sender}`);
      const now = Date.now();
      if (last && now - last < 5 * 60 * 1000) return Math.ceil((5 * 60 * 1000 - (now - last)) / 1000);
      await Database.setCooldown(`dungeon_${ctx.sender}`, now);
      return 0;
    })();
    if (wait > 0) {
      const m = Math.floor(wait / 60), s = wait % 60;
      return ctx.reply(`⏳ You're resting! Wait *${m}m ${s}s* before entering a dungeon.`);
    }

    const cls = user.rpg?.class || 'warrior';
    const base = RPG_CLASSES[cls] || RPG_CLASSES.warrior;
    const atk = base.atk + (level * 2);
    const def = base.def + level;

    // Battle simulation
    let playerHp = (user.rpg?.hp || base.hp);
    let bossHp = 80 + (dungeon.minLevel * 20);
    let rounds = 0;
    const log = [];

    while (playerHp > 0 && bossHp > 0 && rounds < 15) {
      const dmgToBoss = Math.max(5, atk - getRandomInt(0, 15) + getRandomInt(0, 20));
      const dmgToPlayer = Math.max(3, dungeon.minLevel * 5 - def + getRandomInt(0, 10));
      bossHp -= dmgToBoss;
      if (bossHp > 0) playerHp -= dmgToPlayer;
      rounds++;
      if (rounds <= 3) log.push(`Round ${rounds}: You dealt *${dmgToBoss}* dmg, took *${dmgToPlayer}* dmg`);
    }

    const won = bossHp <= 0;

    if (won) {
      const reward = getRandomInt(dungeon.reward[0], dungeon.reward[1]);
      const xp = dungeon.xp;
      await Database.addBalance(ctx.sender, reward);
      const newXp = (user.xp || 0) + xp;
      const newLevel = Math.floor(newXp / 1000) + 1;
      // Track RPG XP breakdown
      const prevRpgXp = user.rpgXp || {};
      await Database.setUser(ctx.sender, {
        xp: newXp,
        level: Math.max(newLevel, level),
        rpg: { ...user.rpg, hp: Math.max(playerHp, 10), dungeons: (user.rpg?.dungeons || 0) + 1 },
        rpgXp: { ...prevRpgXp, dungeon: (prevRpgXp.dungeon || 0) + xp }
      });

      await ctx.reply(
        `🏆 *DUNGEON CLEARED!*\n\n` +
        `${dungeon.name}\n` +
        `Boss defeated: *${dungeon.boss}*\n\n` +
        `${log.join('\n')}\n` +
        `...\n\n` +
        `❤️ HP remaining: *${Math.max(playerHp, 0)}*\n` +
        `💵 Reward: *+${reward} coins*\n` +
        `✨ XP: *+${xp}*\n` +
        `${newLevel > level ? `🎉 *LEVEL UP! ${level} → ${newLevel}*\n` : ''}` +
        `\n⏳ Dungeon cooldown: *5 minutes*`
      );
    } else {
      await Database.setUser(ctx.sender, {
        rpg: { ...user.rpg, hp: 10 }
      });
      await ctx.reply(
        `💀 *DUNGEON FAILED!*\n\n` +
        `${dungeon.name}\n` +
        `You were defeated by *${dungeon.boss}*!\n\n` +
        `${log.join('\n')}\n...\n\n` +
        `❤️ HP: *10* (barely survived)\n` +
        `💊 Use *.use health potion* to heal!\n\n` +
        `⏳ Cooldown: *5 minutes*`
      );
    }
  },

  async quest(ctx) {
    const { Database } = require('../database/firebase');
    const user = await Database.getUser(ctx.sender);
    if (!user?.registered) return ctx.reply('❌ Register first!');

    const completed = user.rpg?.completedQuests || [];
    const active = QUESTS.filter(q => !completed.includes(q.id));

    if (!active.length) return ctx.reply('🎉 *You completed all available quests!* More coming soon!');

    const list = active.map((q, i) =>
      `*${i + 1}.* ${q.name}\n` +
      `   📋 ${q.desc}\n` +
      `   💵 Reward: ${q.reward} coins | ✨ ${q.xp} XP`
    ).join('\n\n');

    await ctx.reply(
      `📜 *Available Quests*\n\n${list}\n\n` +
      `Quests complete automatically as you play!\n` +
      `✅ Completed: *${completed.length}/${QUESTS.length}*`
    );
  },

  async heal(ctx) {
    const { Database } = require('../database/firebase');
    const user = await Database.getUser(ctx.sender);
    if (!user?.registered) return ctx.reply('❌ Register first!');

    const cls = user.rpg?.class || 'warrior';
    const base = RPG_CLASSES[cls] || RPG_CLASSES.warrior;
    const maxHp = base.hp + ((user.level || 1) * 10);
    const currentHp = user.rpg?.hp ?? maxHp;

    if (currentHp >= maxHp) return ctx.reply(`❤️ You're already at full HP! (*${maxHp}/${maxHp}*)`);

    // Check for potions
    const hasSmall = user.inventory?.includes('health_potion');
    const hasMega = user.inventory?.includes('mega_potion');

    if (!hasSmall && !hasMega) {
      return ctx.reply(
        `❌ No potions!\n\n` +
        `Buy from *.shop*:\n` +
        `🧪 Health Potion — 250 coins (+50 HP)\n` +
        `🧪 Mega Potion — 600 coins (+100 HP)`
      );
    }

    const useItem = hasMega ? 'mega_potion' : 'health_potion';
    const healAmount = hasMega ? 100 : 50;
    const newHp = Math.min(currentHp + healAmount, maxHp);

    const inv = [...user.inventory];
    inv.splice(inv.indexOf(useItem), 1);
    await Database.setUser(ctx.sender, {
      inventory: inv,
      rpg: { ...user.rpg, hp: newHp }
    });

    await ctx.reply(
      `🧪 *Healed!*\n\n` +
      `❤️ HP: *${currentHp} → ${newHp}/${maxHp}*\n` +
      `+${healAmount} HP restored!\n\n` +
      `Used: ${hasMega ? '🧪 Mega Potion' : '🧪 Health Potion'}`
    );
  },

  async craft(ctx) {
    const recipes = [
      { name: '⚗️ Elixir',       needs: ['health_potion', 'energy_drink'],  gives: 'elixir',       desc: 'Health Potion + Energy Drink' },
      { name: '🔮 Shadow Crystal', needs: ['gem', 'gem', 'gem'],            gives: 'shadow_crystal',desc: '3x Gem' },
      { name: '🐉 Dragon Armor',  needs: ['armor', 'dragon_egg'],           gives: 'dragon_armor',  desc: 'Iron Armor + Dragon Egg' },
      { name: '🗡️ Katana',        needs: ['sword', 'dagger'],              gives: 'katana',        desc: 'Sword + Dagger' },
      { name: '🎣 Premium Rod',   needs: ['fishingrod', 'net'],             gives: 'premium_rod',   desc: 'Fishing Rod + Net' },
    ];

    if (!ctx.body) {
      const list = recipes.map((r, i) =>
        `*${i + 1}.* ${r.name}\n   📦 Needs: ${r.desc}`
      ).join('\n\n');
      return ctx.reply(`🔨 *Crafting Recipes*\n\n${list}\n\nCraft with: *.craft [number]*`);
    }

    const { Database } = require('../database/firebase');
    const user = await Database.getUser(ctx.sender);
    if (!user?.registered) return ctx.reply('❌ Register first!');

    const idx = parseInt(ctx.body) - 1;
    if (isNaN(idx) || !recipes[idx]) return ctx.reply('❌ Invalid recipe number!');

    const recipe = recipes[idx];
    const inv = [...(user.inventory || [])];

    // Check if has all ingredients
    const tempInv = [...inv];
    for (const need of recipe.needs) {
      const i = tempInv.indexOf(need);
      if (i === -1) return ctx.reply(`❌ Missing ingredients!\n📦 Need: *${recipe.desc}*`);
      tempInv.splice(i, 1);
    }

    // Remove ingredients, add result
    for (const need of recipe.needs) {
      inv.splice(inv.indexOf(need), 1);
    }
    inv.push(recipe.gives);
    await Database.setUser(ctx.sender, { inventory: inv });

    await ctx.reply(
      `🔨 *Crafting Success!*\n\n` +
      `✅ Crafted: *${recipe.name}*\n` +
      `📦 Used: ${recipe.desc}\n\n` +
      `Check *.inv* to see your new item!`
    );
  },
};
