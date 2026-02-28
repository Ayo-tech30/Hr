const { Database } = require('../database/firebase');
const { getRandomInt } = require('../utils/helpers');
const config = require('../../config');

async function checkAndBet(ctx, amount) {
  const user = await Database.getUser(ctx.sender);
  if (!user?.registered) { await ctx.reply('❌ Register first with *.register*!'); return null; }
  if (!amount || amount < config.GAME_BET_MIN) { await ctx.reply(`❌ Min bet: ${config.GAME_BET_MIN} coins\nUsage: .${ctx.command} [amount]`); return null; }
  if ((user.balance || 0) < amount) { await ctx.reply(`❌ Insufficient balance! You have ${user.balance || 0} coins.`); return null; }
  return user;
}

module.exports = {
  async slots(ctx) {
    const amount = parseInt(ctx.body);
    const user = await checkAndBet(ctx, amount);
    if (!user) return;
    
    const emojis = config.SLOTS_EMOJIS;
    const s1 = emojis[getRandomInt(0, emojis.length - 1)];
    const s2 = emojis[getRandomInt(0, emojis.length - 1)];
    const s3 = emojis[getRandomInt(0, emojis.length - 1)];
    
    let multiplier = 0;
    if (s1 === s2 && s2 === s3) {
      multiplier = s1 === '💎' ? 10 : 5;
    } else if (s1 === s2 || s2 === s3 || s1 === s3) {
      multiplier = 1.5;
    }
    
    const won = Math.floor(amount * multiplier);
    const net = won - amount;
    
    if (net > 0) await Database.addBalance(ctx.sender, net);
    else await Database.removeBalance(ctx.sender, amount);
    
    await ctx.reply(
      `🎰 *SLOTS!*\n\n` +
      `┌───────────────\n` +
      `│  ${s1} │ ${s2} │ ${s3}  │\n` +
      `└───────────────\n\n` +
      `${multiplier > 0 ? `🎊 *WIN!* x${multiplier} = +${won} coins!` : '❌ *LOST!* No match!'}\n` +
      `Net: ${net >= 0 ? '+' : ''}${net} coins`
    );
  },

  async dice(ctx) {
    const amount = parseInt(ctx.body);
    const user = await checkAndBet(ctx, amount);
    if (!user) return;
    
    const playerRoll = getRandomInt(1, 6);
    const botRoll = getRandomInt(1, 6);
    const won = playerRoll > botRoll;
    const tie = playerRoll === botRoll;
    
    if (won) await Database.addBalance(ctx.sender, amount);
    else if (!tie) await Database.removeBalance(ctx.sender, amount);
    
    await ctx.reply(
      `🎲 *Dice Game!*\n\n` +
      `You: 🎲 ${playerRoll}\n` +
      `Bot: 🎲 ${botRoll}\n\n` +
      `${won ? `🎊 *You WIN!* +${amount} coins!` : tie ? `🤝 *TIE!* No change!` : `❌ *You LOST!* -${amount} coins!`}`
    );
  },

  async casino(ctx) {
    const amount = parseInt(ctx.body);
    const user = await checkAndBet(ctx, amount);
    if (!user) return;
    
    const games = ['🃏 Blackjack', '🎰 Slots', '🎲 Dice', '🃏 Poker'];
    const game = games[getRandomInt(0, games.length - 1)];
    const won = Math.random() > 0.45;
    const multiplier = won ? (Math.random() > 0.7 ? 3 : 2) : 0;
    const winAmount = won ? amount * multiplier : -amount;
    
    if (won) await Database.addBalance(ctx.sender, winAmount);
    else await Database.removeBalance(ctx.sender, amount);
    
    await ctx.reply(
      `🎪 *Casino - ${game}*\n\n` +
      `${won ? `🎊 *WINNER!* +${winAmount} coins! (x${multiplier})` : `❌ *HOUSE WINS!* -${amount} coins!`}\n\n` +
      `💰 Balance: ${Math.max(0, (user.balance || 0) + winAmount)} coins`
    );
  },

  async coinflip(ctx) {
    const [, side] = ctx.args;
    const amount = parseInt(ctx.body.split(' ').pop());
    if (!['heads', 'tails', 'h', 't'].includes(side?.toLowerCase())) {
      return ctx.reply('Usage: .coinflip [heads/tails] [amount]');
    }
    const user = await checkAndBet(ctx, amount);
    if (!user) return;
    
    const result = Math.random() > 0.5 ? 'heads' : 'tails';
    const picked = side.toLowerCase().startsWith('h') ? 'heads' : 'tails';
    const won = result === picked;
    
    if (won) await Database.addBalance(ctx.sender, amount);
    else await Database.removeBalance(ctx.sender, amount);
    
    await ctx.reply(
      `🪙 *Coin Flip!*\n\n` +
      `You picked: *${picked}*\n` +
      `Result: *${result}* ${result === 'heads' ? '👑' : '🦅'}\n\n` +
      `${won ? `🎊 *You WIN!* +${amount} coins!` : `❌ *You LOST!* -${amount} coins!`}`
    );
  },

  async doublebet(ctx) {
    const amount = parseInt(ctx.body);
    const user = await checkAndBet(ctx, amount);
    if (!user) return;
    const won = Math.random() > 0.5;
    if (won) await Database.addBalance(ctx.sender, amount * 2);
    else await Database.removeBalance(ctx.sender, amount);
    await ctx.reply(`🎯 *Double Bet!*\n\n${won ? `🎊 *DOUBLED!* +${amount * 2} coins!` : `❌ *LOST!* -${amount} coins!`}`);
  },

  async doublepayout(ctx) {
    const amount = parseInt(ctx.body);
    const user = await checkAndBet(ctx, amount);
    if (!user) return;
    const won = Math.random() > 0.55;
    if (won) await Database.addBalance(ctx.sender, amount * 2);
    else await Database.removeBalance(ctx.sender, amount);
    await ctx.reply(`💰 *Double Payout!*\n\n${won ? `🎊 *2X PAYOUT!* +${amount * 2} coins!` : `❌ *LOST!* -${amount} coins!`}`);
  },

  async roulette(ctx) {
    const amount = parseInt(ctx.body.split(' ').pop());
    const bet = ctx.args[1]?.toLowerCase();
    if (!bet || !amount) return ctx.reply('Usage: .roulette [red/black/green/number] [amount]');
    const user = await checkAndBet(ctx, amount);
    if (!user) return;
    
    const number = getRandomInt(0, 36);
    const red = [1,3,5,7,9,12,14,16,18,19,21,23,25,27,30,32,34,36];
    const resultColor = number === 0 ? 'green' : red.includes(number) ? 'red' : 'black';
    const emoji = resultColor === 'green' ? '💚' : resultColor === 'red' ? '🔴' : '⚫';
    
    let won = false, multiplier = 2;
    if (['red', 'black'].includes(bet)) { won = bet === resultColor; multiplier = 2; }
    else if (bet === 'green') { won = resultColor === 'green'; multiplier = 35; }
    else if (!isNaN(bet)) { won = parseInt(bet) === number; multiplier = 35; }
    
    if (won) await Database.addBalance(ctx.sender, amount * multiplier);
    else await Database.removeBalance(ctx.sender, amount);
    
    await ctx.reply(
      `🎡 *Roulette!*\n\n` +
      `${emoji} Number: *${number}* (${resultColor})\n` +
      `Your bet: *${bet}*\n\n` +
      `${won ? `🎊 *WIN!* +${amount * multiplier} coins! (x${multiplier})` : `❌ *LOST!* -${amount} coins!`}`
    );
  },

  async horse(ctx) {
    const amount = parseInt(ctx.body.split(' ').pop());
    const pick = parseInt(ctx.args[1]);
    if (!pick || pick < 1 || pick > 4 || !amount) return ctx.reply('Usage: .horse [1-4] [amount]\nPick a horse 1-4!');
    const user = await checkAndBet(ctx, amount);
    if (!user) return;
    
    const horses = ['🐴', '🦄', '🏇', '🐎'];
    const winner = getRandomInt(1, 4);
    const won = pick === winner;
    
    if (won) await Database.addBalance(ctx.sender, amount * 4);
    else await Database.removeBalance(ctx.sender, amount);
    
    const race = horses.map((h, i) => `${h} Horse ${i+1} ${winner === i+1 ? '🏆' : ''}`).join('\n');
    await ctx.reply(`🏁 *Horse Race!*\n\n${race}\n\nWinner: 🏆 Horse ${winner}\nYou picked: Horse ${pick}\n\n${won ? `🎊 *WIN!* +${amount * 4} coins!` : `❌ *LOST!* -${amount} coins!`}`);
  },

  async spin(ctx) {
    const amount = parseInt(ctx.body.split(' ').pop());
    const user = await checkAndBet(ctx, amount);
    if (!user) return;
    
    const items = ['💀 -100%', '❌ -50%', '⭐ +50%', '💰 +100%', '💎 +200%', '🎰 JACKPOT +500%'];
    const weights = [5, 25, 35, 25, 8, 2];
    let rand = getRandomInt(1, 100), cumulative = 0;
    let result = items[0];
    for (let i = 0; i < items.length; i++) {
      cumulative += weights[i];
      if (rand <= cumulative) { result = items[i]; break; }
    }
    
    const pct = parseFloat(result.match(/[+-]\d+/)[0]);
    const change = Math.floor(amount * (pct / 100));
    if (change > 0) await Database.addBalance(ctx.sender, change);
    else await Database.removeBalance(ctx.sender, Math.abs(change));
    
    await ctx.reply(`🎡 *Spin Wheel!*\n\n🎯 You landed on: *${result}*\n\n${change >= 0 ? `🎊 +${change} coins!` : `💔 ${change} coins!`}`);
  },
};
