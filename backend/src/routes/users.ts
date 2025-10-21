import express from 'express';
import { db, users } from '../db';
import { eq, not } from 'drizzle-orm';
import { AuthenticatedRequest } from '../types';

const router = express.Router();

router.get('/', async (req: AuthenticatedRequest, res) => {
  try {
    const userList = await db
      .select({
        id: users.id,
        username: users.username,
      })
      .from(users)
      .where(not(eq(users.id, req.user!.id)))
      .limit(20);

    res.json(userList);
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
