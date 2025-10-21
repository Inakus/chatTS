import jwt from 'jsonwebtoken';
import { db, users, chatParticipants, messages } from '../db';
import { eq, and } from 'drizzle-orm';

const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret';

export const setupSocketHandlers = (io: any) => {
  io.on('connection', (socket: any) => {
    console.log('User connected:', socket.id);

    socket.on('authenticate', (userId: number) => {
      socket.join(`user_${userId}`);
      console.log(`User ${userId} authenticated`);
    });

    socket.on('joinChat', (chatId: number) => {
      socket.join(`chat_${chatId}`);
      console.log(`User joined chat ${chatId}`);
    });

    socket.on('leaveChat', (chatId: number) => {
      socket.leave(`chat_${chatId}`);
      console.log(`User left chat ${chatId}`);
    });

    socket.on('sendMessage', async (data: { content: string; chatId: number; userId: number; token: string }) => {
      try {
        // Verify token
        const decoded = jwt.verify(data.token, JWT_SECRET) as any;
        if (decoded.id !== data.userId) return;

        // Check if user is participant in the chat
        const isParticipant = await db
          .select()
          .from(chatParticipants)
          .where(and(
            eq(chatParticipants.chatId, data.chatId),
            eq(chatParticipants.userId, data.userId)
          ))
          .limit(1);

        if (isParticipant.length === 0) return;

        // Get user
        const userResult = await db.select().from(users).where(eq(users.id, data.userId)).limit(1);
        if (userResult.length === 0) return;

        const user = userResult[0];

        // Save message to database
        const newMessage = await db.insert(messages).values({
          content: data.content,
          chatId: data.chatId,
          userId: data.userId,
          createdAt: new Date(),
        }).returning();

        // Emit to chat participants
        io.to(`chat_${data.chatId}`).emit('newMessage', {
          id: newMessage[0].id,
          content: newMessage[0].content,
          chatId: newMessage[0].chatId,
          userId: newMessage[0].userId,
          createdAt: newMessage[0].createdAt,
          username: user.username
        });
      } catch (error) {
        console.error('Send message error:', error);
      }
    });

    socket.on('disconnect', () => {
      console.log('User disconnected:', socket.id);
    });
  });
};
