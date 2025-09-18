const axios = require('axios');
const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

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
    
    // Create temp directory for reference images
    this.tempDir = path.join(__dirname, '..', 'temp');
    if (!fs.existsSync(this.tempDir)) {
      fs.mkdirSync(this.tempDir, { recursive: true });
    }
  }

  async searchForPortrait(personName) {
    console.log(`🔍 Searching for portrait of: ${personName}`);
    
    // Try Google Custom Search first (best for celebrities)
    if (this.googleApiKey && this.googleSearchEngineId) {
      try {
        const image = await this.searchGoogle(personName);
        if (image) return image;
      } catch (error) {
        console.log(`Google search failed: ${error.message}`);
      }
    }
    
    // Try Unsplash as backup
    if (this.unsplashAccessKey) {
      try {
        const image = await this.searchUnsplash(personName);
        if (image) return image;
      } catch (error) {
        console.log(`Unsplash search failed: ${error.message}`);
      }
    }
    
    // Try Pexels as final backup
    if (this.pexelsApiKey) {
      try {
        const image = await this.searchPexels(personName);
        if (image) return image;
      } catch (error) {
        console.log(`Pexels search failed: ${error.message}`);
      }
    }
    
    // If no API keys or all fail, return null
    console.log(`No reference image found for: ${personName}`);
    return null;
  }

  async searchGoogle(query) {
    const searchQuery = `${query} portrait professional headshot`;
    const url = this.googleBaseUrl;
    
    const response = await axios.get(url, {
      params: {
        key: this.googleApiKey,
        cx: this.googleSearchEngineId,
        q: searchQuery,
        searchType: 'image',
        num: 3, // Get top 3 images
        imgSize: 'medium',
        imgType: 'photo',
        safe: 'medium'
      }
    });

    if (response.data.items && response.data.items.length > 0) {
      const images = [];
      
      // Download top 3 images
      for (let i = 0; i < Math.min(3, response.data.items.length); i++) {
        const image = response.data.items[i];
        const imageUrl = image.link;
        const filename = await this.downloadImage(imageUrl, `${query}-${i+1}`, 'google');
        
        if (filename) {
          images.push({
            url: imageUrl,
            localPath: filename,
            source: 'google',
            description: image.title || image.snippet,
            index: i + 1
          });
        }
      }
      
      return images.length > 0 ? images : null;
    }
    
    return null;
  }

  async searchUnsplash(query) {
    const searchQuery = `${query} portrait professional headshot`;
    const url = `${this.unsplashBaseUrl}/search/photos`;
    
    const response = await axios.get(url, {
      headers: {
        'Authorization': `Client-ID ${this.unsplashAccessKey}`
      },
      params: {
        query: searchQuery,
        per_page: 10,
        orientation: 'portrait'
      }
    });

    if (response.data.results && response.data.results.length > 0) {
      const image = response.data.results[0];
      const imageUrl = image.urls.regular;
      const filename = await this.downloadImage(imageUrl, query, 'unsplash');
      return {
        url: imageUrl,
        localPath: filename,
        source: 'unsplash',
        description: image.description || image.alt_description
      };
    }
    
    return null;
  }

  async searchPexels(query) {
    const searchQuery = `${query} portrait professional`;
    const url = `${this.pexelsBaseUrl}/search`;
    
    const response = await axios.get(url, {
      headers: {
        'Authorization': this.pexelsApiKey
      },
      params: {
        query: searchQuery,
        per_page: 10,
        orientation: 'portrait'
      }
    });

    if (response.data.photos && response.data.photos.length > 0) {
      const photo = response.data.photos[0];
      const imageUrl = photo.src.medium;
      const filename = await this.downloadImage(imageUrl, query, 'pexels');
      return {
        url: imageUrl,
        localPath: filename,
        source: 'pexels',
        description: photo.alt
      };
    }
    
    return null;
  }

  async downloadImage(imageUrl, personName, source) {
    try {
      console.log(`📥 Downloading image from ${source}: ${imageUrl}`);
      
      const response = await axios.get(imageUrl, {
        responseType: 'arraybuffer',
        timeout: 10000
      });

      // Create filename
      const timestamp = Date.now();
      const extension = this.getImageExtension(imageUrl);
      const filename = `${personName.toLowerCase().replace(/[^a-z0-9]/g, '-')}-${source}-${timestamp}${extension}`;
      const filepath = path.join(this.tempDir, filename);

      // Process and save image
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
      console.error(`❌ Failed to download image: ${error.message}`);
      return null;
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
