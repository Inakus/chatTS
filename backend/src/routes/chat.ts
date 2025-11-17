import express from 'express';
import multer from 'multer';
import path from 'path';
import { db, users, chats, chatParticipants, messages } from '../db';
import { eq, and, or } from 'drizzle-orm';
import { AuthenticatedRequest } from '../types';

// Store io instance for emitting events
let io: any;

export const setChatIO = (socketIO: any) => {
  io = socketIO;
};

const router = express.Router();

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/') && (file.mimetype === 'image/gif' || file.mimetype.startsWith('image/'))) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed!'));
    }
  }
});

// Chat endpoints
router.post('/', async (req: AuthenticatedRequest, res) => {
  try {
    const { name, participantIds, type = 'group' } = req.body;

    if (!participantIds || !Array.isArray(participantIds) || participantIds.length === 0) {
      return res.status(400).json({ error: 'At least one participant is required' });
    }

    // Add current user to participants
    const allParticipantIds = [...new Set([...participantIds, req.user!.id])];

    // For direct chats, ensure only 2 participants
    if (type === 'direct' && allParticipantIds.length !== 2) {
      return res.status(400).json({ error: 'Direct chats must have exactly 2 participants' });
    }

    // Check if direct chat already exists
    if (type === 'direct') {
      const existingChat = await db
        .select()
        .from(chatParticipants)
        .where(eq(chatParticipants.userId, allParticipantIds[0]))
        .then(async (participants) => {
          const chatIds = participants.map(p => p.chatId);
          const chatsWithBoth = await db
            .select()
            .from(chatParticipants)
            .where(and(
              eq(chatParticipants.userId, allParticipantIds[1]),
              or(...chatIds.map(id => eq(chatParticipants.chatId, id)))
            ));
          return chatsWithBoth.length > 0;
        });

      if (existingChat) {
        return res.status(400).json({ error: 'Direct chat already exists between these users' });
      }
    }

    // Create chat
    const newChat = await db.insert(chats).values({
      name: type === 'direct' ? null : name,
      type,
      createdAt: new Date(),
      createdBy: req.user!.id,
    }).returning();

    // Add participants
    const participantValues = allParticipantIds.map(userId => ({
      chatId: newChat[0].id,
      userId,
      joinedAt: new Date(),
    }));

    await db.insert(chatParticipants).values(participantValues);

    // Emit new chat event to all participants
    if (io) {
      const chatWithParticipants = {
        ...newChat[0],
        participants: allParticipantIds.map(id => ({ id })) // Simplified participants for real-time update
      };

      allParticipantIds.forEach(userId => {
        io.to(`user_${userId}`).emit('newChat', chatWithParticipants);
      });
    }

    res.status(201).json({
      chat: newChat[0],
      participants: allParticipantIds
    });
  } catch (error) {
    console.error('Create chat error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/', async (req: AuthenticatedRequest, res) => {
  try {
    const userChats = await db
      .select({
        id: chats.id,
        name: chats.name,
        type: chats.type,
        createdAt: chats.createdAt,
        createdBy: chats.createdBy,
      })
      .from(chatParticipants)
      .innerJoin(chats, eq(chatParticipants.chatId, chats.id))
      .where(eq(chatParticipants.userId, req.user!.id))
      .orderBy(chats.createdAt);

    // Get participants for each chat
    const chatsWithParticipants = await Promise.all(
      userChats.map(async (chat) => {
        const participants = await db
          .select({
            id: users.id,
            username: users.username,
          })
          .from(chatParticipants)
          .innerJoin(users, eq(chatParticipants.userId, users.id))
          .where(eq(chatParticipants.chatId, chat.id));

        return {
          ...chat,
          participants,
        };
      })
    );

    res.json(chatsWithParticipants);
  } catch (error) {
    console.error('Get chats error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/:chatId/messages', async (req: AuthenticatedRequest, res) => {
  try {
    const { chatId } = req.params;

    // Check if user is participant in the chat
    const isParticipant = await db
      .select()
      .from(chatParticipants)
      .where(and(
        eq(chatParticipants.chatId, parseInt(chatId)),
        eq(chatParticipants.userId, req.user!.id)
      ))
      .limit(1);

    if (isParticipant.length === 0) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const messagesList = await db
      .select({
        id: messages.id,
        content: messages.content,
        userId: messages.userId,
        chatId: messages.chatId,
        createdAt: messages.createdAt,
        username: users.username,
        mediaUrl: messages.mediaUrl,
        mediaType: messages.mediaType,
      })
      .from(messages)
      .innerJoin(users, eq(messages.userId, users.id))
      .where(eq(messages.chatId, parseInt(chatId)))
      .orderBy(messages.createdAt);

    res.json(messagesList);
  } catch (error) {
    console.error('Get messages error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Upload media endpoint
router.post('/:chatId/upload', upload.single('media'), async (req: AuthenticatedRequest, res) => {
  try {
    const { chatId } = req.params;
    const { content } = req.body;

    // Check if user is participant in the chat
    const isParticipant = await db
      .select()
      .from(chatParticipants)
      .where(and(
        eq(chatParticipants.chatId, parseInt(chatId)),
        eq(chatParticipants.userId, req.user!.id)
      ))
      .limit(1);

    if (isParticipant.length === 0) {
      return res.status(403).json({ error: 'Access denied' });
    }

    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const mediaType = req.file.mimetype === 'image/gif' ? 'gif' : 'image';
    const mediaUrl = `/uploads/${req.file.filename}`;

    // Create message with media
    const newMessage = await db.insert(messages).values({
      content: content || '',
      userId: req.user!.id,
      chatId: parseInt(chatId),
      createdAt: new Date(),
      mediaUrl,
      mediaType,
    }).returning();

    // Get the message with username
    const messageWithUser = await db
      .select({
        id: messages.id,
        content: messages.content,
        userId: messages.userId,
        chatId: messages.chatId,
        createdAt: messages.createdAt,
        username: users.username,
        mediaUrl: messages.mediaUrl,
        mediaType: messages.mediaType,
      })
      .from(messages)
      .innerJoin(users, eq(messages.userId, users.id))
      .where(eq(messages.id, newMessage[0].id))
      .limit(1);

    // Emit new message to all participants in the chat
    if (io) {
      io.to(`chat_${chatId}`).emit('newMessage', messageWithUser[0]);
    }

    res.status(201).json(messageWithUser[0]);
  } catch (error) {
    console.error('Upload media error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
