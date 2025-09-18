const path = require('path');
const fs = require('fs');
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
  let referenceImages = [];
  try {
    referenceImages = await imageSearchService.searchForPortrait(name, { maxResults: 3 });
  } catch (error) {
    console.log(`⚠️ Could not find reference images for ${name}: ${error.message}`);
  }

  let response;
  let usedReferenceImages = false;
  let effectiveReferenceCount = 0;
  let referenceSource = null;

  const normalizedReferences = Array.isArray(referenceImages) ? referenceImages : [];

  if (normalizedReferences.length > 0) {
    // Use multiple reference images with Judge Judy style
    const usableReferences = normalizedReferences
      .map((ref, index) => {
        if (!ref || !ref.localPath) return null;

        const safePath = ref.localPath;
        if (!fs.existsSync(safePath)) {
          return null;
        }

        return {
          localPath: safePath,
          source: ref.source || 'unknown',
          description: ref.description || '',
          index: ref.index || index + 1
        };
      })
      .filter(Boolean)
      .slice(0, 3);

    const judgeJudyStylePath = path.join(__dirname, '..', 'style-references', 'judge-judy-style-reference.png');
    const judgeStyleExists = fs.existsSync(judgeJudyStylePath);

    if (judgeStyleExists && usableReferences.length > 0) {
      console.log(`📸 Using ${usableReferences.length} reference images from: ${usableReferences[0].source}`);

      const referenceDescriptions = formatReferenceDescriptions(usableReferences);
      const prompt = buildStylePrompt(name, referenceDescriptions);

      try {
        const uploadImages = [
          fs.createReadStream(judgeJudyStylePath),
          ...usableReferences.map(ref => fs.createReadStream(ref.localPath))
        ];

        response = await openaiClient.images.edit({
          model: 'gpt-image-1',
          image: uploadImages,
          prompt,
          size: process.env.OPENAI_IMAGE_SIZE || '1024x1024',
          n: 1,
          input_fidelity: 'high',
          background: 'opaque'
        });
        usedReferenceImages = true;
        effectiveReferenceCount = usableReferences.length;
        const sources = new Set(usableReferences.map((ref) => ref.source || 'unknown'));
        referenceSource = sources.size === 1 ? [...sources][0] : 'mixed';
      } catch (error) {
        console.log(`⚠️ Failed to use reference images, falling back to text-only: ${error.message}`);
        response = await generateTextOnlyCaricature(name);
      }
    } else {
      console.log('ℹ️  Missing Judge Judy style reference or usable reference photos. Falling back to text-only generation.');
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
    usedReferenceImages,
    referenceSource,
    referenceCount: usedReferenceImages ? effectiveReferenceCount : 0
  };
}

function formatReferenceDescriptions(references) {
  return references
    .map(
      (ref, idx) =>
        `- Reference ${idx + 1} (${ref.source || 'unknown'}): ${ref.description || 'Portrait photo downloaded for likeness'}`
    )
    .join('\n');
}

function buildStylePrompt(name, referenceDescriptions) {
  return `Use the first attachment as the Judge Judy style reference. Use every remaining attachment for likeness information about ${name}. Create a brand new caricature of ${name} that keeps the Judge Judy illustration style: bold graphic outlines, limited color palette, comic book shading, expressive courtroom drama energy, and a clean background. Maintain ${name}'s recognisable features with tasteful exaggeration.\n\nReference details:\n${referenceDescriptions}`;
}

async function generateTextOnlyCaricature(name) {
  const prompt = `Create a bold, Judge Judy-style caricature of ${name}. Make it recognisable with tasteful exaggeration, bold graphic outlines, limited colors, and a clean background.`;

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
