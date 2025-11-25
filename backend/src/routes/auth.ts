import express from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { db, users, messages, chatParticipants, chats } from '../db';
import { eq, and } from 'drizzle-orm';
import { AuthenticatedRequest } from '../types';
import { authenticateToken } from '../middleware/auth';

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret';

// Helper function to ensure global chat exists and user is added to it
async function ensureGlobalChat(userId: number) {
  try {
    // Check if global chat exists
    let globalChat = await db
      .select()
      .from(chats)
      .where(eq(chats.type, 'global'))
      .limit(1);

    if (globalChat.length === 0) {
      // Create global chat
      globalChat = await db.insert(chats).values({
        name: 'Global Chat',
        type: 'global',
        createdAt: new Date(),
        createdBy: null, // System created
      }).returning();
    }

    // Check if user is already in global chat
    const existingParticipation = await db
      .select()
      .from(chatParticipants)
      .where(and(
        eq(chatParticipants.chatId, globalChat[0].id),
        eq(chatParticipants.userId, userId)
      ))
      .limit(1);

    if (existingParticipation.length === 0) {
      // Add user to global chat
      await db.insert(chatParticipants).values({
        chatId: globalChat[0].id,
        userId: userId,
        joinedAt: new Date(),
      });
    }
  } catch (error) {
    console.error('Error ensuring global chat:', error);
    // Don't throw error - registration should still succeed
  }
}

// Auth endpoints
router.post('/register', async (req, res) => {
  try {
    const { username, email, password } = req.body;

    if (!username || !email || !password) {
      return res.status(400).json({ error: 'Username, email, and password are required' });
    }

    // Check if user already exists
    const existingUser = await db.select().from(users).where(eq(users.email, email)).limit(1);
    if (existingUser.length > 0) {
      return res.status(400).json({ error: 'Email already registered' });
    }

    const existingUsername = await db.select().from(users).where(eq(users.username, username)).limit(1);
    if (existingUsername.length > 0) {
      return res.status(400).json({ error: 'Username already taken' });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user
    const newUser = await db.insert(users).values({
      username,
      email,
      password: hashedPassword,
      createdAt: new Date(),
    }).returning();

    // Create or join global chat
    await ensureGlobalChat(newUser[0].id);

    // Generate JWT token
    const token = jwt.sign(
      { id: newUser[0].id, username: newUser[0].username, email: newUser[0].email, role: newUser[0].role },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.status(201).json({
      user: { id: newUser[0].id, username: newUser[0].username, email: newUser[0].email, role: newUser[0].role },
      token
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    // Find user
    const userResult = await db.select().from(users).where(eq(users.email, email)).limit(1);
    if (userResult.length === 0) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const user = userResult[0];

    // Check password
    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Ensure user is in global chat (for existing users)
    await ensureGlobalChat(user.id);

    // Generate JWT token
    const token = jwt.sign(
      { id: user.id, username: user.username, email: user.email, role: user.role },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({
      user: { id: user.id, username: user.username, email: user.email, role: user.role },
      token
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.delete('/account', authenticateToken, async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user!.id;

    // First, delete all messages from this user
    await db.delete(messages).where(eq(messages.userId, userId));

    // Delete chat participations
    await db.delete(chatParticipants).where(eq(chatParticipants.userId, userId));

    // Delete chats created by this user 
    await db.update(chats).set({ createdBy: null }).where(eq(chats.createdBy, userId));

    // Finally, delete the user
    await db.delete(users).where(eq(users.id, userId));

    res.json({ message: 'Account deleted successfully' });
  } catch (error) {
    console.error('Delete account error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.put('/change-password', authenticateToken, async (req: AuthenticatedRequest, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: 'Current password and new password are required' });
    }

    // Get user with password
    const userResult = await db.select().from(users).where(eq(users.id, req.user!.id)).limit(1);
    if (userResult.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const user = userResult[0];

    // Verify current password
    const validPassword = await bcrypt.compare(currentPassword, user.password);
    if (!validPassword) {
      return res.status(401).json({ error: 'Current password is incorrect' });
    }

    // Hash new password
    const hashedNewPassword = await bcrypt.hash(newPassword, 10);

    // Update password
    await db.update(users).set({ password: hashedNewPassword }).where(eq(users.id, req.user!.id));

    res.json({ message: 'Password changed successfully' });
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
