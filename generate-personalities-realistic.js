#!/usr/bin/env node

// Try to load .env file if it exists, but don't fail if it doesn't
// This allows the script to work with environment variables from Codespaces
require('dotenv').config();
const OpenAI = require('openai');
const fs = require('fs');
const path = require('path');

console.log('🎨 Cartoonish Personality Generator (Realistic Style)\n');

// Check for API key
if (!process.env.OPENAI_API_KEY) {
  console.error('❌ Error: OPENAI_API_KEY environment variable is not set.');
  console.error('Please set your OpenAI API key as an environment variable or in a .env file.');
  process.exit(1);
}

// Initialize OpenAI client
const openaiConfig = { apiKey: process.env.OPENAI_API_KEY };
if (process.env.OPENAI_ORG_ID) {
  openaiConfig.organization = process.env.OPENAI_ORG_ID;
}
const openai = new OpenAI(openaiConfig);

// Define personalities with realistic caricature prompts
const personalities = [
  {
    name: 'Judge Judy',
    traits: 'No-nonsense, snappy judgments',
    prompt: 'Create a realistic caricature of Judge Judy. Make it recognizable with subtle exaggeration of distinctive features. Professional quality, clean background, suitable for web display.'
  },
  {
    name: 'Jon Stewart',
    traits: 'Witty, fair, skeptical',
    prompt: 'Create a realistic caricature of Jon Stewart. Make it recognizable with subtle exaggeration of distinctive features. Professional quality, clean background, suitable for web display.'
  },
  {
    name: 'Oprah Winfrey',
    traits: 'Empathetic, centered',
    prompt: 'Create a realistic caricature of Oprah Winfrey. Make it recognizable with subtle exaggeration of distinctive features. Professional quality, clean background, suitable for web display.'
  },
  {
    name: 'Joe Rogan',
    traits: 'Curious, slightly chaotic',
    prompt: 'Create a realistic caricature of Joe Rogan. Make it recognizable with subtle exaggeration of distinctive features. Professional quality, clean background, suitable for web display.'
  },
  {
    name: 'Anderson Cooper',
    traits: 'Calm, mainstream neutral',
    prompt: 'Create a realistic caricature of Anderson Cooper. Make it recognizable with subtle exaggeration of distinctive features. Professional quality, clean background, suitable for web display.'
  },
  {
    name: 'Gandalf',
    traits: 'Wise, grandfatherly neutrality',
    prompt: 'Create a realistic caricature of Gandalf. Make it recognizable with subtle exaggeration of distinctive features. Professional quality, clean background, suitable for web display.'
  },
  {
    name: 'Morpheus',
    traits: 'Visionary, cryptic',
    prompt: 'Create a realistic caricature of Morpheus. Make it recognizable with subtle exaggeration of distinctive features. Professional quality, clean background, suitable for web display.'
  },
  {
    name: 'HAL 9000',
    traits: 'Unsettling AI neutrality',
    prompt: 'Create a realistic caricature of HAL 9000. Make it recognizable with subtle exaggeration of distinctive features. Professional quality, clean background, suitable for web display.'
  },
  {
    name: 'J.A.R.V.I.S.',
    traits: 'Calm AI guidance',
    prompt: 'Create a realistic caricature of J.A.R.V.I.S. Make it recognizable with subtle exaggeration of distinctive features. Professional quality, clean background, suitable for web display.'
  },
  {
    name: 'GLaDOS',
    traits: 'Darkly sarcastic moderation',
    prompt: 'Create a realistic caricature of GLaDOS. Make it recognizable with subtle exaggeration of distinctive features. Professional quality, clean background, suitable for web display.'
  },
  {
    name: 'C-3PO',
    traits: 'Overly polite and procedural',
    prompt: 'Create a realistic caricature of C-3PO. Make it recognizable with subtle exaggeration of distinctive features. Professional quality, clean background, suitable for web display.'
  },
  {
    name: 'Ron Swanson',
    traits: 'Dry libertarian neutrality',
    prompt: 'Create a realistic caricature of Ron Swanson. Make it recognizable with subtle exaggeration of distinctive features. Professional quality, clean background, suitable for web display.'
  },
  {
    name: 'Chris Wallace',
    traits: 'Professional, confrontational',
    prompt: 'Create a realistic caricature of Chris Wallace. Make it recognizable with subtle exaggeration of distinctive features. Professional quality, clean background, suitable for web display.'
  },
  {
    name: 'Morgan Freeman',
    traits: 'Authoritative, soothing',
    prompt: 'Create a realistic caricature of Morgan Freeman. Make it recognizable with subtle exaggeration of distinctive features. Professional quality, clean background, suitable for web display.'
  },
  {
    name: 'The Arbiter AI',
    traits: 'Customizable, persona-free baseline',
    prompt: 'Create a realistic caricature of The Arbiter AI. Make it recognizable with subtle exaggeration of distinctive features. Professional quality, clean background, suitable for web display.'
  }
];

