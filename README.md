# 🌸 Shadow Garden Bot — Powered by Claude AI

## ⚡ QUICK START

### Step 1: Install Node.js
Download from: https://nodejs.org (v18 or higher)

### Step 2: Install Dependencies
```bash
cd shadow-garden-bot
npm install
```

> If ffmpeg is not installed (needed for video stickers):
> - Windows: Download from https://ffmpeg.org/download.html
> - Linux: `sudo apt install ffmpeg`
> - Mac: `brew install ffmpeg`

### Step 3: Configure the Bot
Open `config.js` and fill in:

```js
OWNER_NUMBER: 'YOUR_NUMBER_HERE'         // Your WhatsApp number (no + sign)
ANTHROPIC_API_KEY: 'YOUR_KEY_HERE'       // Get FREE at: https://console.anthropic.com/
```

> Other API keys (REMOVEBG, RAPIDAPI) are optional.

### Step 4: Start the Bot
```bash
node index.js
```

### Step 5: Pair with WhatsApp
1. Enter your WhatsApp number when prompted
2. Copy the pairing code shown
3. Go to WhatsApp → Settings → Linked Devices → Link a Device
4. Choose "Link with phone number"
5. Enter the code

---

## 🤖 AI COMMANDS (Powered by Claude)

| Command | Description |
|---------|-------------|
| `.ai [question]` | Ask Claude anything — has conversation memory! |
| `.ask [question]` | One-off question (no memory) |
| `.gpt [question]` | Alias for .ai |
| `.clearchat` | Clear your conversation memory |
| `.translate [lang] [text]` | Translate text to any language |
| `.roast @user` | Funny AI-generated roast |
| `.compliment @user` | Sweet AI compliment |
| `.advice [topic]` | Get life advice from Claude |
| `.story [topic]` | Generate a short story |
| `.poem [topic]` | Generate a poem |
| `.joke [topic]` | Get a joke |

## 📋 ALL COMMANDS

### 👑 Owner Commands
| Command | Description |
|---------|-------------|
| `.ban @user` | Ban user from using bot |
| `.unban @user` | Unban user |
| `.join [link]` | Join a group |
| `.exit` | Leave current group |
| `.sudo add [number]` | Add sudo user |
| `.sudo remove [number]` | Remove sudo user |
| `.sudo list` | List sudo users |

### ⚙️ Admin Commands
| Command | Description |
|---------|-------------|
| `.kick @user` | Kick user from group |
| `.promote @user` | Promote to admin |
| `.demote @user` | Demote from admin |
| `.warn @user [reason]` | Warn user |
| `.antilink on/off` | Toggle antilink |
| `.antism on/off` | Toggle antispam |
| `.mute / .unmute` | Mute/unmute group |
| `.tagall` | Tag all members |
| `.welcome on/off` | Toggle welcome messages |
| `.setwelcome [message]` | Set welcome message |

### 💰 Economy Commands
| Command | Description |
|---------|-------------|
| `.register` | Register to use economy |
| `.profile` | View your profile |
| `.daily` | Claim daily coins |
| `.balance` | Check your balance |
| `.shop` | View the shop |
| `.buy [item]` | Buy an item |
| `.inventory` | View your inventory |
| `.dig` | Dig for coins |
| `.fish` | Go fishing |
| `.rob @user` | Rob someone |
| `.donate [amount] @user` | Donate coins |
| `.leaderboard` | View richest users |

### 🎮 Games
| Command | Description |
|---------|-------------|
| `.tictactoe @user` | Play Tic-Tac-Toe |
| `.connectfour @user` | Play Connect Four |
| `.wordchain` | Word chain game |
| `.uno` | Play UNO |
| `.trivia` | Answer trivia questions |
| `.guess` | Number guessing game |
| `.truth` | Truth question |
| `.dare` | Dare challenge |

### 🎰 Gambling
| Command | Description |
|---------|-------------|
| `.coinflip [amount]` | Flip a coin |
| `.slots [amount]` | Play slots |
| `.dice [amount]` | Roll the dice |
| `.roulette [amount]` | Play roulette |

### 🎨 Converter
| Command | Description |
|---------|-------------|
| `.sticker` | Convert image to sticker |
| `.turnimg` | Convert sticker to image |

---

## 📁 FILE STRUCTURE
```
shadow-garden-bot/
├── index.js           ← Main bot file
├── config.js          ← YOUR SETTINGS (edit this!)
├── package.json
├── sessions/          ← Auto-created (auth data)
├── temp/              ← Auto-created (temp files)
├── data/              ← Auto-created (local database)
├── assets/
│   └── delta.jpg      ← Optional menu image
└── src/
    ├── commands/
    │   ├── ai.js      ← Claude AI commands ✨
    │   ├── main.js
    │   ├── admin.js
    │   ├── economy.js
    │   ├── games.js
    │   ├── gambling.js
    │   ├── fun.js
    │   ├── interactions.js
    │   ├── converter.js
    │   ├── anime.js
    │   ├── downloaders.js
    │   └── cards.js
    ├── database/
    │   └── firebase.js ← Local JSON database
    ├── handlers/
    │   └── messageHandler.js
    └── utils/
        └── helpers.js
```

---

## 🔑 API KEYS

| API | Purpose | Where to Get | Cost |
|-----|---------|--------------|------|
| **Anthropic Claude** | `.ai`, `.ask`, `.translate`, `.roast`, `.story`, `.poem`, `.joke` | https://console.anthropic.com/ | FREE tier available |
| RapidAPI | Downloaders (YouTube, TikTok) | https://rapidapi.com | FREE tier |
| Remove.bg | Background removal | https://remove.bg/api | FREE tier |

---

## 🛠️ Troubleshooting

**Bot shows "pairing code" error?**
- Wait 30 seconds and try again
- Restart the bot

**Stickers not working?**
- Install ffmpeg on your system

**AI not responding?**
- Check your `ANTHROPIC_API_KEY` in config.js
- Make sure it starts with `sk-ant-`

**Bot disconnects?**
- The bot auto-reconnects! Just wait.
- Sessions are saved in `sessions/` folder

---

🌸 *Shadow Garden Bot v2.1 — Powered by Claude AI (Anthropic)*
