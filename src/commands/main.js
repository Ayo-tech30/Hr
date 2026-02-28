const fs = require('fs');
const path = require('path');
const config = require('../../config');
const { formatUptime } = require('../utils/helpers');

const startTime = Date.now();

const MENU_TEXT = `
╭━━〔 𓂀 Sʜᴀᴅᴏᴡ  Gᴀʀᴅᴇɴ 𓂀 〕━━┈⊷
┃✰╭────────────────
┃✰│ ツ ʙᴏᴛ: *Delta*
┃✰│ ♧ ᴜsᴇʀ: *{user}*
┃✰│ ✵ ᴜᴘᴛɪᴍᴇ: *{uptime}*
┃✰│ ➩ ᴏᴡɴᴇʀ: *『 Lᴏʀᴅ Sʜᴀᴅᴏᴡ 』*
┃✰│ ♤ ᴅᴇᴠ: *『 Lᴏʀᴅ Sʜᴀᴅᴏᴡ 』*
┃✰│ ࿌ ᴠᴇʀsɪᴏɴ: *1.0*
┃✰│ ➫ ᴍᴏᴅᴇ: *ᴘᴜʙʟɪᴄ*
┃✰│ ♣︎ ᴘʀᴇɢɪx: *[ . ]*
┃✰│ 📊 ᴛᴏᴛᴀʟ ᴄᴍᴅs: *80+*
┃✰╰────────────────
╰━━━━━━━━━━━━━━━┈⊷

✰ ɢʀᴇᴇᴛɪɴɢs 🌙, *{user}*
ᴅᴇʟᴛᴀ ᴀᴛ ʏᴏᴜʀ sᴇʀᴠɪᴄᴇ

╭━━〔 📋 ᴍᴀɪɴ 〕━━┈⊷
┃✰│➫ .ᴍᴇɴᴜ
┃✰│➫ .ᴘɪɴɢ
┃✰│➫ .ᴡᴇʙꜱɪᴛᴇ
┃✰│➫ .ᴄᴏᴍᴍᴜɴɪᴛʏ
┃✰│➫ .ᴀꜰᴋ
┃✰│➫ .ʜᴇʟᴘ
┃✰│➫ .ɪɴꜰᴏ
┃✰│➫ .ᴜᴘᴛɪᴍᴇ
┃✰│➫ .ᴅɪꜱᴄᴏʀᴅ
╰━━━━━━━━━━━━━━━┈⊷

╭━━〔 ⚙️ ᴀᴅᴍɪɴ 〕━━┈⊷
┃✰│➫ .ᴋɪᴄᴋ
┃✰│➫ .ᴅᴇʟᴇᴛᴇ
┃✰│➫ .ᴀɴᴛɪʟɪɴᴋ
┃✰│➫ .ᴀɴᴛɪʟɪɴᴋ ꜱᴇᴛ [ᴀᴄᴛɪᴏɴ]
┃✰│➫ .ᴡᴀʀɴ @ᴜꜱᴇʀ [ʀᴇᴀꜱᴏɴ]
┃✰│➫ .ʀᴇꜱᴇᴛᴡᴀʀɴ
┃✰│➫ .ɢʀᴏᴜᴘɪɴꜰᴏ
┃✰│➫ .ɢɪ
┃✰│➫ .ᴡᴇʟᴄᴏᴍᴇ ᴏɴ/ᴏꜰꜰ
┃✰│➫ .ꜱᴇᴛᴡᴇʟᴄᴏᴍᴇ
┃✰│➫ .ʟᴇᴀᴠᴇ ᴏɴ/ᴏꜰꜰ
┃✰│➫ .ꜱᴇᴛʟᴇᴀᴠᴇ
┃✰│➫ .ᴘʀᴏᴍᴏᴛᴇ
┃✰│➫ .ᴅᴇᴍᴏᴛᴇ
┃✰│➫ .ᴍᴜᴛᴇ @ᴜꜱᴇʀ [ᴛɪᴍᴇ]
┃✰│➫ .ᴜɴᴍᴜᴛᴇ
┃✰│➫ .ʜɪᴅᴇᴛᴀɢ
┃✰│➫ .ᴛᴀɢᴀʟʟ
┃✰│➫ .ᴀᴄᴛɪᴠɪᴛʏ
┃✰│➫ .ᴀᴄᴛɪᴠᴇ
┃✰│➫ .ɪɴᴀᴄᴛɪᴠᴇ
┃✰│➫ .ᴏᴘᴇɴ
┃✰│➫ .ᴄʟᴏꜱᴇ
┃✰│➫ .ᴘᴜʀɢᴇ [ᴄᴏᴅᴇ]
┃✰│➫ .ᴀɴᴛɪꜱᴍ ᴏɴ/ᴏꜰꜰ
┃✰│➫ .ʙʟᴀᴄᴋʟɪꜱᴛ ᴀᴅᴅ [ᴡᴏʀᴅ]
┃✰│➫ .ʙʟᴀᴄᴋʟɪꜱᴛ ʀᴇᴍᴏᴠᴇ [ᴡᴏʀᴅ]
┃✰│➫ .ʙʟᴀᴄᴋʟɪꜱᴛ ʟɪꜱᴛ
┃✰│➫ .ɢʀᴏᴜᴘꜱᴛᴀᴛꜱ
┃✰│➫ .ɢꜱ
╰━━━━━━━━━━━━━━━┈⊷

╭━━〔 💰 ᴇᴄᴏɴᴏᴍʏ 〕━━┈⊷
┃✰│➫ .ᴍᴏɴᴇʏʙᴀʟᴀɴᴄᴇ
┃✰│➫ .ᴍʙᴀʟ
┃✰│➫ .ɢᴇᴍꜱ
┃✰│➫ .ᴘʀᴇᴍɪᴜᴍʙᴀʟ
┃✰│➫ .ᴘʙᴀʟ
┃✰│➫ .ᴅᴀɪʟʏ
┃✰│➫ .ᴡɪᴛʜᴅʀᴀᴡ [ᴀᴍᴏᴜɴᴛ]
┃✰│➫ .ᴡɪᴅ [ᴀᴍᴏᴜɴᴛ]
┃✰│➫ .ᴅᴇᴘᴏꜱɪᴛ [ᴀᴍᴏᴜɴᴛ]
┃✰│➫ .ᴅᴇᴘ [ᴀᴍᴏᴜɴᴛ]
┃✰│➫ .ᴅᴏɴᴀᴛᴇ [ᴀᴍᴏᴜɴᴛ]
┃✰│➫ .ʟᴏᴛᴛᴇʀʏ
┃✰│➫ .ʀɪᴄʜʟɪꜱᴛ
┃✰│➫ .ʀɪᴄʜʟɪꜱᴛɢʟᴏʙᴀʟ
┃✰│➫ .ʀɪᴄʜʟɢ
┃✰│➫ .ʀᴇɢɪꜱᴛᴇʀ
┃✰│➫ .ʀᴇɢ
┃✰│➫ .ꜱᴇᴛɴᴀᴍᴇ <ɴᴀᴍᴇ>
┃✰│➫ .ᴘʀᴏꜰɪʟᴇ
┃✰│➫ .ᴘ
┃✰│➫ .ᴇᴅɪᴛ
┃✰│➫ .ʙɪᴏ [ʙɪᴏ]
┃✰│➫ .ꜱᴇᴛᴀɢᴇ [ᴀɢᴇ]
┃✰│➫ .ɪɴᴠᴇɴᴛᴏʀʏ
┃✰│➫ .ɪɴᴠ
┃✰│➫ .ᴜꜱᴇ [ɪᴛᴇᴍ]
┃✰│➫ .ꜱᴇʟʟ [ɪᴛᴇᴍ]
┃✰│➫ .ʙᴜʏ [ɪᴛᴇᴍ]
┃✰│➫ .ꜱʜᴏᴘ
┃✰│➫ .ʟᴇᴀᴅᴇʀʙᴏᴀʀᴅ
┃✰│➫ .ʟʙ
┃✰│➫ .ᴅɪɢ
┃✰│➫ .ꜰɪꜱʜ
┃✰│➫ .ʙᴇɢ
┃✰│➫ .ʀᴏᴀꜱᴛ
┃✰│➫ .ɢᴀᴍʙʟᴇ ᴏɴ/ᴏꜰꜰ
┃✰│➫ .ʀᴏʙ @ᴜꜱᴇʀ
╰━━━━━━━━━━━━━━━┈⊷

╭━━〔 🎴 ᴄᴀʀᴅꜱ 〕━━┈⊷
┃✰│➫ .ᴄᴏʟʟ
┃✰│➫ .ᴄᴏʟʟᴇᴄᴛɪᴏɴ
┃✰│➫ .ᴅᴇᴄᴋ
┃✰│➫ .ᴄᴀʀᴅ [ɪɴᴅᴇx]
┃✰│➫ .ᴅᴇᴄᴋᴄᴀʀᴅ [ɪɴᴅᴇx]
┃✰│➫ .ᴄᴀʀᴅɪɴꜰᴏ [ɴᴀᴍᴇ]
┃✰│➫ .ᴄɪ [ɴᴀᴍᴇ]
┃✰│➫ .ᴍʏᴄᴏʟʟꜱ
┃✰│➫ .ᴄᴀʀᴅʟʙ
┃✰│➫ .ᴄᴀʀᴅꜱʜᴏᴘ
┃✰│➫ .ᴄʟᴀɪᴍ [ɪᴅ]
┃✰│➫ .ꜱᴛᴀʀᴅᴜꜱᴛ
┃✰│➫ .ᴠꜱ @ᴜꜱᴇʀ
┃✰│➫ .ᴀᴜᴄᴛɪᴏɴ [ɪᴅ] [ᴘʀɪᴄᴇ]
┃✰│➫ .ᴍʏᴀᴜᴄ
┃✰│➫ .ʟɪꜱᴛᴀᴜᴄ
┃✰│➫ .ʀᴄ [ɪɴᴅᴇx]
╰━━━━━━━━━━━━━━━┈⊷

╭━━〔 🎮 ɢᴀᴍᴇꜱ 〕━━┈⊷
┃✰│➫ .ᴛᴛᴛ @ᴜꜱᴇʀ
┃✰│➫ .ᴄ4 @ᴜꜱᴇʀ
┃✰│➫ .ᴡᴄɢ
┃✰│➫ .ꜱᴛᴀʀᴛʙᴀᴛᴛʟᴇ @ᴜꜱᴇʀ
┃✰│➫ .ᴛᴅ
┃✰│➫ .ꜱᴛᴏᴘɢᴀᴍᴇ
╰━━━━━━━━━━━━━━━┈⊷

╭━━〔 ⚔️ ʀᴘɢ 〕━━┈⊷
┃✰│➫ .ʀᴘɢᴘʀᴏꜰɪʟᴇ
┃✰│➫ .ꜱᴇᴛᴄʟᴀꜱꜱ [ᴄʟᴀꜱꜱ]
┃✰│➫ .ᴅᴜɴɢᴇᴏɴ [ɴᴜᴍʙᴇʀ]
┃✰│➫ .qᴜᴇꜱᴛ
┃✰│➫ .ʜᴇᴀʟ
┃✰│➫ .ᴄʀᴀꜰᴛ [ɴᴜᴍʙᴇʀ]
╰━━━━━━━━━━━━━━━┈⊷

╭━━〔 🃏 ᴜɴᴏ 〕━━┈⊷
┃✰│➫ .ᴜɴᴏ
┃✰│➫ .ꜱᴛᴀʀᴛᴜɴᴏ
┃✰│➫ .ᴜɴᴏᴘʟᴀʏ [ɴᴜᴍʙᴇʀ]
┃✰│➫ .ᴜɴᴏᴅʀᴀᴡ
┃✰│➫ .ᴜɴᴏʜᴀɴᴅ
╰━━━━━━━━━━━━━━━┈⊷

╭━━〔 🎲 ɢᴀᴍʙʟᴇ 〕━━┈⊷
┃✰│➫ .ꜱʟᴏᴛꜱ [ᴀᴍᴏᴜɴᴛ]
┃✰│➫ .ᴅɪᴄᴇ [ᴀᴍᴏᴜɴᴛ]
┃✰│➫ .ᴄᴀꜱɪɴᴏ [ᴀᴍᴏᴜɴᴛ]
┃✰│➫ .ᴄꜰ [ʜ/ᴛ] [ᴀᴍᴏᴜɴᴛ]
┃✰│➫ .ᴅʙ [ᴀᴍᴏᴜɴᴛ]
┃✰│➫ .ᴅᴘ [ᴀᴍᴏᴜɴᴛ]
┃✰│➫ .ʀᴏᴜʟᴇᴛᴛᴇ [ᴄᴏʟᴏʀ] [ᴀᴍᴏᴜɴᴛ]
┃✰│➫ .ʜᴏʀꜱᴇ [1-4] [ᴀᴍᴏᴜɴᴛ]
┃✰│➫ .ꜱᴘɪɴ [ᴀᴍᴏᴜɴᴛ]
╰━━━━━━━━━━━━━━━┈⊷

╭━━〔 👤 ɪɴᴛᴇʀᴀᴄᴛɪᴏɴ 〕━━┈⊷
┃✰│➫ .ʜᴜɢ
┃✰│➫ .ᴋɪꜱꜱ
┃✰│➫ .ꜱʟᴀᴘ
┃✰│➫ .ᴡᴀᴠᴇ
┃✰│➫ .ᴘᴀᴛ
┃✰│➫ .ᴅᴀɴᴄᴇ
┃✰│➫ .ꜱᴀᴅ
┃✰│➫ .ꜱᴍɪʟᴇ
┃✰│➫ .ʟᴀᴜɢʜ
┃✰│➫ .ᴘᴜɴᴄʜ
┃✰│➫ .ᴋɪʟʟ
┃✰│➫ .ʜɪᴛ
┃✰│➫ .ꜰᴜᴄᴋ
┃✰│➫ .ᴋɪᴅɴᴀᴘ
┃✰│➫ .ʟɪᴄᴋ
┃✰│➫ .ʙᴏɴᴋ
┃✰│➫ .ᴛɪᴄᴋʟᴇ
┃✰│➫ .ꜱʜʀᴜɢ
┃✰│➫ .ᴡᴀɴᴋ
┃✰│➫ .ᴊɪʜᴀᴅ
┃✰│➫ .ᴄʀᴜꜱᴀᴅᴇ
╰━━━━━━━━━━━━━━━┈⊷

╭━━〔 🎉 ꜰᴜɴ 〕━━┈⊷
┃✰│➫ .ɢᴀʏ
┃✰│➫ .ʟᴇꜱʙɪᴀɴ
┃✰│➫ .ꜱɪᴍᴘ
┃✰│➫ .ᴍᴀᴛᴄʜ
┃✰│➫ .ꜱʜɪᴘ
┃✰│➫ .ᴄʜᴀʀᴀᴄᴛᴇʀ
┃✰│➫ .ᴘᴘ
┃✰│➫ .ᴘꜱɪᴢᴇ
┃✰│➫ .ꜱᴋɪʟʟ
┃✰│➫ .ᴅᴜᴀʟɪᴛʏ
┃✰│➫ .ɢᴇɴ
┃✰│➫ .ᴘᴏᴠ
┃✰│➫ .ꜱᴏᴄɪᴀʟ
┃✰│➫ .ʀᴇʟᴀᴛɪᴏɴ
┃✰│➫ .ᴡʏʀ
┃✰│➫ .ᴊᴏᴋᴇ
┃✰│➫ .ᴛʀᴜᴛʜ
┃✰│➫ .ᴅᴀʀᴇ
┃✰│➫ .ᴛᴅ
┃✰│➫ .ᴜɴᴏ
╰━━━━━━━━━━━━━━━┈⊷

╭━━〔 🎵 ᴍᴜꜱɪᴄ 〕━━┈⊷
┃✰│➫ .ᴘʟᴀʏ [ꜱᴏɴɢ/ᴜʀʟ]
╰━━━━━━━━━━━━━━━┈⊷

╭━━〔 🔍 ꜱᴇᴀʀᴄʜ 〕━━┈⊷
┃✰│➫ .ᴡᴀʟʟᴘᴀᴘᴇʀ [ǫᴜᴇʀʏ]
┃✰│➫ .ɪᴍᴀɢᴇ [ǫᴜᴇʀʏ]
┃✰│➫ .ʟʏʀɪᴄꜱ [ꜱᴏɴɢ]
╰━━━━━━━━━━━━━━━┈⊷

╭━━〔 🔄 ᴄᴏɴᴠᴇʀᴛᴇʀ 〕━━┈⊷
┃✰│➫ .ꜱ
┃✰│➫ .ꜱᴛɪᴄᴋᴇʀ
┃✰│➫ .ᴛᴀᴋᴇ <ɴᴀᴍᴇ>, <ᴀᴜᴛʜᴏʀ>
┃✰│➫ .ᴛᴜʀɴɪᴍɢ
┃✰│➫ .ᴛᴏɪᴍɢ
┃✰│➫ .ʀᴏᴛᴀᴛᴇ [90/180/270]
┃✰│➫ .ᴠᴠ
╰━━━━━━━━━━━━━━━┈⊷

╭━━〔 🌸 ᴀɴɪᴍᴇ ꜱꜰᴡ 〕━━┈⊷
┃✰│➫ .ᴡᴀɪꜰᴜ
┃✰│➫ .ɴᴇᴋᴏ
┃✰│➫ .ᴍᴀɪᴅ
┃✰│➫ .ᴏᴘᴘᴀɪ
┃✰│➫ .ꜱᴇʟꜰɪᴇꜱ
┃✰│➫ .ᴜɴɪꜰᴏʀᴍ
┃✰│➫ .ᴍᴏʀɪ-ᴄᴀʟʟɪᴏᴘᴇ
┃✰│➫ .ʀᴀɪᴅᴇɴ-ꜱʜᴏɢᴜɴ
┃✰│➫ .ᴋᴀᴍɪꜱᴀᴛᴏ-ᴀʏᴀᴋᴀ
╰━━━━━━━━━━━━━━━┈⊷

╭━━〔 🔞 ᴀɴɪᴍᴇ ɴꜱꜰᴡ 〕━━┈⊷
┃✰│➫ .ɴᴜᴅᴇ ᴏɴ/ᴏꜰꜰ
┃✰│➫ .ᴍɪʟꜰ
┃✰│➫ .ᴀꜱꜱ
┃✰│➫ .ʜᴇɴᴛᴀɪ
┃✰│➫ .ᴏʀᴀʟ
┃✰│➫ .ᴇᴄᴄʜɪ
┃✰│➫ .ᴘᴀɪᴢᴜʀɪ
┃✰│➫ .ᴇʀᴏ
┃✰│➫ .ᴇʜᴇɴᴛᴀɪ
┃✰│➫ .ɴʜᴇɴᴛᴀɪ
╰━━━━━━━━━━━━━━━┈⊷

> 𓂀 ᴘᴏᴡᴇʀᴇᴅ ʙʏ Sʜᴀᴅᴏᴡ ɢᴀʀᴅᴇɴ ☾`

