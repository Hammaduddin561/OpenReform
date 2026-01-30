/**
 * OpenReform Indexer API - Main Server Entry Point
 * 
 * Provides REST API endpoints for:
 * - Petition data and timelines
 * - IPFS content pinning
 * - Raw event access (debugging)
 */

import express from 'express';
import cors from 'cors';
import { config } from './config.js';
import petitionsRouter from './routes/petitions.js';
import ipfsRouter from './routes/ipfs.js';
import eventsRouter from './routes/events.js';
import { startIndexer, getIndexerStats } from './services/indexer.js';
import { addMockData, getEventsCount } from './services/storage.js';

const app = express();

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// ===== Health Check Endpoint =====
app.get('/api/health', (req, res) => {
    const stats = getIndexerStats();
    res.json({
        status: 'ok',
        indexer: {
            running: stats.running,
            lastBlock: stats.lastBlock,
            eventsIndexed: getEventsCount(),
            configured: stats.configured,
        },
        timestamp: Date.now(),
    });
});

// ===== API Routes =====
app.use('/api/petitions', petitionsRouter);
app.use('/api/ipfs', ipfsRouter);
app.use('/api/events', eventsRouter);

// ===== Root Endpoint =====
app.get('/', (req, res) => {
    res.json({
        name: 'OpenReform Indexer API',
        version: '1.0.0',
        endpoints: {
            health: '/api/health',
            petitions: '/api/petitions',
            petitionDetail: '/api/petitions/:id',
            timeline: '/api/petitions/:id/timeline',
            ipfsPin: '/api/ipfs/pin',
            ipfsStatus: '/api/ipfs/status',
            rawEvents: '/api/events/raw',
        },
        docs: 'See /shared/api-schema.md for full API documentation',
    });
});

// ===== Error Handler =====
app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
    console.error('Unhandled error:', err);
    res.status(500).json({ error: 'Internal server error' });
});

// ===== Start Server =====
async function start() {
    try {
        const contractsConfigured = Boolean(
            config.petitionRegistryAddress && config.escrowMilestonesAddress,
        );

        if (!contractsConfigured) {
            // Add mock data for demo purposes
            console.log('[Server] Adding mock data for demo...');
            addMockData();
        }

        // Start the on-chain indexer
        console.log('[Server] Starting indexer...');
        await startIndexer();

        // Start Express server
        app.listen(config.port, () => {
            console.log(`
╔════════════════════════════════════════════════════════════╗
║          OpenReform Indexer API is running!                ║
╠════════════════════════════════════════════════════════════╣
║  Local:   http://localhost:${config.port}                         ║
║  Health:  http://localhost:${config.port}/api/health              ║
╠════════════════════════════════════════════════════════════╣
║  Endpoints:                                                ║
║  • GET  /api/petitions          - List petitions           ║
║  • GET  /api/petitions/:id      - Petition details         ║
║  • GET  /api/petitions/:id/timeline - Event timeline       ║
║  • POST /api/ipfs/pin           - Pin content to IPFS      ║
║  • GET  /api/events/raw         - Raw events (debug)       ║
╚════════════════════════════════════════════════════════════╝
      `);
        });
    } catch (error) {
        console.error('[Server] Failed to start:', error);
        process.exit(1);
    }
}

start();
