import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';
import cors from 'cors';
import dotenv from 'dotenv';

// Services
import authService from './server/services/auth-service.js';
import inventoryService from './server/services/inventory-service.js';
import customerService from './server/services/customer-service.js';
import billingService from './server/services/billing-service.js';
import marketingService from './server/services/marketing-service.js';
import { authenticateToken } from './server/middleware/auth.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(cors());
  app.use(express.json());

  // API Routes
  app.use('/api/auth', authService);
  
  // Protected Routes
  app.use('/api/inventory', authenticateToken as any, inventoryService);
  app.use('/api/customer', authenticateToken as any, customerService);
  app.use('/api/billing', authenticateToken as any, billingService);
  app.use('/api/marketing', authenticateToken as any, marketingService);

  // Health check
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok' });
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
    console.log(`Server running at http://localhost:${PORT}`);
  });
}

startServer();
