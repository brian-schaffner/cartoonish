# Cartoonish Caricature Generator

Cartoonish is a lightweight web application that generates realistic caricatures of well-known personalities using OpenAI's DALL·E models. The system intelligently searches for reference portraits to ensure accurate and recognizable caricatures.

## ✨ Features

- **Reference-Based Generation**: Automatically finds and uses reference portraits for more accurate caricatures
- **Fallback Support**: Works with or without image search APIs
- **Multiple APIs**: Supports Unsplash and Pexels for reference image lookup
- **Web Interface**: Clean, responsive web app for easy caricature generation
- **CLI Tools**: Command-line scripts for batch generation
- **Realistic Style**: Generates professional-quality caricatures suitable for web display

## Getting started

1. Install dependencies:

   ```bash
   npm install
   ```

2. Configure your API keys:

   **Option A: GitHub Codespaces (Recommended)**
   - Set `OPENAI_API_KEY` as a Codespace secret
   - Set `OPENAI_ORG_ID` as a Codespace secret (optional)
   - Set `UNSPLASH_ACCESS_KEY` as a Codespace secret (optional)
   - Set `PEXELS_API_KEY` as a Codespace secret (optional)
   - The app will automatically use the environment variables

   **Option B: Local .env file**
   ```bash
   cp env.template .env
   # Then edit .env with your actual API keys
   ```

   Or create `.env` manually:
   ```ini
   # Required: OpenAI API for image generation
   OPENAI_API_KEY=your_openai_api_key
   OPENAI_ORG_ID=org-PHPY58jyQohZgvPdvYv9dZA2
   
   # Optional: Image search APIs for reference portraits
   UNSPLASH_ACCESS_KEY=your_unsplash_access_key
   PEXELS_API_KEY=your_pexels_api_key
   
   # Optional overrides:
   # PORT=3001
   # OPENAI_IMAGE_MODEL=dall-e-3
   # OPENAI_IMAGE_SIZE=1024x1024
   ```

### 🔑 Getting Image Search API Keys

For more accurate caricatures, get free API keys from:

**Google Custom Search API** (100 queries/day free) - **BEST FOR CELEBRITIES**:
1. Go to [https://developers.google.com/custom-search/v1/introduction](https://developers.google.com/custom-search/v1/introduction)
2. Create a new project or select existing one
3. Enable the Custom Search API
4. Create credentials (API key)
5. Go to [https://cse.google.com/cse/](https://cse.google.com/cse/)
6. Create a new Custom Search Engine
7. Set it to search the entire web
8. Copy the Search Engine ID
9. Add both keys to your `.env` file

**Unsplash API** (50 requests/hour free):
1. Go to [https://unsplash.com/developers](https://unsplash.com/developers)
2. Create a free account
3. Create a new application
4. Copy the Access Key

**Pexels API** (200 requests/hour free):
1. Go to [https://www.pexels.com/api/](https://www.pexels.com/api/)
2. Create a free account
3. Generate an API key

*Note: The system works without these APIs but will use text-only generation, which may be less accurate. Google Custom Search is best for finding specific celebrities.*

3. Start the development server:

   ```bash
   # Option 1: Use the startup script (recommended)
   ./start-server.sh
   
   # Option 2: Use npm start
   npm start
   ```

4. Open [http://localhost:3001](http://localhost:3001) in your browser. Enter one or more names (comma or newline separated) and press **Generate caricatures** to begin. Each entry will display a placeholder status until the corresponding image has been created.

## Project structure

- `server/index.js` – Express server that serves the static frontend and proxies caricature generation requests to the OpenAI Images API.
- `public/` – Static frontend assets (HTML, CSS, and JavaScript).

## Notes

- Image generation requires an active OpenAI API subscription that supports DALL·E models.
- Requests are processed sequentially on the server to avoid rate-limit surprises. If a request fails, the frontend will display an error banner and mark each pending card as failed.
- The API accepts either a simple string (comma/newline delimited) or an array of names.
