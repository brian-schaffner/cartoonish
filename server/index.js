const path = require('path');
const dotenv = require('dotenv');

// Try to load .env file if it exists, but don't fail if it doesn't
// This allows the app to work with environment variables from Codespaces
const envPath = path.resolve(__dirname, '..', '.env');
const envResult = dotenv.config({ path: envPath });

if (envResult.error && envResult.error.code !== 'ENOENT') {
  console.error('Failed to load environment variables from .env file.', envResult.error);
}

const express = require('express');
const cors = require('cors');
const OpenAI = require('openai');
const ImageSearchService = require('./imageSearch');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json({ limit: '1mb' }));
app.use(express.static(path.join(__dirname, '..', 'public')));

let openaiClient = null;
if (process.env.OPENAI_API_KEY) {
  const openaiConfig = { apiKey: process.env.OPENAI_API_KEY };
  if (process.env.OPENAI_ORG_ID) {
    openaiConfig.organization = process.env.OPENAI_ORG_ID;
  }
  openaiClient = new OpenAI(openaiConfig);
}

// Initialize image search service
const imageSearchService = new ImageSearchService();

async function generateCaricature(name) {
  if (!openaiClient) {
    throw new Error('OpenAI API key is not configured. Set OPENAI_API_KEY to generate images.');
  }

  console.log(`🎨 Generating caricature for: ${name}`);

  // First, try to find reference images
  let referenceImages = null;
  try {
    referenceImages = await imageSearchService.searchForPortrait(name);
  } catch (error) {
    console.log(`⚠️ Could not find reference images for ${name}: ${error.message}`);
  }

  let response;
  
  if (referenceImages && referenceImages.length > 0) {
    // Use multiple reference images with Judge Judy style
    console.log(`📸 Using ${referenceImages.length} reference images from: ${referenceImages[0].source}`);
    
    const prompt = `Create a caricature in the exact same style as the Judge Judy reference image. Use the provided reference images of ${name} to capture their distinctive features, but render them in the same bold graphic art style with thick dark outlines, limited color palette, and comic book aesthetic as shown in the Judge Judy style reference. Make it recognizable with subtle exaggeration of distinctive features. Professional quality, clean background, suitable for web display.`;

    try {
      // Use style-based prompt with specific person details
      let personSpecificPrompt = '';
      
      // Add specific features for well-known people
      if (name.toLowerCase().includes('oprah')) {
        personSpecificPrompt = `Create a caricature of OPRAH WINFREY (the famous talk show host) in the exact same bold graphic art style as Judge Judy Sheindlin's caricature. 

OPRAH'S DISTINCTIVE FEATURES:
- African American woman with warm, rich skin tone
- Curly, voluminous hair (often styled in loose curls or waves)
- Bright, expressive eyes and warm smile
- Full lips and strong, confident facial features
- Often wears elegant, professional clothing

STYLE REQUIREMENTS (copy exactly from Judge Judy style):
- Thick dark outlines defining all features
- Limited color palette: warm skin tones, dark clothing, bright white accents
- Comic book aesthetic with cell-shaded shadows
- Strong facial features with subtle exaggeration
- Professional quality with clean background

The result should look like OPRAH WINFREY but drawn in Judge Judy's exact artistic style.`;
      } else if (name.toLowerCase().includes('einstein')) {
        personSpecificPrompt = `Create a caricature of ALBERT EINSTEIN (the famous physicist) in the exact same bold graphic art style as Judge Judy Sheindlin's caricature.

EINSTEIN'S DISTINCTIVE FEATURES:
- Wild, unkempt white hair that sticks out in all directions
- Prominent mustache
- Deep-set, intelligent eyes
- Wrinkled, thoughtful expression
- Often wears simple, dark clothing

STYLE REQUIREMENTS (copy exactly from Judge Judy style):
- Thick dark outlines defining all features
- Limited color palette: warm skin tones, dark clothing, bright white accents
- Comic book aesthetic with cell-shaded shadows
- Strong facial features with subtle exaggeration
- Professional quality with clean background

The result should look like ALBERT EINSTEIN but drawn in Judge Judy's exact artistic style.`;
      } else {
        personSpecificPrompt = `Create a caricature of ${name} in the exact same bold graphic art style as Judge Judy Sheindlin's caricature. 

STYLE REQUIREMENTS (copy exactly from Judge Judy style):
- Thick dark outlines defining all features
- Limited color palette: warm skin tones, dark clothing, bright white accents
- Comic book aesthetic with cell-shaded shadows
- Strong facial features with subtle exaggeration
- Professional quality with clean background

PERSON SPECIFIC FEATURES for ${name}:
- Make it clearly recognizable as ${name}, not Judge Judy
- Use the reference images to capture ${name}'s distinctive facial features, hair, and characteristics
- Apply the Judge Judy artistic style to ${name}'s actual appearance

The result should look like ${name} but drawn in Judge Judy's exact artistic style.`;
      }

      const stylePrompt = personSpecificPrompt;

      response = await openaiClient.images.generate({
        model: 'dall-e-3',
        prompt: stylePrompt,
        size: process.env.OPENAI_IMAGE_SIZE || '1024x1024',
        n: 1,
        response_format: 'b64_json'
      });
    } catch (error) {
      console.log(`⚠️ Failed to use reference images, falling back to text-only: ${error.message}`);
      // Fall back to text-only generation
      response = await generateTextOnlyCaricature(name);
    }
  } else {
    // Fall back to text-only generation
    console.log(`📝 No reference images found, using text-only generation`);
    response = await generateTextOnlyCaricature(name);
  }

  if (!response.data || !response.data.length) {
    throw new Error('No image data returned from OpenAI.');
  }

  const image = response.data[0];
  return {
    name,
    imageBase64: image.b64_json,
    revisedPrompt: image.revised_prompt || null,
    usedReferenceImages: !!referenceImages,
    referenceSource: referenceImages?.[0]?.source || null,
    referenceCount: referenceImages?.length || 0
  };
}

