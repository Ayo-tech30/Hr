const {
  default: makeWASocket,
  useMultiFileAuthState,
  DisconnectReason,
  makeCacheableSignalKeyStore,
  fetchLatestBaileysVersion,
  Browsers,
  makeInMemoryStore,
} = require('@whiskeysockets/baileys');
const pino       = require('pino');
const { Boom }   = require('@hapi/boom');
const fs         = require('fs');
const path       = require('path');
const readline   = require('readline');
const config     = require('./config');
const { messageHandler, handleGroupUpdate } = require('./src/handlers/messageHandler');

const SESSION_FOLDER = path.join(__dirname, 'sessions');
const TEMP_FOLDER    = path.join(__dirname, 'temp');
const ASSETS_FOLDER  = path.join(__dirname, 'assets');
const DATA_FOLDER    = path.join(__dirname, 'data');
[SESSION_FOLDER, TEMP_FOLDER, ASSETS_FOLDER, DATA_FOLDER].forEach(f => {
  if (!fs.existsSync(f)) fs.mkdirSync(f, { recursive: true });
});

const logger = pino({ level: 'silent' });

let currentSock    = null;
let isConnected    = false;
let reconnectTimer = null;
let isStarting     = false;

function ask(prompt) {
  return new Promise(resolve => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    rl.question(prompt, ans => { rl.close(); resolve(ans.trim()); });
  });
}

function scheduleReconnect(delayMs) {
  if (reconnectTimer) clearTimeout(reconnectTimer);
  reconnectTimer = setTimeout(() => {
    reconnectTimer = null;
    isStarting     = false;
    startBot();
  }, delayMs);
}

function wipeSessionAndRestart() {
  console.log('\n📱 Logged out — getting new session...\n');
  try {
    fs.readdirSync(SESSION_FOLDER).forEach(f => {
      try { fs.unlinkSync(path.join(SESSION_FOLDER, f)); } catch {}
    });
  } catch {}
  isStarting = false;
  scheduleReconnect(2000);
}

async function startBot() {
  if (isStarting) return;
  isStarting  = true;
  isConnected = false;

  if (currentSock) {
    try { currentSock.ev.removeAllListeners(); currentSock.ws?.close(); } catch {}
    currentSock = null;
  }

  try {
    const { state, saveCreds } = await useMultiFileAuthState(SESSION_FOLDER);
    const { version }          = await fetchLatestBaileysVersion();
    const store                = makeInMemoryStore({ logger });

    const sock = makeWASocket({
      version,
      logger,
      auth: {
        creds: state.creds,
        keys:  makeCacheableSignalKeyStore(state.keys, logger),
      },
      browser:                        Browsers.ubuntu('Chrome'),
      printQRInTerminal:              false,
      generateHighQualityLinkPreview: false,
      syncFullHistory:                false,
      markOnlineOnConnect:            true,
      keepAliveIntervalMs:            20_000,
      retryRequestDelayMs:            2_000,
      connectTimeoutMs:               60_000,
      defaultQueryTimeoutMs:          60_000,
      getMessage: async (key) => {
        try {
          const m = await store.loadMessage(key.remoteJid, key.id);
          return m?.message ?? { conversation: '' };
        } catch { return { conversation: '' }; }
      },
    });

    currentSock = sock;
    store.bind(sock.ev);

    sock.ev.on('connection.update', async ({ connection, lastDisconnect }) => {
      if (connection === 'close') {
        isConnected = false;
        isStarting  = false;
        const code = new Boom(lastDisconnect?.error)?.output?.statusCode;
        if (code === DisconnectReason.loggedOut) {
          wipeSessionAndRestart();
        } else {
          scheduleReconnect(4000);
        }
      } else if (connection === 'open') {
        isConnected = true;
        isStarting  = false;
        const botNum = (sock.user?.id ?? '').split(':')[0].split('@')[0];
        console.log('\n✅ ════════════════════════════════════');
        console.log('   🌸 Shadow Garden Bot — ONLINE!');
        console.log(`   📱 Bot: +${botNum}`);
        console.log(`   🌐 Chrome / Ubuntu (fast pairing + notification)`);
        console.log('════════════════════════════════════\n');
      }
    });

    // Chrome/Ubuntu pairing = WhatsApp sends a notification to phone
    if (!state.creds.registered) {
      await new Promise(r => setTimeout(r, 3_000));
      console.log('\n┌──────────────────────────────────────┐');
      console.log('│   🌸 SHADOW GARDEN — PAIRING SETUP    │');
      console.log('│   📱 WhatsApp notification mode       │');
      console.log('└──────────────────────────────────────┘\n');
      console.log('Enter your WhatsApp number (country code, no + or spaces)');
      console.log('Example: 2349049460676\n');

      let phoneNumber = '';
      while (phoneNumber.length < 7) {
        phoneNumber = (await ask('📱 Number: ')).replace(/\D/g, '');
      }

      await new Promise(r => setTimeout(r, 2_000));
      try {
        const code = await sock.requestPairingCode(phoneNumber);
        const fmt  = code?.match(/.{1,4}/g)?.join('-') ?? code;
        console.log('\n┌──────────────────────────────────────┐');
        console.log(`│   🔑 CODE: ${fmt.padEnd(26)}│`);
        console.log('└──────────────────────────────────────┘');
        console.log('\nSteps:');
        console.log('  1. WhatsApp → Settings → Linked Devices');
        console.log('  2. Link a Device → Link with phone number instead');
        console.log(`  3. Enter: ${fmt}`);
        console.log('\n📲 WhatsApp will send a confirmation notification to your phone!');
        console.log('⏳ Waiting...\n');
      } catch (err) {
        isStarting = false;
        scheduleReconnect(5_000);
        return;
      }
    }

    sock.ev.on('creds.update', saveCreds);

    sock.ev.on('messages.upsert', async ({ messages, type }) => {
      if (type !== 'notify') return;
      for (const msg of messages) {
        if (!msg.message || msg.key.fromMe) continue;
        const ageMs = Date.now() - (Number(msg.messageTimestamp) * 1000);
        if (ageMs > 45_000) continue;
        try { await messageHandler(sock, msg); } catch {}
      }
    });

    sock.ev.on('group-participants.update', async (update) => {
      try { await handleGroupUpdate(sock, update); } catch {}
    });

  } catch {
    isStarting = false;
    scheduleReconnect(5_000);
  }
}

console.log('\n🌸 Starting Shadow Garden Bot (Delta)...\n');
startBot();

setInterval(() => {
  if (!isConnected && !isStarting && !reconnectTimer) startBot();
}, 30_000);

process.on('uncaughtException',  () => {});
process.on('unhandledRejection', () => {});