module.exports = {
  async menu(ctx) {
    const { sock, msg, sender, groupId } = ctx;
    const userName = msg.pushName || sender.split('@')[0];
    const menuText = MENU_TEXT
      .replace(/\{user\}/g, userName)
      .replace('{uptime}', formatUptime(Date.now() - startTime));

    const imgPath = path.join(__dirname, '../../assets/delta.jpg');

    if (fs.existsSync(imgPath)) {
      const imgBuffer = fs.readFileSync(imgPath);
      await sock.sendMessage(groupId, {
        image: imgBuffer,
        caption: menuText,
      }, { quoted: msg });
    } else {
      await sock.sendMessage(groupId, { text: menuText }, { quoted: msg });
    }
  },

  async ping(ctx) {
    const start = Date.now();
    await ctx.reply('🏓 Pinging...');
    const latency = Date.now() - start;
    await ctx.sock.sendMessage(ctx.groupId, {
      text: `🏓 *Pong!*\n⚡ Speed: ${latency}ms\n🟢 Bot is alive!`
    }, { quoted: ctx.msg });
  },

  async website(ctx) {
    await ctx.reply(`🌐 *Shadow Garden Website*\n\n🚧 *Coming Soon!*\n\nWe're working hard to bring you an amazing experience. Stay tuned! 🌸`);
  },

  async community(ctx) {
    await ctx.reply(`🌟 *Join the Shadow Garden Community!*\n\n${config.COMMUNITY_LINK}\n\n✨ Connect with other members, get updates, and more!`);
  },

  async afk(ctx) {
    const { sender, body } = ctx;
    const { Database } = require('../database/firebase');
    const reason = body || 'No reason provided';
    await Database.setAFK(sender, reason);
    await ctx.reply(`😴 *AFK Mode Activated!*\n📝 Reason: ${reason}\n\nYou'll be notified when someone mentions you.`);
  },

  async help(ctx) {
    await ctx.reply(`🆘 *Shadow Garden Bot Help*\n\n📖 Use *.menu* to see all available commands\n\n💡 *Tips:*\n• All commands start with *.* (dot)\n• Use *.ping* to check if bot is online\n• Use *.register* to create your profile\n• Join our community: ${config.COMMUNITY_LINK}\n\n📞 Contact creator: *${config.CREATOR}*`);
  },

  async info(ctx) {
    const uptime = formatUptime(Date.now() - startTime);
    await ctx.reply(`🤖 *Bot Information*\n\n┌─────────────────\n│ 🏷️ Name: ${config.BOT_NAME}\n│ 👤 Creator: ${config.CREATOR}\n│ ⌨️ Prefix: ${config.PREFIX}\n│ ⏱️ Uptime: ${uptime}\n│ 🌐 Platform: WhatsApp\n│ ⚡ Version: 2.0.0\n│ 📅 Build: 2025\n└─────────────────\n\n✨ Powered by Shadow Garden`);
  },

  async discord(ctx) {
    await ctx.reply(`https://discord.gg/mBTJDzKgs3`);
  },

  async uptime(ctx) {
    const uptime = formatUptime(Date.now() - startTime);
    await ctx.reply(`⏱️ *Bot Uptime*\n\n🟢 Running for: *${uptime}*\n✅ All systems operational!`);
  },
};
