const axios = require('axios');
const config = require('../../config');

// ============================================================
// CLAUDE (ANTHROPIC) AI - Powers all AI commands
// ============================================================

// Conversation memory per user (in-memory, resets on restart)
const conversationHistory = new Map();

async function callClaude(prompt, senderId = null, systemPrompt = null) {
  if (!config.ANTHROPIC_API_KEY || config.ANTHROPIC_API_KEY === 'YOUR_ANTHROPIC_API_KEY_HERE') {
    return '⚠️ Anthropic API key not configured! Set ANTHROPIC_API_KEY in config.js\nGet one FREE at: https://console.anthropic.com/';
  }

  try {
    const messages = [];

    // Include conversation history for chat mode
    if (senderId && conversationHistory.has(senderId)) {
      const history = conversationHistory.get(senderId);
      messages.push(...history.slice(-10)); // Keep last 10 messages
    }

    messages.push({ role: 'user', content: prompt });

    const body = {
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 1024,
      messages,
    };

    if (systemPrompt) {
      body.system = systemPrompt;
    } else {
      body.system = `You are Shadow Garden Bot's AI assistant — helpful, friendly, and concise. 
You are powered by Claude (Anthropic). Keep responses clear and under 500 words unless the user needs detail.
You're running inside a WhatsApp bot, so avoid markdown formatting like ** or ## — use plain text and emojis instead.`;
    }

    const res = await axios.post(
      'https://api.anthropic.com/v1/messages',
      body,
      {
        timeout: 30000,
        headers: {
          'x-api-key': config.ANTHROPIC_API_KEY,
          'anthropic-version': '2023-06-01',
          'content-type': 'application/json',
        }
      }
    );

    const reply = res.data.content[0].text;

    // Save to conversation history if senderId provided
    if (senderId) {
      const history = conversationHistory.get(senderId) || [];
      history.push({ role: 'user', content: prompt });
      history.push({ role: 'assistant', content: reply });
      // Keep max 20 messages in history
      if (history.length > 20) history.splice(0, history.length - 20);
      conversationHistory.set(senderId, history);
    }

    return reply;

  } catch (e) {
    const errMsg = e.response?.data?.error?.message || e.message;
    return `❌ AI Error: ${errMsg}`;
  }
}

