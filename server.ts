import express from 'express';
import { createServer as createViteServer } from 'vite';
import axios from 'axios';
import * as cheerio from 'cheerio';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API Route for Link Auditing
  app.get('/api/audit-link', async (req, res) => {
    const { url } = req.query;

    if (!url || typeof url !== 'string') {
      return res.status(400).json({ error: 'URL is required' });
    }

    try {
      const response = await axios.get(url, {
        timeout: 8000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        }
      });

      const html = response.data;
      const $ = cheerio.load(html);

      // Heuristic detection for "Not Available" / "404"
      const bodyText = $('body').text().toLowerCase();
      const title = $('title').text().toLowerCase();

      let status: 'valid' | 'invalid' = 'valid';
      let reason = '';

      // YouTube specific checks
      if (url.includes('youtube.com') || url.includes('youtu.be')) {
        if (bodyText.includes('video unavailable') || 
            bodyText.includes('this video is private') ||
            bodyText.includes('video has been removed') ||
            title.includes('video unavailable')) {
          status = 'invalid';
          reason = 'Video unavailable or private';
        }
      } else {
        // General checks
        const common404 = [
          '404 not found',
          'page not found',
          'the page you are looking for',
          'we couldn’t find that page',
          'error 404'
        ];

        if (common404.some(msg => bodyText.includes(msg) || title.includes(msg))) {
          status = 'invalid';
          reason = '404 Page Not Found';
        }

        // Content check for recipes (loose)
        // If it's a nutrition link, maybe look for "ingredients" or "instructions"
        if (url.toLowerCase().includes('recipe') || url.toLowerCase().includes('nutrition')) {
           const hasKeywords = ['ingredients', 'prep', 'cook', 'calories', 'protein'].some(k => bodyText.includes(k));
           if (!hasKeywords && bodyText.length < 500) {
              status = 'invalid';
              reason = 'Link lacks recipe/nutrition content';
           }
        }
      }

      res.json({ status, reason, title: $('title').text().trim() });
    } catch (error: any) {
      res.json({ 
        status: 'invalid', 
        reason: error.response?.status === 404 ? '404 Not Found' : 'Connection failed or timeout'
      });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running at http://0.0.0.0:${PORT}`);
  });
}

startServer();
