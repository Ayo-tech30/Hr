#!/bin/bash
echo "🌸 Installing Shadow Garden Bot..."
echo ""

# Check Node.js
if ! command -v node &> /dev/null; then
  echo "❌ Node.js not found! Please install Node.js v18+ from https://nodejs.org"
  exit 1
fi

NODE_VER=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VER" -lt 18 ]; then
  echo "❌ Node.js v18+ required. Current: $(node -v)"
  exit 1
fi

echo "✅ Node.js $(node -v) found"
echo ""
echo "📦 Installing dependencies..."
npm install

echo ""
echo "✅ Installation complete!"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  NEXT STEPS:"
echo ""
echo "  1. Open config.js"
echo "  2. Set your OWNER_NUMBER"
echo "  3. Set your ANTHROPIC_API_KEY"
echo "     (Get FREE at: https://console.anthropic.com/)"
echo ""
echo "  4. Run: node index.js"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
