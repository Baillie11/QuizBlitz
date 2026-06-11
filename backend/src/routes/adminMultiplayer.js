const router = require('express').Router();
const { sequelize } = require('../models');
const adminJwt = require('../middleware/adminJwt');
const { startRoom } = require('./multiplayerHelpers');

// GET /admin/multiplayer/rooms – all rooms
router.get('/rooms', adminJwt, async (req, res) => {
  try {
    const [rows] = await sequelize.query(
      `SELECT mr.*, c.name as category_name, c.slug as category_slug, COUNT(mrp.id) as player_count
       FROM multiplayer_rooms mr
       JOIN categories c ON c.id = mr.category_id
       LEFT JOIN multiplayer_room_players mrp ON mrp.room_id = mr.id
       GROUP BY mr.id
       ORDER BY mr.created_at DESC`
    );
    return res.json({ rooms: rows.map((r) => ({ ...r, player_count: parseInt(r.player_count) })) });
  } catch (err) {
    console.error('[admin/multiplayer/rooms GET]', err);
    return res.status(500).json({ error: 'Failed to fetch rooms' });
  }
});

// POST /admin/multiplayer/rooms – create room
router.post('/rooms', adminJwt, async (req, res) => {
  const { name, category_id, difficulty, max_players, min_players, start_threshold_percent } = req.body;
  if (!name || !category_id) return res.status(400).json({ error: 'name and category_id are required' });

  try {
    // Read defaults from app_settings if not provided
    const [settings] = await sequelize.query(
      "SELECT `key`, `value` FROM app_settings WHERE `key` IN ('multiplayer_min_players','multiplayer_default_max_players','multiplayer_start_threshold_percent')"
    );
    const s = settings.reduce((acc, r) => { acc[r.key] = r.value; return acc; }, {});

    const maxP   = parseInt(max_players)               || parseInt(s.multiplayer_default_max_players)   || 10;
    const minP   = parseInt(min_players)               || parseInt(s.multiplayer_min_players)            || 2;
    const thresh = parseInt(start_threshold_percent)   || parseInt(s.multiplayer_start_threshold_percent) || 80;

    const [result] = await sequelize.query(
      `INSERT INTO multiplayer_rooms (name, category_id, difficulty, max_players, min_players, start_threshold_percent)
       VALUES (?, ?, ?, ?, ?, ?)`,
      { replacements: [name, parseInt(category_id), difficulty || null, maxP, minP, thresh] }
    );
    const [[room]] = await sequelize.query(
      'SELECT mr.*, c.name as category_name FROM multiplayer_rooms mr JOIN categories c ON c.id = mr.category_id WHERE mr.id = ?',
      { replacements: [result] }
    );
    return res.status(201).json({ room });
  } catch (err) {
    console.error('[admin/multiplayer/rooms POST]', err);
    return res.status(500).json({ error: 'Failed to create room' });
  }
});

// PUT /admin/multiplayer/rooms/:id – edit room (waiting only)
router.put('/rooms/:id', adminJwt, async (req, res) => {
  const { name, category_id, difficulty, max_players, min_players, start_threshold_percent } = req.body;
  const roomId = parseInt(req.params.id);
  try {
    const [[room]] = await sequelize.query('SELECT * FROM multiplayer_rooms WHERE id = ?', { replacements: [roomId] });
    if (!room) return res.status(404).json({ error: 'Room not found' });
    if (room.status !== 'waiting') return res.status(409).json({ error: 'Can only edit waiting rooms' });
    await sequelize.query(
      `UPDATE multiplayer_rooms SET name=?, category_id=?, difficulty=?, max_players=?, min_players=?, start_threshold_percent=? WHERE id=?`,
      { replacements: [
          name ?? room.name,
          category_id ? parseInt(category_id) : room.category_id,
          difficulty !== undefined ? (difficulty || null) : room.difficulty,
          max_players ? parseInt(max_players) : room.max_players,
          min_players ? parseInt(min_players) : room.min_players,
          start_threshold_percent ? parseInt(start_threshold_percent) : room.start_threshold_percent,
          roomId,
        ]
      }
    );
    const [[updated]] = await sequelize.query(
      'SELECT mr.*, c.name as category_name, c.slug as category_slug FROM multiplayer_rooms mr JOIN categories c ON c.id = mr.category_id WHERE mr.id = ?',
      { replacements: [roomId] }
    );
    return res.json({ room: updated });
  } catch (err) {
    console.error('[admin/multiplayer/rooms PUT]', err);
    return res.status(500).json({ error: 'Failed to update room' });
  }
});

// POST /admin/multiplayer/rooms/:id/start – force start
router.post('/rooms/:id/start', adminJwt, async (req, res) => {
  const roomId = parseInt(req.params.id);
  try {
    const [[room]] = await sequelize.query(
      'SELECT * FROM multiplayer_rooms WHERE id = ?', { replacements: [roomId] }
    );
    if (!room) return res.status(404).json({ error: 'Room not found' });
    if (room.status !== 'waiting') return res.status(409).json({ error: 'Room is not in waiting status' });

    await startRoom(roomId, sequelize);
    return res.json({ message: 'Room started' });
  } catch (err) {
    console.error('[admin/multiplayer/start]', err);
    return res.status(500).json({ error: err.message || 'Failed to start room' });
  }
});

