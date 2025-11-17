import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';

export const users = sqliteTable('users', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  username: text('username').notNull().unique(),
  email: text('email').notNull().unique(),
  password: text('password').notNull(),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
});

export const chats = sqliteTable('chats', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name'),
  type: text('type').notNull(), // 'direct' or 'group'
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  createdBy: integer('created_by').references(() => users.id),
});

export const chatParticipants = sqliteTable('chat_participants', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  chatId: integer('chat_id').references(() => chats.id).notNull(),
  userId: integer('user_id').references(() => users.id).notNull(),
  joinedAt: integer('joined_at', { mode: 'timestamp' }).notNull(),
});

export const messages = sqliteTable('messages', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  content: text('content').notNull(),
  userId: integer('user_id').references(() => users.id).notNull(),
  chatId: integer('chat_id').references(() => chats.id).notNull(),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  mediaUrl: text('media_url'),
  mediaType: text('media_type'), // 'image' or 'gif'
});
