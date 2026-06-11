function shuffleArray(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

async function startRoom(roomId, sequelize) {
  const [[room]] = await sequelize.query(
    'SELECT * FROM multiplayer_rooms WHERE id = ?', { replacements: [roomId] }
  );
  if (!room) throw new Error('Room not found');

  const [rows] = await sequelize.query(
    `SELECT q.* FROM questions q
     WHERE q.category_id = ? ${room.difficulty ? 'AND q.difficulty = ?' : ''}
     ORDER BY RAND() LIMIT 10`,
    { replacements: room.difficulty ? [room.category_id, room.difficulty] : [room.category_id] }
  );

  const formatted = rows.map((q) => {
    const incorrectAnswers = Array.isArray(q.incorrect_answers_json)
      ? q.incorrect_answers_json
      : (() => { try { return JSON.parse(q.incorrect_answers_json); } catch { return []; } })();
    return {
      id: q.id,
      question: q.question_text,
      options: shuffleArray([q.correct_answer, ...incorrectAnswers]),
      difficulty: q.difficulty,
      points: q.points || 2,
      correct_answer: q.correct_answer,
    };
  });

  await sequelize.query(
    "UPDATE multiplayer_rooms SET status = 'in_progress', questions_json = ?, started_at = NOW() WHERE id = ?",
    { replacements: [JSON.stringify(formatted), roomId] }
  );
}

module.exports = { startRoom, shuffleArray };