async function generateTextOnlyCaricature(name) {
  const prompt = `Create a realistic caricature of ${name}. Make it recognizable with subtle exaggeration of distinctive features. Professional quality, clean background, suitable for web display.`;

  return await openaiClient.images.generate({
    model: process.env.OPENAI_IMAGE_MODEL || 'dall-e-3',
    prompt,
    size: process.env.OPENAI_IMAGE_SIZE || '1024x1024',
    n: 1,
    response_format: 'b64_json'
  });
}

app.post('/api/generate', async (req, res) => {
  const { names } = req.body || {};

  if (!names || (typeof names !== 'string' && !Array.isArray(names))) {
    return res.status(400).json({ error: 'Request body must include "names" as a string or an array of strings.' });
  }

  const nameList = Array.isArray(names)
    ? names.filter((n) => typeof n === 'string' && n.trim().length > 0)
    : names
        .split(/[,\n]/)
        .map((n) => n.trim())
        .filter(Boolean);

  if (!nameList.length) {
    return res.status(400).json({ error: 'Please provide at least one valid name.' });
  }

  try {
    const results = [];
    for (const name of nameList) {
      const caricature = await generateCaricature(name);
      results.push(caricature);
    }

    res.json({ results });
  } catch (error) {
    console.error('Image generation failed', error);
    res.status(500).json({ error: error.message || 'Failed to generate caricatures.' });
  }
});

// API endpoint to show API key info
app.get('/api/info', (req, res) => {
  const apiKey = process.env.OPENAI_API_KEY;
  const orgId = process.env.OPENAI_ORG_ID;
  
  res.json({
    apiKeyConfigured: !!apiKey,
    apiKeyLast4: apiKey ? apiKey.slice(-4) : null,
    orgIdConfigured: !!orgId,
    orgId: orgId || null
  });
});

app.use((req, res) => {
  res.sendFile(path.join(__dirname, '..', 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Cartoonish server listening on http://localhost:${PORT}`);
  if (process.env.OPENAI_API_KEY) {
    console.log(`✅ API Key configured: ...${process.env.OPENAI_API_KEY.slice(-4)}`);
    if (process.env.OPENAI_ORG_ID) {
      console.log(`✅ Organization ID: ${process.env.OPENAI_ORG_ID}`);
    }
  } else {
    console.warn('⚠️  Warning: OPENAI_API_KEY is not set. Image generation requests will fail until it is provided.');
  }
  
  // Check for image search API keys
  if (process.env.GOOGLE_API_KEY && process.env.GOOGLE_SEARCH_ENGINE_ID) {
    console.log(`✅ Google Custom Search API configured for reference images`);
  }
  if (process.env.UNSPLASH_ACCESS_KEY) {
    console.log(`✅ Unsplash API configured for reference images`);
  }
  if (process.env.PEXELS_API_KEY) {
    console.log(`✅ Pexels API configured for reference images`);
  }
  if (!process.env.GOOGLE_API_KEY && !process.env.UNSPLASH_ACCESS_KEY && !process.env.PEXELS_API_KEY) {
    console.log(`ℹ️  No image search APIs configured. Will use text-only generation.`);
  }
  
  // Clean up old temp files on startup
  imageSearchService.cleanupTempFiles();
  
  // Set up periodic cleanup (every hour)
  setInterval(() => {
    imageSearchService.cleanupTempFiles();
  }, 60 * 60 * 1000);
});
