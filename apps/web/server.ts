import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';
import { Readable } from 'stream';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  // Railway injects the PORT environment variable automatically.
  // Locally it falls back to 3000.
  const PORT = parseInt(process.env.PORT || '3000', 10);

  // Middleware for parsing body
  app.use(express.json({ limit: '50mb' }));
  app.use(express.raw({ type: 'application/octet-stream', limit: '500mb' }));

  // --- Walrus Proxy Routes ---
  const WALRUS_PUBLISHERS: string[] = [];

  const WALRUS_AGGREGATORS = [
    'https://aggregator.walrus-mainnet.walrus.space',
    'https://aggregator.walrus-mainnet.h2o-nodes.com',
    'https://aggregator.suicore.com'
  ];

  // 1. Store (Proxy to Publisher with Failover)
  app.put('/api/walrus/store', async (req, res) => {
    if (WALRUS_PUBLISHERS.length === 0) {
      return res.status(501).json({
        error: 'public mainnet publisher unavailable',
        details: 'Use backend upload-intent pipeline for mainnet uploads.',
      });
    }

    const epochs = req.query.epochs || '1';
    let lastError = null;

    for (const publisher of WALRUS_PUBLISHERS) {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 600000); // 10 minutes timeout

      try {
        const response = await fetch(`${publisher}/v1/blobs?epochs=${epochs}`, {
          method: 'PUT',
          body: req.body,
          headers: {
            'Content-Type': 'application/octet-stream',
          },
          signal: controller.signal,
        });

        clearTimeout(timeout);

        if (response.ok) {
          const data = await response.json();
          return res.json(data);
        } else {
          const errorText = await response.text();
          console.warn(`Publisher ${publisher} failed:`, errorText);
          lastError = { status: response.status, text: errorText };
        }
      } catch (error: any) {
        clearTimeout(timeout);
        console.warn(`Error connecting to publisher ${publisher}:`, error);
        lastError = error;
      }
    }

    res.status(500).json({ 
      error: 'Failed to proxy store request to any Walrus publisher',
      details: lastError 
    });
  });

  // 2. Fetch (Proxy to Aggregator with Failover)
  app.get('/api/walrus/fetch/:blobId', async (req, res) => {
    const { blobId } = req.params;
    
    for (const aggregator of WALRUS_AGGREGATORS) {
      try {
        const response = await fetch(`${aggregator}/v1/blobs/${blobId}`, {
          signal: AbortSignal.timeout(30000)
        });

        if (response.ok) {
          const contentType = response.headers.get('Content-Type');
          if (contentType) res.setHeader('Content-Type', contentType);
          
          const arrayBuffer = await response.arrayBuffer();
          return res.send(Buffer.from(arrayBuffer));
        }
      } catch (error) {
        console.warn(`Failed to fetch from ${aggregator}:`, error);
      }
    }

    res.status(404).json({ error: 'Blob not found on any aggregator' });
  });

  // 3. Streaming Aggregator Proxy with Failover
  app.get('/api/walrus/retrieve/:blobId', async (req, res) => {
    const { blobId } = req.params;

    for (const aggregator of WALRUS_AGGREGATORS) {
      try {
        const response = await fetch(`${aggregator}/v1/blobs/${blobId}`, {
          signal: AbortSignal.timeout(30000) // 30s timeout per aggregator
        });

        if (response.ok && response.body) {
          // Forward content-type and content-length if available
          const contentType = response.headers.get('Content-Type');
          const contentLength = response.headers.get('Content-Length');
          
          if (contentType) res.setHeader('Content-Type', contentType);
          if (contentLength) res.setHeader('Content-Length', contentLength);
          
          // Stream the response body directly to the client
          const reader = response.body.getReader();
          const stream = new ReadableStream({
            async start(controller) {
              while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                controller.enqueue(value);
              }
              controller.close();
            }
          });

          // Convert web stream to node stream and pipe
          // Since we are in an express environment, we can use the response object
          // But response.body is a web stream, so we need to handle it
          const nodeStream = Readable.from(stream as any);
          nodeStream.pipe(res);
          return;
        }
      } catch (error) {
        console.warn(`Failed to retrieve from ${aggregator}:`, error);
      }
    }

    res.status(404).json({ error: 'Blob not found on any aggregator' });
  });

  // --- Vite Integration ---

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    // Use __dirname so the path is always relative to THIS file (apps/web/),
    // not wherever the process was launched from (which would be wrong on Railway).
    const distPath = path.join(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
