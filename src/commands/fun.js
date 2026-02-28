const { getRandomInt, JOKES, TRUTHS, DARES, WYR_QUESTIONS } = require('../utils/helpers');

const CHARACTERS = ['Naruto', 'Goku', 'Luffy', 'Eren Yeager', 'Levi Ackerman', 'Itachi', 'Sasuke', 'Light Yagami', 'L', 'Saitama', 'Gojo Satoru', 'Killua', 'Gon Freecss', 'Ichigo Kurosaki', 'Edward Elric', 'Mikasa Ackerman', 'Rem', 'Zero Two', 'Asuna', 'Aqua'];

const POV_SCENARIOS = [
  "You wake up as the main character of your favorite anime...",
  "POV: You just unlocked a hidden power that everyone wants...",
  "POV: Your best friend just revealed they were the villain all along...",
  "POV: You're the last human in a zombie apocalypse...",
  "POV: You just found a Death Note and 3 rules you never knew existed...",
  "POV: The person you like confesses to you but they're actually an alien...",
];

const RELATIONS = ['bestie 💕', 'enemy 😤', 'secret crush 🥺', 'rival ⚔️', 'twin 👯', 'soulmate 💫', 'annoying sibling 😭', 'protector 🛡️'];

function getSenderName(ctx) {
  return ctx.msg.pushName || `@${ctx.sender.split('@')[0]}`;
}

