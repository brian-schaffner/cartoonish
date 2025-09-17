#!/bin/bash
cd /Users/brian/dev/cartoonish/cartoonish

# Check if .env file exists, if not, prompt user to create one
if [ ! -f .env ]; then
    echo "⚠️  No .env file found!"
    echo "Please create a .env file with your OpenAI API key:"
    echo "OPENAI_API_KEY=your_api_key_here"
    echo ""
    echo "You can copy env.template to .env and add your key:"
    echo "cp env.template .env"
    echo "Then edit .env with your actual API key"
    exit 1
fi

echo "🚀 Starting Cartoonish server..."
node server/index.js
