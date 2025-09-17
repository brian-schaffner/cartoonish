require('dotenv').config();
const path = require('path');
const express = require('express');
const cors = require('cors');
const OpenAI = require('openai');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json({ limit: '1mb' }));
app.use(express.static(path.join(__dirname, '..', 'public')));

let openaiClient = null;
if (process.env.OPENAI_API_KEY) {
  openaiClient = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
}

async function generateCaricature(name) {
  if (!openaiClient) {
    throw new Error('OpenAI API key is not configured. Set OPENAI_API_KEY to generate images.');
  }

  const prompt = `Create a vibrant, friendly cartoon caricature illustration of ${name}. Emphasize playful exaggeration while keeping the character recognizable. Render in a polished modern digital art style.`;

  const response = await openaiClient.images.generate({
    model: process.env.OPENAI_IMAGE_MODEL || 'dall-e-3',
    prompt,
    size: process.env.OPENAI_IMAGE_SIZE || '1024x1024',
    n: 1,
    response_format: 'b64_json'
  });

  if (!response.data || !response.data.length) {
    throw new Error('No image data returned from OpenAI.');
  }

  const image = response.data[0];
  return {
    name,
    imageBase64: image.b64_json,
    revisedPrompt: image.revised_prompt || null
  };
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

app.use((req, res) => {
  res.sendFile(path.join(__dirname, '..', 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Cartoonish server listening on http://localhost:${PORT}`);
  if (!process.env.OPENAI_API_KEY) {
    console.warn('Warning: OPENAI_API_KEY is not set. Image generation requests will fail until it is provided.');
  }
});
