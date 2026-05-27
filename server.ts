import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import cors from 'cors';
import dotenv from 'dotenv';

// Services
import authService from './server/services/auth-service.js';
import inventoryService from './server/services/inventory-service.js';
import customerService from './server/services/customer-service.js';
import billingService from './server/services/billing-service.js';
import marketingService from './server/services/marketing-service.js';
import purchaseService from './server/services/purchase-service.js';
import settingsService from './server/services/settings-service.js';
import accountsService from './server/services/accounts-service.js';
import reportsService from './server/services/reports-service.js';
import backupService from './server/services/backup-service.js';
import storeService from './server/services/store-service.js';
import gstService from './server/services/gst-service.js';
import { authenticateToken } from './server/middleware/auth.js';
import { connectToDatabase } from './server/db.js';

dotenv.config();

async function startServer() {
  await connectToDatabase();
  const app = express();
  const PORT = 3002;

    app.use(cors({
    origin: (origin, callback) => {
      const allowedOrigins = [
        'https://invoflow.xyraco.com',
        'http://invoflow.xyraco.com'
      ];
      if (!origin) {
        callback(null, true);
        return;
      }
      if (
        allowedOrigins.includes(origin) ||
        origin.endsWith('.run.app') ||
        /^https?:\/\/localhost(:\d+)?$/.test(origin)
      ) {
        callback(null, origin);
      } else {
        // Echo back other origins dynamically to support full access and live previews
        // while maintaining compat with CORS credentials flow
        callback(null, origin);
      }
    },
    credentials: true
  }));

  app.use(express.json());

  // API Routes
  app.use('/api/auth', authService);
  
  // Protected Routes
  app.use('/api/inventory', authenticateToken as any, inventoryService);
  app.use('/api/customer', authenticateToken as any, customerService);
  app.use('/api/billing', authenticateToken as any, billingService);
  app.use('/api/marketing', authenticateToken as any, marketingService);
  app.use('/api/purchase', authenticateToken as any, purchaseService);
  app.use('/api/settings', authenticateToken as any, settingsService);
  app.use('/api/accounts', authenticateToken as any, accountsService);
  app.use('/api/reports', authenticateToken as any, reportsService);
  app.use('/api/gst', authenticateToken as any, gstService);
  app.use('/api/backup', authenticateToken as any, backupService);
  app.use('/api/store', storeService);

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
