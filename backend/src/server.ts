import 'dotenv/config';
import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';

// Import routes
import authRoutes from './routes/auth';
import chatRoutes, { setChatIO } from './routes/chat';
import userRoutes from './routes/users';

// Import middleware
import { authenticateToken } from './middleware/auth';

// Import socket handlers
import { setupSocketHandlers } from './socket/socketHandlers';

const app = express();
const server = createServer(app);
const io = new Server(server, {
  cors: {
    origin: "http://localhost:5173",
    methods: ["GET", "POST"]
  }
});

app.use(cors());
app.use(express.json());

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/chats', authenticateToken, chatRoutes);
app.use('/api/users', authenticateToken, userRoutes);

// Setup Socket.IO
setupSocketHandlers(io);
setChatIO(io);

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
