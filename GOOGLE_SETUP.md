# Google Custom Search API Setup Guide

Google Custom Search API is the **best option** for finding reference images of celebrities and public figures. It has access to the entire web, including news sites, official websites, and social media.

## Why Google Custom Search?

- **🎯 Best for Celebrities**: Finds actual photos of specific people
- **📸 High Quality**: Often finds professional headshots and official portraits
- **🌐 Comprehensive**: Searches the entire web, not just stock photos
- **🆓 Free Tier**: 100 queries per day (plenty for most use cases)
- **⚡ Fast**: Google's search is typically the fastest and most reliable

## Setup Steps

### 1. Create Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Note your project ID

### 2. Enable Custom Search API

1. In the Google Cloud Console, go to "APIs & Services" > "Library"
2. Search for "Custom Search API"
3. Click on it and press "Enable"

### 3. Create API Key

1. Go to "APIs & Services" > "Credentials"
2. Click "Create Credentials" > "API Key"
3. Copy the API key (you'll need this for `GOOGLE_API_KEY`)

### 4. Create Custom Search Engine

1. Go to [Google Custom Search Engine](https://cse.google.com/cse/)
2. Click "Add" to create a new search engine
3. In "Sites to search", enter: `*` (this searches the entire web)
4. Give it a name like "Cartoonish Image Search"
5. Click "Create"
6. Click on your new search engine
7. Go to "Setup" > "Basics"
8. Copy the "Search engine ID" (you'll need this for `GOOGLE_SEARCH_ENGINE_ID`)

### 5. Configure Image Search

1. In your Custom Search Engine settings, go to "Setup" > "Advanced"
2. Under "Image search", make sure it's enabled
3. Set "Safe search" to "Medium" or "Off" (depending on your needs)

### 6. Add to Environment

Add these to your `.env` file:

```ini
GOOGLE_API_KEY=your_api_key_here
GOOGLE_SEARCH_ENGINE_ID=your_search_engine_id_here
```

### 7. Test

Restart your server and run the test:

```bash
node test-reference-system.js
```

You should see:
```
Google Custom Search: ✅ Configured
```

## Usage Limits

- **Free Tier**: 100 queries per day
- **Paid Tier**: $5 per 1,000 queries after free tier
- **Rate Limit**: 10 queries per second

## Troubleshooting

### "API key not valid"
- Make sure you copied the API key correctly
- Ensure the Custom Search API is enabled in your project

### "Search engine not found"
- Make sure you copied the Search Engine ID correctly
- Verify the search engine is set to search the entire web (`*`)

### "Quota exceeded"
- You've used your 100 free queries for the day
- Wait until tomorrow or upgrade to paid tier

### No results found
- Try different search terms
- Check if the person is well-known enough to have web presence
- The system will fall back to Pexels/Unsplash automatically

## Benefits Over Stock Photo APIs

| Feature | Google Custom Search | Pexels/Unsplash |
|---------|---------------------|-----------------|
| Celebrity Photos | ✅ Excellent | ❌ Limited |
| News Photos | ✅ Yes | ❌ No |
| Official Portraits | ✅ Yes | ❌ Rare |
| Recent Photos | ✅ Yes | ❌ Limited |
| Free Queries | 100/day | 50-200/hour |
| Setup Complexity | Medium | Easy |

Google Custom Search is definitely worth the extra setup for much better celebrity caricature results!