async function generateCaricature(personality) {
  try {
    console.log(`🔄 Generating: ${personality.name}`);
    console.log(`   Traits: ${personality.traits}`);
    
    const response = await openai.images.generate({
      model: process.env.OPENAI_IMAGE_MODEL || 'dall-e-3',
      prompt: personality.prompt,
      size: process.env.OPENAI_IMAGE_SIZE || '1024x1024',
      n: 1,
      response_format: 'b64_json'
    });
    
    if (response.data && response.data.length > 0) {
      const image = response.data[0];
      const imageBuffer = Buffer.from(image.b64_json, 'base64');
      
      // Create personalities folder if it doesn't exist
      const personalitiesDir = 'personalities-realistic';
      if (!fs.existsSync(personalitiesDir)) {
        fs.mkdirSync(personalitiesDir);
        console.log(`📁 Created folder: ${personalitiesDir}`);
      }
      
      // Create filename from name
      const filename = `${personality.name.toLowerCase().replace(/[^a-z0-9]/g, '-')}-realistic-caricature.png`;
      const filepath = path.join(personalitiesDir, filename);
      
      fs.writeFileSync(filepath, imageBuffer);
      
      console.log(`✅ SUCCESS: ${personality.name}`);
      console.log(`📁 Saved as: ${personalitiesDir}/${filename}`);
      console.log(`📏 Size: ${Math.round(imageBuffer.length / 1024)} KB`);
      console.log(`📝 Revised prompt: ${image.revised_prompt ? image.revised_prompt.substring(0, 100) + '...' : 'N/A'}\n`);
      
      return { success: true, filename: `${personalitiesDir}/${filename}`, size: imageBuffer.length, personality: personality.name };
    } else {
      console.log(`❌ FAILED: ${personality.name} - No image data\n`);
      return { success: false, personality: personality.name };
    }
  } catch (error) {
    console.log(`❌ FAILED: ${personality.name} - ${error.message}\n`);
    return { success: false, personality: personality.name, error: error.message };
  }
}

async function main() {
  console.log(`🎯 Generating ${personalities.length} personality caricatures with realistic styling...\n`);
  
  const results = [];
  for (let i = 0; i < personalities.length; i++) {
    const personality = personalities[i];
    console.log(`[${i + 1}/${personalities.length}] Processing: ${personality.name}`);
    try {
      const result = await generateCaricature(personality);
      results.push(result);
    } catch (error) {
      results.push({ success: false, personality: personality.name, error: error.message });
    }
    
    if (i < personalities.length - 1) {
      console.log('⏳ Waiting 2 seconds before next generation...\n');
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }
  
  console.log('📊 FINAL RESULTS:');
  console.log('============================================================');
  const successful = results.filter(r => r.success);
  const failed = results.filter(r => !r.success);
  
  if (successful.length > 0) {
    console.log('✅ SUCCESSFUL GENERATIONS:');
    successful.forEach(result => {
      console.log(`   - ${result.personality}: ${result.filename} (${Math.round(result.size / 1024)} KB)`);
    });
  }
  
  if (failed.length > 0) {
    console.log('\n❌ FAILED GENERATIONS:');
    failed.forEach(result => {
      console.log(`   - ${result.personality}: ${result.error || 'Unknown error'}`);
    });
  }
  
  console.log(`\n🎉 COMPLETED: ${successful.length}/${personalities.length} caricatures generated successfully!`);
  
  if (successful.length > 0) {
    console.log('\n📁 Generated files:');
    successful.forEach(result => {
      console.log(`   - ${result.filename}`);
    });
  }
}

main();