// DELETE /admin/multiplayer/rooms/:id – cancel or hard-delete
// ?hard=true to permanently delete (removes players too via CASCADE)
router.delete('/rooms/:id', adminJwt, async (req, res) => {
  try {
    const [[room]] = await sequelize.query(
      'SELECT * FROM multiplayer_rooms WHERE id = ?', { replacements: [parseInt(req.params.id)] }
    );
    if (!room) return res.status(404).json({ error: 'Room not found' });
    if (req.query.hard === 'true') {
      await sequelize.query('DELETE FROM multiplayer_rooms WHERE id = ?', { replacements: [parseInt(req.params.id)] });
      return res.json({ message: 'Room deleted' });
    }
    await sequelize.query(
      "UPDATE multiplayer_rooms SET status = 'cancelled' WHERE id = ?",
      { replacements: [parseInt(req.params.id)] }
    );
    return res.json({ message: 'Room cancelled' });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to delete room' });
  }
});

// ── Schedules CRUD ─────────────────────────────────────────────────────────────

// GET /admin/multiplayer/schedules
router.get('/schedules', adminJwt, async (req, res) => {
  try {
    const [rows] = await sequelize.query(
      `SELECT rs.*, c.name as category_name
       FROM room_schedules rs
       JOIN categories c ON c.id = rs.category_id
       ORDER BY rs.created_at DESC`
    );
    return res.json({ schedules: rows });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to fetch schedules' });
  }
});

// POST /admin/multiplayer/schedules
router.post('/schedules', adminJwt, async (req, res) => {
  const { name, category_id, difficulty, max_players, min_players, start_threshold_percent,
          schedule_type, schedule_time, schedule_day, schedule_date } = req.body;
  if (!name || !category_id || !schedule_type || !schedule_time)
    return res.status(400).json({ error: 'name, category_id, schedule_type, schedule_time are required' });
  if (schedule_type === 'weekly' && schedule_day == null)
    return res.status(400).json({ error: 'schedule_day is required for weekly schedules' });
  if (schedule_type === 'once' && !schedule_date)
    return res.status(400).json({ error: 'schedule_date is required for one-time schedules' });
  try {
    const [settings] = await sequelize.query(
      "SELECT `key`, `value` FROM app_settings WHERE `key` IN ('multiplayer_min_players','multiplayer_default_max_players','multiplayer_start_threshold_percent')"
    );
    const s = settings.reduce((acc, r) => { acc[r.key] = r.value; return acc; }, {});
    const maxP   = parseInt(max_players)             || parseInt(s.multiplayer_default_max_players)   || 10;
    const minP   = parseInt(min_players)             || parseInt(s.multiplayer_min_players)            || 2;
    const thresh = parseInt(start_threshold_percent) || parseInt(s.multiplayer_start_threshold_percent) || 80;

    const [result] = await sequelize.query(
      `INSERT INTO room_schedules
         (name, category_id, difficulty, max_players, min_players, start_threshold_percent,
          schedule_type, schedule_time, schedule_day, schedule_date)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      { replacements: [
          name, parseInt(category_id), difficulty || null, maxP, minP, thresh,
          schedule_type, schedule_time,
          schedule_day != null ? parseInt(schedule_day) : null,
          schedule_date || null,
        ]
      }
    );
    const [[sched]] = await sequelize.query(
      'SELECT rs.*, c.name as category_name FROM room_schedules rs JOIN categories c ON c.id = rs.category_id WHERE rs.id = ?',
      { replacements: [result] }
    );
    return res.status(201).json({ schedule: sched });
  } catch (err) {
    console.error('[admin/schedules POST]', err);
    return res.status(500).json({ error: 'Failed to create schedule' });
  }
});

// PUT /admin/multiplayer/schedules/:id  (toggle is_active or full update)
router.put('/schedules/:id', adminJwt, async (req, res) => {
  const { name, category_id, difficulty, max_players, min_players, start_threshold_percent,
          schedule_type, schedule_time, schedule_day, schedule_date, is_active } = req.body;
  try {
    const [[sched]] = await sequelize.query(
      'SELECT * FROM room_schedules WHERE id = ?', { replacements: [parseInt(req.params.id)] }
    );
    if (!sched) return res.status(404).json({ error: 'Schedule not found' });

    await sequelize.query(
      `UPDATE room_schedules SET
         name = ?, category_id = ?, difficulty = ?, max_players = ?, min_players = ?,
         start_threshold_percent = ?, schedule_type = ?, schedule_time = ?,
         schedule_day = ?, schedule_date = ?, is_active = ?
       WHERE id = ?`,
      { replacements: [
          name              ?? sched.name,
          category_id       ? parseInt(category_id) : sched.category_id,
          difficulty        !== undefined ? (difficulty || null) : sched.difficulty,
          max_players       ? parseInt(max_players)   : sched.max_players,
          min_players       ? parseInt(min_players)   : sched.min_players,
          start_threshold_percent ? parseInt(start_threshold_percent) : sched.start_threshold_percent,
          schedule_type     ?? sched.schedule_type,
          schedule_time     ?? sched.schedule_time,
          schedule_day      != null ? parseInt(schedule_day) : sched.schedule_day,
          schedule_date     !== undefined ? (schedule_date || null) : sched.schedule_date,
          is_active         !== undefined ? (is_active ? 1 : 0) : sched.is_active,
          parseInt(req.params.id),
        ]
      }
    );
    const [[updated]] = await sequelize.query(
      'SELECT rs.*, c.name as category_name FROM room_schedules rs JOIN categories c ON c.id = rs.category_id WHERE rs.id = ?',
      { replacements: [parseInt(req.params.id)] }
    );
    return res.json({ schedule: updated });
  } catch (err) {
    console.error('[admin/schedules PUT]', err);
    return res.status(500).json({ error: 'Failed to update schedule' });
  }
});

// DELETE /admin/multiplayer/schedules/:id
router.delete('/schedules/:id', adminJwt, async (req, res) => {
  try {
    await sequelize.query('DELETE FROM room_schedules WHERE id = ?', { replacements: [parseInt(req.params.id)] });
    return res.json({ message: 'Schedule deleted' });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to delete schedule' });
  }
});

module.exports = router;
