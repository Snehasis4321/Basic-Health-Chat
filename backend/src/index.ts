import express, { Express } from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import pool from './config/database.js';
import { connectRedis } from './config/redis.js';
import authRoutes from './routes/auth.js';
import roomRoutes from './routes/rooms.js';
import messageRoutes from './routes/messages.js';
import ttsRoutes from './routes/tts.js';
import { setupWebSocketServer } from './services/websocket.js';

dotenv.config();

const app: Express = express();
const httpServer = createServer(app);

// CORS configuration
const corsOptions = {
  origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
  credentials: true,
};

app.use(cors(corsOptions));
app.use(express.json());

// Serve static files for TTS audio
app.use('/tts-audio', express.static(path.join(process.cwd(), 'public', 'tts-audio')));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/rooms', roomRoutes);
app.use('/api/rooms', messageRoutes);
app.use('/api/tts', ttsRoutes);

// Socket.io setup
const io = new Server(httpServer, {
  cors: corsOptions,
});

// Set up WebSocket server with authentication and connection handling
setupWebSocketServer(io);

// Health check endpoint
app.get('/health', async (_req, res) => {
  try {
    // Check database connection
    await pool.query('SELECT 1');
    
    res.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      services: {
        database: 'connected',
        redis: 'connected',
      },
    });
  } catch (error) {
    res.status(503).json({
      status: 'unhealthy',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// Basic route
app.get('/', (_req, res) => {
  res.json({ message: 'Healthcare Chat Platform API' });
});

// Start server
const PORT = process.env.PORT || 3001;

async function startServer() {
  try {
    // Connect to Redis
    await connectRedis();
    
    // Test database connection
    await pool.query('SELECT 1');
    console.log('Database connection verified');
    
    httpServer.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
      console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

startServer();

export { app, io, httpServer };
