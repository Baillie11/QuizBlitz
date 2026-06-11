const { fetchFromOpenTDB, normalizeQuestion } = require('./triviaProvider');
const { Question, Category, QuestionSource } = require('../models');

/**
 * Ingest questions from OpenTDB into our MySQL database.
 *
 * @param {object}  opts
 * @param {string}  opts.categorySlug  Our internal slug (e.g. 'sports')
 * @param {string}  [opts.difficulty]  'easy' | 'medium' | 'hard' | undefined (any)
 * @param {number}  [opts.amount=50]   How many to request from the API (max 50 per call)
 * @returns {Promise<{ inserted: number, skipped: number }>}
 */
async function ingestQuestions({ categorySlug, difficulty, amount = 50 }) {
  const category = await Category.findOne({ where: { slug: categorySlug } });
  if (!category) throw new Error(`Category not found: ${categorySlug}`);
  if (!category.external_id)
    throw new Error(`Category '${categorySlug}' has no external_id – cannot ingest from OpenTDB`);

  const source = await QuestionSource.findOne({ where: { name: 'OpenTDB' } });
  if (!source)
    throw new Error('"OpenTDB" question source not found. Run: npm run seed');

  const rawQuestions = await fetchFromOpenTDB({
    externalCategoryId: category.external_id,
    difficulty,
    amount,
  });

  if (!rawQuestions.length) return { inserted: 0, skipped: 0 };

  let inserted = 0;
  let skipped = 0;

  for (const raw of rawQuestions) {
    const record = normalizeQuestion({ raw, categoryId: category.id, sourceId: source.id });
    const [, created] = await Question.findOrCreate({
      where: {
        source_id: record.source_id,
        question_text_hash: record.question_text_hash,
      },
      defaults: record,
    });
    created ? inserted++ : skipped++;
  }

  return { inserted, skipped };
}

/**
 * Ensure at least `amount` questions exist in the DB for a given category/difficulty.
 * Automatically ingests from OpenTDB if the count is below the threshold.
 *
 * Called inside POST /game/start before fetching questions.
 */
async function ensureQuestions({ categoryId, difficulty, amount }) {
  const where = { category_id: categoryId };
  if (difficulty) where.difficulty = difficulty;

  const count = await Question.count({ where });
  if (count >= amount) return; // we have enough, nothing to do

  const category = await Category.findByPk(categoryId);
  if (!category || !category.external_id) return; // can't auto-ingest without external ID

  const needed = Math.max(50, amount - count); // request at least 50 to build up a buffer
  try {
    await ingestQuestions({ categorySlug: category.slug, difficulty, amount: needed });
  } catch (err) {
    // Non-fatal: log and continue. The game may start with fewer questions than requested.
    console.warn('[ensureQuestions] Auto-ingest failed:', err.message);
  }
}

module.exports = { ingestQuestions, ensureQuestions };
