#!/usr/bin/env node
/**
 * Seeds all 24 OpenTDB categories into the categories table.
 * Safe to run multiple times – uses INSERT ... ON DUPLICATE KEY UPDATE.
 * Preserves existing is_enabled state for categories already in the DB.
 * Run: node seeders/seed_all_categories.js
 */
require('dotenv').config();
const sequelize = require('../src/config/database');

// Full list of OpenTDB categories as of 2024
const CATEGORIES = [
  { name: 'General Knowledge',                    slug: 'general-knowledge',      external_id: 9  },
  { name: 'Books',                                slug: 'books',                  external_id: 10 },
  { name: 'Film',                                 slug: 'film',                   external_id: 11 },
  { name: 'Music',                                slug: 'music',                  external_id: 12 },
  { name: 'Musicals & Theatres',                  slug: 'musicals-theatres',      external_id: 13 },
  { name: 'Television',                           slug: 'television',             external_id: 14 },
  { name: 'Video Games',                          slug: 'video-games',            external_id: 15 },
  { name: 'Board Games',                          slug: 'board-games',            external_id: 16 },
  { name: 'Science & Nature',                     slug: 'science-nature',         external_id: 17 },
  { name: 'Computers',                            slug: 'computers',              external_id: 18 },
  { name: 'Mathematics',                          slug: 'mathematics',            external_id: 19 },
  { name: 'Mythology',                            slug: 'mythology',              external_id: 20 },
  { name: 'Sports',                               slug: 'sports',                 external_id: 21 },
  { name: 'Geography',                            slug: 'geography',              external_id: 22 },
  { name: 'History',                              slug: 'history',                external_id: 23 },
  { name: 'Politics',                             slug: 'politics',               external_id: 24 },
  { name: 'Art',                                  slug: 'art',                    external_id: 25 },
  { name: 'Celebrities',                          slug: 'celebrities',            external_id: 26 },
  { name: 'Animals',                              slug: 'animals',                external_id: 27 },
  { name: 'Vehicles',                             slug: 'vehicles',               external_id: 28 },
  { name: 'Comics',                               slug: 'comics',                 external_id: 29 },
  { name: 'Gadgets',                              slug: 'gadgets',                external_id: 30 },
  { name: 'Anime & Manga',                        slug: 'anime-manga',            external_id: 31 },
  { name: 'Cartoon & Animations',                 slug: 'cartoon-animations',     external_id: 32 },
];

async function run() {
  await sequelize.authenticate();
  console.log('Seeding all OpenTDB categories...\n');

  for (const cat of CATEGORIES) {
    // Insert new, or update name/external_id while preserving is_enabled
    const [rows] = await sequelize.query(
      'SELECT id, is_enabled FROM categories WHERE slug = ? LIMIT 1',
      { replacements: [cat.slug] }
    );

    if (rows.length > 0) {
      await sequelize.query(
        'UPDATE categories SET name = ?, external_id = ? WHERE slug = ?',
        { replacements: [cat.name, cat.external_id, cat.slug] }
      );
      console.log(`  ↺  Updated  : ${cat.name} (is_enabled preserved: ${rows[0].is_enabled ? 'yes' : 'no'})`);
    } else {
      // New categories default to is_enabled = 0 (off) so admin must consciously enable them
      await sequelize.query(
        'INSERT INTO categories (name, slug, external_id, is_enabled) VALUES (?, ?, ?, 0)',
        { replacements: [cat.name, cat.slug, cat.external_id] }
      );
      console.log(`  ✚  Created  : ${cat.name} (disabled by default)`);
    }
  }

  console.log('\n✅ Done. New categories are disabled by default — enable them in the Admin Panel > Categories.');
  process.exit(0);
}

run().catch((err) => { console.error('❌ Seeding failed:', err); process.exit(1); });
