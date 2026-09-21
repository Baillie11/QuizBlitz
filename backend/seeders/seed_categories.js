/**
 * Seed: inserts the 4 default categories and the OpenTDB question source.
 * Run: npm run seed  (from the backend/ directory)
 */
require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const { sequelize, Category, QuestionSource } = require('../src/models');

const CATEGORIES = [
  { name: 'General Knowledge', slug: 'general-knowledge', external_id: 9,  is_enabled: true },
  { name: 'Movies',            slug: 'movies',            external_id: 11, is_enabled: true },
  { name: 'Music',             slug: 'music',             external_id: 12, is_enabled: true },
  { name: 'Sports',            slug: 'sports',            external_id: 21, is_enabled: true },
];

const SOURCES = [
  {
    name: 'OpenTDB',
    base_url: 'https://opentdb.com',
    notes: 'Open Trivia Database – free, no API key required. Max 50 questions per call. CC BY-SA 4.0.',
  },
];

async function seed() {
  await sequelize.authenticate();
  await sequelize.sync({ alter: false });

  for (const cat of CATEGORIES) {
    const [, created] = await Category.findOrCreate({ where: { slug: cat.slug }, defaults: cat });
    console.log(`  Category "${cat.name}" ${created ? 'created' : 'already exists'}`);
  }

  for (const src of SOURCES) {
    const [, created] = await QuestionSource.findOrCreate({ where: { name: src.name }, defaults: src });
    console.log(`  Source "${src.name}" ${created ? 'created' : 'already exists'}`);
  }

  await sequelize.close();
  console.log('\n✅ Seeding complete.');
}

seed().catch((err) => {
  console.error('❌ Seeding failed:', err);
  process.exit(1);
});
