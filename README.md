# Cartoonish Caricature Generator

Cartoonish is a lightweight web application that lets you request playful cartoon-style caricatures of well known real or fictional personalities using OpenAI's DALL·E models. Provide a single name or a list, and the app will queue the requests, display a "working…" status for each, and show the generated results once they are ready.

## Getting started

1. Install dependencies:

   ```bash
   npm install
   ```

2. Create a `.env` file in the project root and provide your OpenAI API key:

   ```bash
   cp env.template .env
   # Then edit .env with your actual API key
   ```

   Or create `.env` manually:
   ```ini
   OPENAI_API_KEY=your_openai_api_key
   # Optional overrides:
   # PORT=3001
   # OPENAI_IMAGE_MODEL=dall-e-3
   # OPENAI_IMAGE_SIZE=1024x1024
   ```

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
