const fetch = require('node-fetch');
const crypto = require('crypto');

const BASE_URL = process.env.TRIVIA_API_BASE_URL || 'https://opentdb.com';

/**
 * Decode percent-encoded strings returned by OpenTDB when using url3986 encoding.
 * Falls back to the raw string if decoding fails.
 */
function decode(str) {
  try {
    return decodeURIComponent(str);
  } catch {
    return str;
  }
}

/**
 * Compute a SHA-256 hash of "<sourceId>:<questionText>".
 * Used as a deduplication key so we never store the same question twice.
 * @param {number|string} sourceId
 * @param {string} questionText
 * @returns {string} 64-char hex digest
 */
function questionHash(sourceId, questionText) {
  return crypto.createHash('sha256').update(`${sourceId}:${questionText}`).digest('hex');
}

/**
 * Fetch questions from the Open Trivia Database.
 *
 * OpenTDB docs: https://opentdb.com/api_config.php
 * – No API key required.
 * – Max 50 questions per call.
 * – Rate limited to 1 request per 5 seconds per IP.
 *
 * @param {object}  opts
 * @param {number}  opts.externalCategoryId  OpenTDB category ID (e.g. 21 = Sports)
 * @param {string}  [opts.difficulty]         'easy' | 'medium' | 'hard'
 * @param {number}  [opts.amount=10]          1–50
 * @returns {Promise<Array<{question_text, correct_answer, incorrect_answers, difficulty, category_name}>>}
 */
async function fetchFromOpenTDB({ externalCategoryId, difficulty, amount = 10 }) {
  const url = new URL('/api.php', BASE_URL);
  url.searchParams.set('amount', Math.min(amount, 50));
  url.searchParams.set('encode', 'url3986');
  url.searchParams.set('type', 'multiple');
  if (externalCategoryId) url.searchParams.set('category', externalCategoryId);
  if (difficulty) url.searchParams.set('difficulty', difficulty);

  const res = await fetch(url.toString());
  if (!res.ok) throw new Error(`OpenTDB HTTP error: ${res.status}`);

  const data = await res.json();

  // Response codes: 0 = OK, 1 = not enough questions, 2 = bad param, 5 = rate limit
  if (data.response_code === 1) return []; // not enough questions – return empty, caller handles
  if (data.response_code === 5) throw new Error('OpenTDB rate limit hit – wait 5 seconds and retry');
  if (data.response_code !== 0)
    throw new Error(`OpenTDB error (response_code=${data.response_code})`);

  return data.results.map((q) => ({
    question_text: decode(q.question),
    correct_answer: decode(q.correct_answer),
    incorrect_answers: q.incorrect_answers.map(decode),
    difficulty: q.difficulty.toLowerCase(),
    category_name: decode(q.category),
  }));
}

/**
 * Normalise a raw question object into a DB-ready record.
 * @param {{ raw, categoryId, sourceId }} opts
 * @returns {object} ready for Question.create / findOrCreate
 */
function normalizeQuestion({ raw, categoryId, sourceId }) {
  return {
    category_id: categoryId,
    source_id: sourceId,
    external_ref: null,
    question_text: raw.question_text,
    question_text_hash: questionHash(sourceId, raw.question_text),
    difficulty: raw.difficulty,
    correct_answer: raw.correct_answer,
    incorrect_answers_json: raw.incorrect_answers,
  };
}

module.exports = { fetchFromOpenTDB, normalizeQuestion, questionHash };
