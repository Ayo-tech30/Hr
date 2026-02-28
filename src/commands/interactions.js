const { getAnimeGif, downloadGif } = require('../utils/helpers');

async function sendInteraction(ctx, action, text) {
  try {
    await ctx.react('⏳');
    const gifUrl = await getAnimeGif(action);
    const gifBuffer = await downloadGif(gifUrl);
    
    if (gifBuffer) {
      await ctx.sock.sendMessage(ctx.groupId, {
        video: gifBuffer,
        caption: text,
        gifPlayback: true,
      }, { quoted: ctx.msg });
    } else {
      await ctx.reply(text);
    }
    await ctx.react('✅');
  } catch (e) {
    await ctx.reply(text);
  }
}

function getMentionedName(ctx) {
  const mentioned = ctx.msg.message?.extendedTextMessage?.contextInfo?.mentionedJid;
  if (mentioned?.length) return `@${mentioned[0].split('@')[0]}`;
  return ctx.body || 'someone';
}

function getSenderName(ctx) {
  return ctx.msg.pushName || `@${ctx.sender.split('@')[0]}`;
}

module.exports = {
  async hug(ctx) {
    const target = getMentionedName(ctx);
    await sendInteraction(ctx, 'hug', `🤗 *${getSenderName(ctx)}* hugs ${target}!\n💕 So wholesome~`);
  },
  async kiss(ctx) {
    const target = getMentionedName(ctx);
    await sendInteraction(ctx, 'kiss', `💋 *${getSenderName(ctx)}* kisses ${target}!\n💖 Aww~`);
  },
  async slap(ctx) {
    const target = getMentionedName(ctx);
    await sendInteraction(ctx, 'slap', `👋 *${getSenderName(ctx)}* slaps ${target}!\n😤 Take that!`);
  },
  async wave(ctx) {
    await sendInteraction(ctx, 'wave', `👋 *${getSenderName(ctx)}* waves hello!\n🌟 Hey there!`);
  },
  async pat(ctx) {
    const target = getMentionedName(ctx);
    await sendInteraction(ctx, 'pat', `✋ *${getSenderName(ctx)}* pats ${target}!\n🥺 Good job~`);
  },
  async dance(ctx) {
    await sendInteraction(ctx, 'dance', `💃 *${getSenderName(ctx)}* is dancing!\n🎵 Let's gooo!`);
  },
  async sad(ctx) {
    await sendInteraction(ctx, 'sad', `😢 *${getSenderName(ctx)}* is feeling sad...\n💙 Cheer up!`);
  },
  async smile(ctx) {
    await sendInteraction(ctx, 'smile', `😊 *${getSenderName(ctx)}* is smiling!\n🌸 So cute~`);
  },
  async laugh(ctx) {
    await sendInteraction(ctx, 'laugh', `😂 *${getSenderName(ctx)}* is laughing!\n🤣 LMAO!`);
  },
  async punch(ctx) {
    const target = getMentionedName(ctx);
    await sendInteraction(ctx, 'punch', `👊 *${getSenderName(ctx)}* punches ${target}!\n💥 POW!`);
  },
  async kill(ctx) {
    const target = getMentionedName(ctx);
    await sendInteraction(ctx, 'kill', `⚔️ *${getSenderName(ctx)}* eliminates ${target}!\n💀 Goodbye!`);
  },
  async hit(ctx) {
    const target = getMentionedName(ctx);
    await sendInteraction(ctx, 'hit', `🥊 *${getSenderName(ctx)}* hits ${target}!\n💢 Ouch!`);
  },
  async fuck(ctx) {
    const target = getMentionedName(ctx);
    await sendInteraction(ctx, 'fuck', `😳 *${getSenderName(ctx)}* and ${target}...\n🔞 Oh my~`);
  },
  async kidnap(ctx) {
    const target = getMentionedName(ctx);
    await sendInteraction(ctx, 'kidnap', `😱 *${getSenderName(ctx)}* kidnaps ${target}!\n🚨 Call the police!`);
  },
  async lick(ctx) {
    const target = getMentionedName(ctx);
    await sendInteraction(ctx, 'lick', `👅 *${getSenderName(ctx)}* licks ${target}!\n😝 Eww/Yay~`);
  },
  async bonk(ctx) {
    const target = getMentionedName(ctx);
    await sendInteraction(ctx, 'bonk', `🔨 *${getSenderName(ctx)}* bonks ${target}!\n⛔ Go to horny jail!`);
  },
  async tickle(ctx) {
    const target = getMentionedName(ctx);
    await sendInteraction(ctx, 'tickle', `🤣 *${getSenderName(ctx)}* tickles ${target}!\n😂 Hahaha stop!`);
  },
  async shrug(ctx) {
    await sendInteraction(ctx, 'shrug', `🤷 *${getSenderName(ctx)}* shrugs!\n¯\\_(ツ)_/¯`);
  },
  async wank(ctx) {
    await sendInteraction(ctx, 'wank', `😅 *${getSenderName(ctx)}* is... busy.\n🚫 Nobody needs to know!`);
  },
  async jihad(ctx) {
    await sendInteraction(ctx, 'jihad', `💥 *${getSenderName(ctx)}* has declared holy war!\n🔥 ALLAHU AKBAR!`);
  },
  async crusade(ctx) {
    await sendInteraction(ctx, 'crusade', `⚔️ *${getSenderName(ctx)}* goes on a crusade!\n✝️ FOR THE HOLY LAND!`);
  },
};
