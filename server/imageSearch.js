const axios = require('axios');
const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const DEFAULT_MAX_RESULTS = 3;
const DOWNLOAD_TIMEOUT = 15000;
const GOOGLE_EXTRA_RESULTS = 8;
const FALLBACK_EXTRA_RESULTS = 6;

class ImageSearchService {
  constructor() {
    // Google Custom Search API (free tier allows 100 queries per day)
    this.googleApiKey = process.env.GOOGLE_API_KEY;
    this.googleSearchEngineId = process.env.GOOGLE_SEARCH_ENGINE_ID;
    this.googleBaseUrl = 'https://www.googleapis.com/customsearch/v1';
    
    // Unsplash API (free tier allows 50 requests per hour)
    this.unsplashAccessKey = process.env.UNSPLASH_ACCESS_KEY;
    this.unsplashBaseUrl = 'https://api.unsplash.com';
    
    // Pexels API as backup (free tier allows 200 requests per hour)
    this.pexelsApiKey = process.env.PEXELS_API_KEY;
    this.pexelsBaseUrl = 'https://api.pexels.com/v1';
    
    // Shared HTTP client configuration for downloads
    this.downloadClient = axios.create({
      timeout: DOWNLOAD_TIMEOUT,
      headers: {
        'User-Agent': 'Cartoonish/1.0 (+https://github.com/cartoonish-app)'
      },
      maxContentLength: 1024 * 1024 * 20 // 20MB safeguard
    });

    // Create temp directory for reference images
    this.tempDir = path.join(__dirname, '..', 'temp');
    if (!fs.existsSync(this.tempDir)) {
      fs.mkdirSync(this.tempDir, { recursive: true });
    }
  }

  async searchForPortrait(personName, options = {}) {
    const trimmedName = typeof personName === 'string' ? personName.trim() : '';
    if (!trimmedName) {
      return [];
    }

    const maxResults = Math.max(1, options.maxResults ?? DEFAULT_MAX_RESULTS);
    console.log(`🔍 Searching for portrait of: ${trimmedName}`);

    const collected = [];

    if (this.googleApiKey && this.googleSearchEngineId) {
      try {
        const googleResults = await this.searchGoogle(trimmedName, maxResults);
        collected.push(...googleResults);
      } catch (error) {
        this.logAxiosError('Google', trimmedName, error);
      }
    }

    if (collected.length < maxResults && this.unsplashAccessKey) {
      try {
        const unsplashResults = await this.searchUnsplash(trimmedName, maxResults - collected.length);
        collected.push(...unsplashResults);
      } catch (error) {
        this.logAxiosError('Unsplash', trimmedName, error);
      }
    }

    if (collected.length < maxResults && this.pexelsApiKey) {
      try {
        const pexelsResults = await this.searchPexels(trimmedName, maxResults - collected.length);
        collected.push(...pexelsResults);
      } catch (error) {
        this.logAxiosError('Pexels', trimmedName, error);
      }
    }

    if (!collected.length) {
      console.log(`No reference image found for: ${trimmedName}`);
    }

    return collected.slice(0, maxResults).map((result, index) => ({
      ...result,
      index: index + 1
    }));
  }

  async searchGoogle(query, maxResults) {
    const response = await axios.get(this.googleBaseUrl, {
      params: {
        key: this.googleApiKey,
        cx: this.googleSearchEngineId,
        q: `${query} portrait professional headshot`,
        searchType: 'image',
        num: Math.min(10, maxResults + GOOGLE_EXTRA_RESULTS),
        safe: 'medium'
      }
    });

    const items = Array.isArray(response.data?.items) ? response.data.items : [];
    const results = [];

    for (const item of items) {
      const imageUrl = item?.link;
      if (!imageUrl) continue;

      const localPath = await this.downloadImage(imageUrl, `${query}-${results.length + 1}`, 'google');
      if (!localPath) continue;

      results.push({
        url: imageUrl,
        localPath,
        source: 'google',
        description: item?.title || item?.snippet || ''
      });

      if (results.length >= maxResults) break;
    }

    return results;
  }