module.exports = {
  async gay(ctx) {
    const percent = getRandomInt(0, 100);
    await ctx.reply(`🏳️‍🌈 *Gay Rate*\n\n${getSenderName(ctx)} is *${percent}%* gay!\n\n${percent > 80 ? '🌈 Very gay!' : percent > 50 ? '🤔 A little gay...' : '😎 Pretty straight!'}`);
  },

  async lesbian(ctx) {
    const percent = getRandomInt(0, 100);
    await ctx.reply(`🏳️‍🌈 *Lesbian Rate*\n\n${getSenderName(ctx)} is *${percent}%* lesbian!\n\n${percent > 80 ? '💜 Very lesbian!' : percent > 50 ? '🤷 Sort of?' : '😏 Not really!'}`);
  },

  async simp(ctx) {
    const percent = getRandomInt(0, 100);
    await ctx.reply(`😍 *Simp Rate*\n\n${getSenderName(ctx)} is *${percent}%* simp!\n\n${percent > 80 ? '🫣 Certified simp!' : percent > 50 ? '😅 Kinda simping...' : '😎 Not a simp!'}`);
  },

  async match(ctx) {
    const { msg } = ctx;
    const mentioned = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid;
    if (!mentioned?.length) return ctx.reply('❌ Mention someone to match with!');
    const percent = getRandomInt(0, 100);
    const target = `@${mentioned[0].split('@')[0]}`;
    await ctx.sock.sendMessage(ctx.groupId, {
      text: `💘 *Match Results*\n\n${getSenderName(ctx)} + ${target} = *${percent}%*\n\n${percent > 80 ? '💞 Perfect match!' : percent > 50 ? '💕 Good potential!' : percent > 30 ? '🤝 Just friends...' : '😬 Not a match!'}`,
      mentions: mentioned
    }, { quoted: ctx.msg });
  },

  async ship(ctx) {
    const { msg } = ctx;
    const mentioned = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid || [];
    if (mentioned.length < 2) return ctx.reply('❌ Mention 2 people to ship!');
    const name1 = mentioned[0].split('@')[0].slice(0, 4);
    const name2 = mentioned[1].split('@')[0].slice(-4);
    const shipName = name1 + name2;
    const percent = getRandomInt(20, 100);
    await ctx.sock.sendMessage(ctx.groupId, {
      text: `⚓ *Ship Results*\n\n@${mentioned[0].split('@')[0]} + @${mentioned[1].split('@')[0]}\n\n💌 Ship name: *${shipName}*\n❤️ Compatibility: *${percent}%*`,
      mentions: mentioned
    }, { quoted: ctx.msg });
  },

  async character(ctx) {
    const char = CHARACTERS[getRandomInt(0, CHARACTERS.length - 1)];
    await ctx.reply(`🎭 *You are...*\n\n✨ *${char}*!\n\nYou share the same energy and spirit as this legendary character!`);
  },

  async psize(ctx) {
    const { body } = ctx;
    const name = body || getSenderName(ctx);
    const seed = name.split('').reduce((a, c) => a + c.charCodeAt(0), 0);
    const size = (seed % 20) + 1;
    const bar = '█'.repeat(Math.min(size, 10)) + '░'.repeat(10 - Math.min(size, 10));
    await ctx.reply(`🍆 *PP Size*\n\n📏 [${bar}] ${size} cm\n\n${size > 15 ? '😱 Monster!' : size > 10 ? '😏 Nice!' : size > 5 ? '🤏 Average...' : '😬 Tiny!'}`);
  },

  async skill(ctx) {
    const skills = ['Gaming', 'Cooking', 'Singing', 'Dancing', 'Fighting', 'Coding', 'Drawing', 'Lying', 'Sleeping', 'Eating'];
    const skill = skills[getRandomInt(0, skills.length - 1)];
    const level = getRandomInt(1, 100);
    await ctx.reply(`⚡ *Skill Check*\n\n${getSenderName(ctx)}'s skill: *${skill}*\nLevel: *${level}/100*\n\n${level > 80 ? '🏆 Master!' : level > 50 ? '👍 Good!' : '📚 Keep practicing!'}`);
  },

  async duality(ctx) {
    const lightSide = ['kind', 'gentle', 'helpful', 'smart', 'caring'];
    const darkSide = ['chaotic', 'menacing', 'mysterious', 'unpredictable', 'dangerous'];
    const light = lightSide[getRandomInt(0, 4)];
    const dark = darkSide[getRandomInt(0, 4)];
    await ctx.reply(`☯️ *Your Duality*\n\n✨ Light side: *${light}*\n🌑 Dark side: *${dark}*\n\nEvery person has two faces... 🎭`);
  },

  async gen(ctx) {
    const gens = ['Gen Z 📱', 'Millennial 💻', 'Gen X 📺', 'Boomer 📰', 'Sigma 🐺', 'Alpha 👑'];
    const gen = gens[getRandomInt(0, gens.length - 1)];
    await ctx.reply(`🌍 *Generation Check*\n\nYou are a *${gen}*!\n\n${gen.includes('Z') ? '😭 No CapπŸ'€' : gen.includes('Sigma') ? '😤 Grindset activated!' : gen.includes('Alpha') ? '💪 Peak performance!' : '🤔 Interesting!'}`);
  },

  async pov(ctx) {
    const scenario = POV_SCENARIOS[getRandomInt(0, POV_SCENARIOS.length - 1)];
    await ctx.reply(`📖 *POV*\n\n${scenario}`);
  },

  async social(ctx) {
    const platforms = ['Twitter 🐦', 'Instagram 📸', 'TikTok 🎵', 'Reddit 👽', 'YouTube 📺', 'Discord 🎮'];
    const platform = platforms[getRandomInt(0, platforms.length - 1)];
    const energy = getRandomInt(1, 100);
    await ctx.reply(`📱 *Your Social Energy*\n\nPlatform vibe: *${platform}*\nEnergy: *${energy}%*`);
  },

  async relation(ctx) {
    const { msg } = ctx;
    const mentioned = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid;
    if (!mentioned?.length) return ctx.reply('❌ Mention someone! Usage: .relation @user');
    const relation = RELATIONS[getRandomInt(0, RELATIONS.length - 1)];
    await ctx.sock.sendMessage(ctx.groupId, {
      text: `💞 *Relationship Reading*\n\n${getSenderName(ctx)} and @${mentioned[0].split('@')[0]} are...\n\n*${relation}*!`,
      mentions: mentioned
    }, { quoted: ctx.msg });
  },

  async wouldyourather(ctx) {
    const q = WYR_QUESTIONS[getRandomInt(0, WYR_QUESTIONS.length - 1)];
    await ctx.reply(`🤔 *Would You Rather?*\n\n${q}\n\nReply to this message with your answer!`);
  },

  async joke(ctx) {
    const joke = JOKES[getRandomInt(0, JOKES.length - 1)];
    await ctx.reply(`😂 *Joke of the Day*\n\n${joke}`);
  },

  async truth(ctx) {
    const t = TRUTHS[getRandomInt(0, TRUTHS.length - 1)];
    await ctx.reply(`🫣 *TRUTH*\n\n${t}`);
  },

  async dare(ctx) {
    const d = DARES[getRandomInt(0, DARES.length - 1)];
    await ctx.reply(`😈 *DARE*\n\n${d}`);
  },

  async truthordare(ctx) {
    const isT = Math.random() > 0.5;
    if (isT) {
      const t = TRUTHS[getRandomInt(0, TRUTHS.length - 1)];
      await ctx.reply(`🫣 *TRUTH*\n\n${t}`);
    } else {
      const d = DARES[getRandomInt(0, DARES.length - 1)];
      await ctx.reply(`😈 *DARE*\n\n${d}`);
    }
  },

  async td(ctx) { return module.exports.truthordare(ctx); },

  async uno(ctx) {
    await ctx.reply(`🃏 *UNO!*\n\n🎮 UNO game started!\n\n🔴🔵🟢🟡 Cards are dealt!\n\nReply with your move! (e.g., "red 5", "skip", "+2")\n\n_Note: Full UNO game with multiplayer is in development!_`);
  },
};
