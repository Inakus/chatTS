import 'dotenv/config';
import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';

// Import routes
import authRoutes from './routes/auth';
import chatRoutes, { setChatIO } from './routes/chat';
import userRoutes from './routes/users';
import adminRoutes, { setAdminIO } from './routes/admin';

// Import middleware
import { authenticateToken, authenticateApiKey, apiRateLimiter, authRateLimiter } from './middleware/auth';

// Import socket handlers
import { setupSocketHandlers } from './socket/socketHandlers';

const app = express();
const server = createServer(app);
const io = new Server(server, {
  cors: {
    origin: ["http://localhost:5173", "http://localhost:4173"],
    methods: ["GET", "POST"]
  }
});

app.use(cors());
app.use(express.json());

// Serve static files from uploads directory
app.use('/uploads', express.static('uploads'));

// Apply rate limiting and API key authentication to all API routes
app.use('/api', apiRateLimiter, authenticateApiKey);

// Routes
app.use('/api/auth', authRateLimiter, authRoutes);
app.use('/api/chats', authenticateToken, chatRoutes);
app.use('/api/users', authenticateToken, userRoutes);
app.use('/api/admin', authenticateToken, adminRoutes);

// Setup Socket.IO
setupSocketHandlers(io);
setChatIO(io);
setAdminIO(io);

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