  async searchUnsplash(query, remainingSlots) {
    if (remainingSlots <= 0) return [];

    const response = await axios.get(`${this.unsplashBaseUrl}/search/photos`, {
      headers: {
        Authorization: `Client-ID ${this.unsplashAccessKey}`
      },
      params: {
        query: `${query} portrait professional headshot`,
        per_page: Math.min(remainingSlots + FALLBACK_EXTRA_RESULTS, 30),
        orientation: 'portrait'
      }
    });

    const photos = Array.isArray(response.data?.results) ? response.data.results : [];
    const results = [];

    for (const photo of photos) {
      const imageUrl = photo?.urls?.regular;
      if (!imageUrl) continue;

      const localPath = await this.downloadImage(imageUrl, `${query}-${results.length + 1}`, 'unsplash');
      if (!localPath) continue;

      results.push({
        url: imageUrl,
        localPath,
        source: 'unsplash',
        description: photo?.description || photo?.alt_description || ''
      });

      if (results.length >= remainingSlots) break;
    }

    return results;
  }

  async searchPexels(query, remainingSlots) {
    if (remainingSlots <= 0) return [];

    const response = await axios.get(`${this.pexelsBaseUrl}/search`, {
      headers: {
        Authorization: this.pexelsApiKey
      },
      params: {
        query: `${query} portrait professional`,
        per_page: Math.min(remainingSlots + FALLBACK_EXTRA_RESULTS, 30),
        orientation: 'portrait'
      }
    });

    const photos = Array.isArray(response.data?.photos) ? response.data.photos : [];
    const results = [];

    for (const photo of photos) {
      const imageUrl = photo?.src?.medium || photo?.src?.large;
      if (!imageUrl) continue;

      const localPath = await this.downloadImage(imageUrl, `${query}-${results.length + 1}`, 'pexels');
      if (!localPath) continue;

      results.push({
        url: imageUrl,
        localPath,
        source: 'pexels',
        description: photo?.alt || photo?.photographer || ''
      });

      if (results.length >= remainingSlots) break;
    }

    return results;
  }

  async downloadImage(imageUrl, personName, source) {
    try {
      console.log(`📥 Downloading image from ${source}: ${imageUrl}`);

      const response = await this.downloadClient.get(imageUrl, {
        responseType: 'arraybuffer'
      });

      const filename = this.buildFilename(personName, source, imageUrl);
      const filepath = path.join(this.tempDir, filename);

      const buffer = Buffer.from(response.data);
      await sharp(buffer)
        .resize(1024, 1024, {
          fit: 'inside',
          withoutEnlargement: true
        })
        .jpeg({ quality: 90 })
        .toFile(filepath);

      console.log(`✅ Downloaded and processed: ${filename}`);
      return filepath;
    } catch (error) {
      this.logAxiosError(`${source} download`, personName, error);
      return null;
    }
  }

  buildFilename(personName, source, imageUrl) {
    const safeName = personName.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    const timestamp = Date.now();
    const extension = this.getImageExtension(imageUrl);
    return `${safeName}-${source}-${timestamp}${extension}`;
  }

  logAxiosError(provider, personName, error) {
    if (error?.response) {
      const { status, data } = error.response;
      console.log(`${provider} failed for ${personName}: ${status} ${JSON.stringify(data)}`);
    } else if (error?.request) {
      console.log(`${provider} failed for ${personName}: no response (${error.message})`);
    } else if (error) {
      console.log(`${provider} failed for ${personName}: ${error.message}`);
    }
  }

  getImageExtension(url) {
    const pathname = new URL(url).pathname;
    const extension = path.extname(pathname);
    return extension || '.jpg';
  }

  // Clean up old temp files
  cleanupTempFiles() {
    try {
      const files = fs.readdirSync(this.tempDir);
      const now = Date.now();
      const maxAge = 24 * 60 * 60 * 1000; // 24 hours

      files.forEach(file => {
        const filepath = path.join(this.tempDir, file);
        const stats = fs.statSync(filepath);
        
        if (now - stats.mtime.getTime() > maxAge) {
          fs.unlinkSync(filepath);
          console.log(`🗑️ Cleaned up old temp file: ${file}`);
        }
      });
    } catch (error) {
      console.error(`Error cleaning up temp files: ${error.message}`);
    }
  }
}

module.exports = ImageSearchService;
