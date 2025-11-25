import express from 'express';
import { db, users, messages } from '../db';
import { eq, ne } from 'drizzle-orm';
import { AuthenticatedRequest } from '../types';
import { authenticateToken, requireAdmin } from '../middleware/auth';
import { decryptMessage } from '../utils/encryption';

// Global io instance for emitting events
let io: any;

export const setAdminIO = (socketIO: any) => {
  io = socketIO;
};

const router = express.Router();

// Apply admin middleware to all admin routes (authentication is handled globally)
router.use(requireAdmin);

// Get all users (for admin panel)
router.get('/users', async (req: AuthenticatedRequest, res) => {
  try {
    const allUsers = await db
      .select({
        id: users.id,
        username: users.username,
        email: users.email,
        role: users.role,
        isBanned: users.isBanned,
        createdAt: users.createdAt,
      })
      .from(users)
      .orderBy(users.createdAt);

    res.json(allUsers);
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Ban/unban user
router.put('/users/:userId/ban', async (req: AuthenticatedRequest, res) => {
  try {
    const { userId } = req.params;
    const { banned } = req.body;

    if (typeof banned !== 'boolean') {
      return res.status(400).json({ error: 'Banned status must be boolean' });
    }

    // Prevent admin from banning themselves
    if (parseInt(userId) === req.user!.id) {
      return res.status(400).json({ error: 'Cannot ban yourself' });
    }

    const updatedUser = await db
      .update(users)
      .set({ isBanned: banned })
      .where(eq(users.id, parseInt(userId)))
      .returning();

    if (updatedUser.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({
      user: updatedUser[0],
      message: `User ${banned ? 'banned' : 'unbanned'} successfully`
    });
  } catch (error) {
    console.error('Ban user error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete message (admin only - soft delete)
router.delete('/messages/:messageId', async (req: AuthenticatedRequest, res) => {
  try {
    const { messageId } = req.params;

    const message = await db
      .select()
      .from(messages)
      .where(eq(messages.id, parseInt(messageId)))
      .limit(1);

    if (message.length === 0) {
      return res.status(404).json({ error: 'Message not found' });
    }

    // Soft delete the message
    const deletedMessage = await db
      .update(messages)
      .set({
        deleted: true,
        deletedAt: new Date()
      })
      .where(eq(messages.id, parseInt(messageId)))
      .returning();

    // Emit message update to all chat participants
    if (io) {
      // Get the updated message with deleted status
      const updatedMessage = await db
        .select({
          id: messages.id,
          content: messages.content,
          userId: messages.userId,
          chatId: messages.chatId,
          createdAt: messages.createdAt,
          deleted: messages.deleted,
          deletedAt: messages.deletedAt,
          username: users.username,
          mediaUrl: messages.mediaUrl,
          mediaType: messages.mediaType,
        })
        .from(messages)
        .innerJoin(users, eq(messages.userId, users.id))
        .where(eq(messages.id, parseInt(messageId)))
        .limit(1);

      if (updatedMessage.length > 0) {
        // Decrypt content for the updated message
        const decryptedMessage = {
          ...updatedMessage[0],
          content: decryptMessage(updatedMessage[0].content)
        };

        io.emit('messageUpdated', decryptedMessage);
      }
    }

    res.json({
      message: 'Message deleted successfully',
      deletedMessage: deletedMessage[0]
    });
  } catch (error) {
    console.error('Delete message error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get all messages (for admin moderation)
router.get('/messages', async (req: AuthenticatedRequest, res) => {
  try {
    const allMessages = await db
      .select({
        id: messages.id,
        content: messages.content,
        userId: messages.userId,
        chatId: messages.chatId,
        createdAt: messages.createdAt,
        username: users.username,
        mediaUrl: messages.mediaUrl,
        mediaType: messages.mediaType,
        deleted: messages.deleted,
        deletedAt: messages.deletedAt,
      })
      .from(messages)
      .innerJoin(users, eq(messages.userId, users.id))
      .orderBy(messages.createdAt)
      .limit(100); // Limit for performance

    res.json(allMessages);
  } catch (error) {
    console.error('Get messages error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
