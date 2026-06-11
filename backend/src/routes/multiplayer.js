const router = require('express').Router();
const { sequelize } = require('../models');
const { optionalAuth } = require('../middleware/auth');
const { startRoom } = require('./multiplayerHelpers');

async function getRoomWithPlayers(roomId) {
  const [[room]] = await sequelize.query(
    `SELECT mr.*, c.name as category_name, c.slug as category_slug
     FROM multiplayer_rooms mr
     JOIN categories c ON c.id = mr.category_id
     WHERE mr.id = ?`,
    { replacements: [roomId] }
  );
  if (!room) return null;

  const [players] = await sequelize.query(
    `SELECT id, display_name, score, answered_count, finished_at, joined_at
     FROM multiplayer_room_players WHERE room_id = ? ORDER BY score DESC, joined_at ASC`,
    { replacements: [roomId] }
  );

  const threshold = Math.ceil(room.max_players * room.start_threshold_percent / 100);
  const needed = Math.max(0, Math.max(room.min_players, threshold) - players.length);

  return {
    ...room,
    players,
    player_count: players.length,
    threshold,
    needed_to_start: needed,
    questions_json: room.status === 'in_progress' || room.status === 'completed'
      ? (typeof room.questions_json === 'string' ? JSON.parse(room.questions_json) : room.questions_json)
      : undefined,
  };
}

// ── Routes ────────────────────────────────────────────────────────────────

// GET /multiplayer/rooms – list open rooms
router.get('/rooms', async (req, res) => {
  try {
    const [rows] = await sequelize.query(
      `SELECT mr.id, mr.name, mr.max_players, mr.min_players, mr.start_threshold_percent, mr.status,
              mr.difficulty, mr.created_at,
              c.name as category_name, c.slug as category_slug,
              COUNT(mrp.id) as player_count
       FROM multiplayer_rooms mr
       JOIN categories c ON c.id = mr.category_id
       LEFT JOIN multiplayer_room_players mrp ON mrp.room_id = mr.id
       WHERE mr.status = 'waiting'
       GROUP BY mr.id
       ORDER BY mr.created_at DESC`
    );
    const rooms = rows.map((r) => ({
      ...r,
      player_count: parseInt(r.player_count),
      threshold: Math.ceil(r.max_players * r.start_threshold_percent / 100),
    }));
    return res.json({ rooms });
  } catch (err) {
    console.error('[multiplayer/rooms GET]', err);
    return res.status(500).json({ error: 'Failed to fetch rooms' });
  }
});

// GET /multiplayer/rooms/:id – room state + players (for polling)
router.get('/rooms/:id', async (req, res) => {
  try {
    const room = await getRoomWithPlayers(parseInt(req.params.id));
    if (!room) return res.status(404).json({ error: 'Room not found' });
    return res.json({ room });
  } catch (err) {
    console.error('[multiplayer/rooms/:id GET]', err);
    return res.status(500).json({ error: 'Failed to fetch room' });
  }
});

// POST /multiplayer/rooms/:id/join – join a room
router.post('/rooms/:id/join', optionalAuth, async (req, res) => {
  const { displayName } = req.body;
  const roomId = parseInt(req.params.id);
  try {
    const [[room]] = await sequelize.query(
      'SELECT * FROM multiplayer_rooms WHERE id = ?', { replacements: [roomId] }
    );
    if (!room) return res.status(404).json({ error: 'Room not found' });
    if (room.status !== 'waiting') return res.status(409).json({ error: 'This game has already started' });

    const [[countRow]] = await sequelize.query(
      'SELECT COUNT(*) as cnt FROM multiplayer_room_players WHERE room_id = ?', { replacements: [roomId] }
    );
    const playerCount = parseInt(countRow.cnt);
    if (playerCount >= room.max_players) return res.status(409).json({ error: 'Room is full' });

    const name = req.user?.display_name || req.user?.displayName || displayName || 'Guest';
    const userId = req.user?.id || null;

    const [result] = await sequelize.query(
      'INSERT INTO multiplayer_room_players (room_id, user_id, display_name) VALUES (?, ?, ?)',
      { replacements: [roomId, userId, name] }
    );
    const playerId = result;

    // Check auto-start threshold
    const newCount = playerCount + 1;
    const threshold = Math.ceil(room.max_players * room.start_threshold_percent / 100);
    const shouldStart = newCount >= room.min_players &&
      (newCount >= room.max_players || newCount >= threshold);
    if (shouldStart) await startRoom(roomId, sequelize);

    const roomState = await getRoomWithPlayers(roomId);
    return res.status(201).json({ playerId, room: roomState });
  } catch (err) {
    console.error('[multiplayer/join]', err);
    return res.status(500).json({ error: 'Failed to join room' });
  }
});

// POST /multiplayer/rooms/:id/answer – update running score
router.post('/rooms/:id/answer', async (req, res) => {
  const { playerId, score } = req.body;
  if (!playerId) return res.status(400).json({ error: 'playerId is required' });
  try {
    await sequelize.query(
      `UPDATE multiplayer_room_players
       SET score = ?, answered_count = answered_count + 1
       WHERE id = ? AND room_id = ?`,
      { replacements: [score, playerId, parseInt(req.params.id)] }
    );
    return res.json({ ok: true });
  } catch (err) {
    console.error('[multiplayer/answer]', err);
    return res.status(500).json({ error: 'Failed to record answer' });
  }
});

// POST /multiplayer/rooms/:id/finish – player finished all questions
router.post('/rooms/:id/finish', async (req, res) => {
  const { playerId, score } = req.body;
  if (!playerId) return res.status(400).json({ error: 'playerId is required' });
  const roomId = parseInt(req.params.id);
  try {
    await sequelize.query(
      `UPDATE multiplayer_room_players SET score = ?, finished_at = NOW() WHERE id = ? AND room_id = ?`,
      { replacements: [score, playerId, roomId] }
    );

    // If all players finished, mark room as completed
    const [[room]] = await sequelize.query(
      'SELECT * FROM multiplayer_rooms WHERE id = ?', { replacements: [roomId] }
    );
    const [[countRow]] = await sequelize.query(
      'SELECT COUNT(*) as total, SUM(finished_at IS NOT NULL) as done FROM multiplayer_room_players WHERE room_id = ?',
      { replacements: [roomId] }
    );
    if (parseInt(countRow.done) >= parseInt(countRow.total) && room.status === 'in_progress') {
      await sequelize.query(
        "UPDATE multiplayer_rooms SET status = 'completed' WHERE id = ?", { replacements: [roomId] }
      );
    }
    return res.json({ ok: true });
  } catch (err) {
    console.error('[multiplayer/finish]', err);
    return res.status(500).json({ error: 'Failed to record finish' });
  }
});

module.exports = router;