module.exports = {
  // .ai or .gpt — Ask Claude anything
  async ai(ctx) {
    if (!ctx.body) return ctx.reply('💡 Usage: .ai [your question]\nExample: .ai What is quantum physics?');
    await ctx.react('🤔');
    const response = await callClaude(ctx.body, ctx.sender);
    await ctx.reply(`🤖 *Claude AI*\n\n${response}`);
    await ctx.react('✅');
  },

  // .ask — Same as .ai but no chat memory
  async ask(ctx) {
    if (!ctx.body) return ctx.reply('💡 Usage: .ask [question]');
    await ctx.react('🤔');
    const response = await callClaude(ctx.body);
    await ctx.reply(`🤖 *Claude AI*\n\n${response}`);
    await ctx.react('✅');
  },

  // .clearchat — Clear conversation memory
  async clearchat(ctx) {
    conversationHistory.delete(ctx.sender);
    await ctx.reply('🗑️ *Chat memory cleared!*\nStarting fresh — what would you like to talk about?');
  },

  // .translate — Translate text using Claude
  async translate(ctx) {
    if (!ctx.body) return ctx.reply('💡 Usage: .translate [language] [text]\nExample: .translate Spanish Hello world!');
    const parts = ctx.body.split(' ');
    const lang = parts[0];
    const text = parts.slice(1).join(' ');
    if (!text) return ctx.reply('💡 Usage: .translate [language] [text]\nExample: .translate French How are you?');
    await ctx.react('🌐');
    const response = await callClaude(
      `Translate this text to ${lang}. Respond with ONLY the translation, no explanation:\n"${text}"`,
      null,
      'You are a professional translator. Output only the translated text, nothing else.'
    );
    await ctx.reply(`🌐 *Translation → ${lang}*\n\n${response}`);
  },

  // .roast — Roast someone with Claude
  async roast(ctx) {
    const { msg } = ctx;
    const mentioned = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid;
    const target = mentioned?.length
      ? `@${mentioned[0].split('@')[0]}`
      : (ctx.body || 'my friend');
    await ctx.react('🔥');
    const response = await callClaude(
      `Give me a funny, light-hearted roast for someone named "${target}". Make it creative and amusing, not mean-spirited. Keep it under 3 sentences.`,
      null,
      'You are a comedy roast writer. Be funny and creative but never truly mean or offensive.'
    );
    await ctx.sock.sendMessage(ctx.groupId, {
      text: `🔥 *Roast for ${target}*\n\n${response}`,
      mentions: mentioned || []
    }, { quoted: ctx.msg });
  },

  // .compliment — Give someone a compliment
  async compliment(ctx) {
    const { msg } = ctx;
    const mentioned = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid;
    const target = mentioned?.length
      ? `@${mentioned[0].split('@')[0]}`
      : (ctx.body || 'you');
    await ctx.react('💕');
    const response = await callClaude(
      `Write a heartfelt and creative compliment for someone named "${target}". Make it genuine and uplifting. Keep it under 2 sentences.`,
      null,
      'You write warm, genuine compliments. Be creative and sincere.'
    );
    await ctx.sock.sendMessage(ctx.groupId, {
      text: `💕 *Compliment for ${target}*\n\n${response}`,
      mentions: mentioned || []
    }, { quoted: ctx.msg });
  },

  // .advice — Get life advice from Claude
  async advice(ctx) {
    const topic = ctx.body || 'life in general';
    await ctx.react('💭');
    const response = await callClaude(
      `Give me a thoughtful, practical piece of advice about: "${topic}". Keep it short, actionable, and motivating.`,
      null,
      'You are a wise life coach. Give concise, practical advice.'
    );
    await ctx.reply(`💭 *Advice*\n\n${response}`);
  },

  // .story — Generate a short story
  async story(ctx) {
    const prompt = ctx.body || 'a hero in a magical world';
    await ctx.react('📖');
    const response = await callClaude(
      `Write a very short story (under 200 words) about: "${prompt}". Make it engaging with a beginning, middle, and end.`,
      null,
      'You are a creative short story writer. Write engaging micro-fiction.'
    );
    await ctx.reply(`📖 *Story Time*\n\n${response}`);
  },

  // .poem — Generate a poem
  async poem(ctx) {
    const topic = ctx.body || 'the beauty of life';
    await ctx.react('🌹');
    const response = await callClaude(
      `Write a short, beautiful poem about: "${topic}". Keep it under 12 lines. Use plain text without any markdown.`,
      null,
      'You are a talented poet. Write expressive, emotional poetry in plain text.'
    );
    await ctx.reply(`🌹 *Poem*\n\n${response}`);
  },

  // .joke — Get a joke from Claude
  async joke(ctx) {
    const topic = ctx.body || 'anything funny';
    await ctx.react('😂');
    const response = await callClaude(
      `Tell me a funny, family-friendly joke${topic !== 'anything funny' ? ` about ${topic}` : ''}. Keep it short and punchy.`,
      null,
      'You are a comedian. Tell clean, funny jokes that everyone can enjoy.'
    );
    await ctx.reply(`😂 *Joke*\n\n${response}`);
  },

  // .generate — Placeholder for image generation
  async generate(ctx) {
    await ctx.reply(
      `🎨 *Image Generation*\n\n🚧 This feature requires a Stable Diffusion or DALL-E API key.\n\nTo enable:\n1. Get an API key from https://stability.ai or https://openai.com\n2. Add the key to config.js\n\nYour prompt: "${ctx.body || '(none given)'}"`
    );
  },

  // .transcribe — Placeholder for voice transcription
  async transcribe(ctx) {
    await ctx.reply('🎤 *Transcription*\n\n🚧 Reply to a voice note with .transcribe\n\nThis feature uses Whisper AI. Coming soon!');
  },
};
