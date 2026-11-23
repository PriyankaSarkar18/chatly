import bcrypt from 'bcryptjs';
import { closePool, execute, query, queryOne } from '../config/db.js';

const DEMO_PASSWORD = 'password123';

const demoUsers = [
  {
    name: 'Ayesha Khan',
    username: 'ayesha',
    email: 'ayesha@example.com',
    phone: '+91 90000 00001',
    about: 'Designing pixels, drinking chai ☕',
    avatar_url: 'https://i.pravatar.cc/240?img=47',
  },
  {
    name: 'Rohan Mehta',
    username: 'rohan',
    email: 'rohan@example.com',
    phone: '+91 90000 00002',
    about: 'Full-stack dev. Available for coffee.',
    avatar_url: 'https://i.pravatar.cc/240?img=12',
  },
  {
    name: 'Neha Verma',
    username: 'neha',
    email: 'neha@example.com',
    phone: '+91 90000 00003',
    about: 'Travel, books & lo-fi beats.',
    avatar_url: 'https://i.pravatar.cc/240?img=32',
  },
  {
    name: 'Imran Shaikh',
    username: 'imran',
    email: 'imran@example.com',
    phone: '+91 90000 00004',
    about: 'Building things on the internet.',
    avatar_url: 'https://i.pravatar.cc/240?img=15',
  },
];

const seed = async () => {
  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 10);
  const ids = {};

  for (const user of demoUsers) {
    const existing = await queryOne('SELECT id FROM users WHERE email = ? OR username = ?', [user.email, user.username]);
    if (existing) {
      ids[user.username] = existing.id;
      continue;
    }

    const result = await execute(
      `INSERT INTO users (name, username, email, phone, password_hash, about, avatar_url)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [user.name, user.username, user.email, user.phone, passwordHash, user.about, user.avatar_url]
    );
    ids[user.username] = result.insertId;
    await execute('INSERT INTO user_settings (user_id) VALUES (?)', [result.insertId]);
  }

  const [ayesha, rohan, neha, imran] = ['ayesha', 'rohan', 'neha', 'imran'].map((key) => ids[key]);

  // Direct chat: Ayesha <-> Rohan
  const direct = await queryOne(
    `SELECT c.id FROM conversations c
     JOIN conversation_members m1 ON m1.conversation_id = c.id AND m1.user_id = ?
     JOIN conversation_members m2 ON m2.conversation_id = c.id AND m2.user_id = ?
     WHERE c.type = 'direct' LIMIT 1`,
    [ayesha, rohan]
  );

  let conversationId = direct?.id;
  if (!conversationId) {
    const created = await execute(
      "INSERT INTO conversations (type, created_by, last_message_at) VALUES ('direct', ?, NOW())",
      [rohan]
    );
    conversationId = created.insertId;
    await execute(
      "INSERT INTO conversation_members (conversation_id, user_id, role) VALUES (?, ?, 'member'), (?, ?, 'member')",
      [conversationId, ayesha, conversationId, rohan]
    );

    const messages = [
      [rohan, 'Hey! Did you get the new UI files? 👋'],
      [ayesha, 'Just downloaded them. The glass effect looks so clean.'],
      [rohan, 'Right? I added the socket layer today, messages are instant.'],
      [ayesha, 'Perfect. Can we do a quick call at 5?'],
      [rohan, 'Works for me. I will ping you here.'],
    ];
    for (const [senderId, body] of messages) {
      await execute('INSERT INTO messages (conversation_id, sender_id, type, body) VALUES (?, ?, "text", ?)', [
        conversationId,
        senderId,
        body,
      ]);
    }
  }

  // Group chat
  const group = await queryOne("SELECT id FROM conversations WHERE type = 'group' AND name = 'Product Squad' LIMIT 1");
  if (!group) {
    const created = await execute(
      "INSERT INTO conversations (type, name, created_by, last_message_at) VALUES ('group', 'Product Squad', ?, NOW())",
      [ayesha]
    );
    const groupId = created.insertId;
    for (const memberId of [ayesha, rohan, neha, imran]) {
      await execute(
        'INSERT INTO conversation_members (conversation_id, user_id, role) VALUES (?, ?, ?)',
        [groupId, memberId, memberId === ayesha ? 'admin' : 'member']
      );
    }
    const groupMessages = [
      [neha, 'Morning team! Standup notes are in the doc.'],
      [imran, 'I will finish the call module today.'],
      [ayesha, 'Amazing. Let us ship the beta on Friday 🚀'],
    ];
    for (const [senderId, body] of groupMessages) {
      await execute('INSERT INTO messages (conversation_id, sender_id, type, body) VALUES (?, ?, "text", ?)', [
        groupId,
        senderId,
        body,
      ]);
    }
  }

  const existingStatus = await queryOne('SELECT id FROM statuses WHERE user_id = ? LIMIT 1', [neha]);
  if (!existingStatus) {
    await execute(
      `INSERT INTO statuses (user_id, type, content, media_url, background_color, expires_at)
       VALUES (?, 'image', 'Golden hour at the beach 🌅', 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=900&q=80', '#00a884', DATE_ADD(NOW(), INTERVAL 24 HOUR))`,
      [neha]
    );
    await execute(
      `INSERT INTO statuses (user_id, type, content, background_color, expires_at)
       VALUES (?, 'text', 'Shipping something new today 👀', '#7c3aed', DATE_ADD(NOW(), INTERVAL 24 HOUR))`,
      [imran]
    );
  }

  await query('SELECT 1');
  console.log('✓ Seed complete');
  console.log(`  Demo accounts (password: ${DEMO_PASSWORD})`);
  demoUsers.forEach((user) => console.log(`   • ${user.email}`));
};

seed()
  .then(async () => {
    await closePool();
  })
  .catch(async (error) => {
    console.error('✗ Seed failed:', error.message);
    await closePool().catch(() => {});
    process.exit(1);
  });
