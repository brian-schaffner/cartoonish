#!/bin/bash
cd /Users/brian/dev/cartoonish/cartoonish

# Check for API key in environment variables (Codespaces) or .env file
if [ -z "$OPENAI_API_KEY" ] && [ ! -f .env ]; then
    echo "⚠️  No OpenAI API key found!"
    echo ""
    echo "Please configure your API key using one of these methods:"
    echo ""
    echo "Option 1: GitHub Codespaces (Recommended)"
    echo "  - Set OPENAI_API_KEY as a Codespace secret"
    echo ""
    echo "Option 2: Local .env file"
    echo "  - Create a .env file with: OPENAI_API_KEY=your_api_key_here"
    echo "  - Or copy env.template: cp env.template .env"
    echo ""
    exit 1
fi

echo "🚀 Starting Cartoonish server..."
if [ -n "$OPENAI_API_KEY" ]; then
    echo "✅ Using API key from environment variable"
else
    echo "✅ Using API key from .env file"
fi
node server/index.js
