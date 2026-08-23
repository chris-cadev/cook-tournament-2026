import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import chatRoutes from './routes/chat';
import { setupSocketIO } from './socket';
import { getDb } from './db';

const app = express();
const httpServer = createServer(app);
const PORT = process.env.PORT || 3001;

app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true,
}));
app.use(express.json());

// Routes
app.use('/api/chat', chatRoutes);

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok' });
});

// Initialize database and start server
async function start() {
  await getDb();
  setupSocketIO(httpServer);

  httpServer.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}

start().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});

export default app;
