/**
 * Room Schedule Scheduler
 * Runs every 60 seconds, checks for due room_schedules, and creates multiplayer rooms.
 * Uses last_fired_at to prevent duplicate firing.
 */
const { sequelize } = require('../models');
const { startRoom } = require('../routes/multiplayerHelpers');

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

function pad(n) { return String(n).padStart(2, '0'); }

async function checkSchedules() {
  const now = new Date();
  const currentTime = `${pad(now.getHours())}:${pad(now.getMinutes())}`;
  const currentDay  = now.getDay();   // 0=Sun
  const currentDate = now.toISOString().split('T')[0]; // YYYY-MM-DD

  try {
    const [schedules] = await sequelize.query(
      "SELECT * FROM room_schedules WHERE is_active = 1"
    );

    for (const s of schedules) {
      const schedTime = s.schedule_time?.slice(0, 5); // HH:MM
      if (schedTime !== currentTime) continue;

      // Prevent re-firing within the same minute
      if (s.last_fired_at) {
        const lastFired = new Date(s.last_fired_at);
        const diffMins = (now - lastFired) / 60000;
        if (diffMins < 1) continue;
      }

      let shouldFire = false;
      if (s.schedule_type === 'daily') {
        shouldFire = true;
      } else if (s.schedule_type === 'weekly') {
        shouldFire = s.schedule_day === currentDay;
      } else if (s.schedule_type === 'once') {
        shouldFire = s.schedule_date === currentDate;
      }

      if (!shouldFire) continue;

      // Read defaults from app_settings
      const [settings] = await sequelize.query(
        "SELECT `key`, `value` FROM app_settings WHERE `key` IN ('multiplayer_min_players','multiplayer_default_max_players','multiplayer_start_threshold_percent')"
      );
      const set = settings.reduce((acc, r) => { acc[r.key] = r.value; return acc; }, {});

      const maxP   = s.max_players   || parseInt(set.multiplayer_default_max_players)   || 10;
      const minP   = s.min_players   || parseInt(set.multiplayer_min_players)            || 2;
      const thresh = s.start_threshold_percent || parseInt(set.multiplayer_start_threshold_percent) || 80;

      // Create the room
      const [result] = await sequelize.query(
        `INSERT INTO multiplayer_rooms (name, category_id, difficulty, max_players, min_players, start_threshold_percent)
         VALUES (?, ?, ?, ?, ?, ?)`,
        { replacements: [s.name, s.category_id, s.difficulty || null, maxP, minP, thresh] }
      );

      console.log(`[scheduler] Created room "${s.name}" (id=${result}) from schedule id=${s.id}`);

      // Update last_fired_at
      await sequelize.query(
        'UPDATE room_schedules SET last_fired_at = NOW() WHERE id = ?',
        { replacements: [s.id] }
      );

      // Deactivate 'once' schedules after firing
      if (s.schedule_type === 'once') {
        await sequelize.query(
          'UPDATE room_schedules SET is_active = 0 WHERE id = ?',
          { replacements: [s.id] }
        );
        console.log(`[scheduler] Deactivated one-time schedule id=${s.id}`);
      }
    }
  } catch (err) {
    console.error('[scheduler] Error:', err.message);
  }
}

function startScheduler() {
  console.log('⏰ Room scheduler started (checking every 60s)');
  checkSchedules(); // run immediately on startup
  setInterval(checkSchedules, 60000);
}

module.exports = { startScheduler, DAYS };
