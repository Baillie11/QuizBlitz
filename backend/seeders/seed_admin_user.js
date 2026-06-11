#!/usr/bin/env node
/**
 * Creates the admin_users table and seeds the initial admin account.
 * Run: node seeders/seed_admin_user.js
 */
require('dotenv').config();
const bcrypt = require('bcryptjs');
const sequelize = require('../src/config/database');

const EMAIL    = 'andrew@clickecommerce.com.au';
const USERNAME = 'Andrew';
const PASSWORD = 'P@ssword123';

async function run() {
  await sequelize.authenticate();

  // Create table if not exists
  await sequelize.query(`
    CREATE TABLE IF NOT EXISTS admin_users (
      id                   INT          NOT NULL AUTO_INCREMENT,
      email                VARCHAR(255) NOT NULL,
      username             VARCHAR(100) NOT NULL,
      password_hash        VARCHAR(255) NOT NULL,
      must_change_password TINYINT(1)   NOT NULL DEFAULT 1,
      created_at           DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      UNIQUE KEY uq_admin_email (email)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `);
  console.log('  Table admin_users ready.');

  const hash = await bcrypt.hash(PASSWORD, 12);

  const [rows] = await sequelize.query(
    'SELECT id FROM admin_users WHERE email = ? LIMIT 1',
    { replacements: [EMAIL] }
  );

  if (rows.length > 0) {
    await sequelize.query(
      'UPDATE admin_users SET username = ?, password_hash = ?, must_change_password = 1 WHERE email = ?',
      { replacements: [USERNAME, hash, EMAIL] }
    );
    console.log(`  Admin user "${EMAIL}" updated.`);
  } else {
    await sequelize.query(
      'INSERT INTO admin_users (email, username, password_hash, must_change_password) VALUES (?, ?, ?, 1)',
      { replacements: [EMAIL, USERNAME, hash] }
    );
    console.log(`  Admin user "${EMAIL}" created.`);
  }

  console.log('\n✅ Admin user seeding complete.');
  console.log(`   Email:    ${EMAIL}`);
  console.log(`   Username: ${USERNAME}`);
  console.log(`   Password: ${PASSWORD}  (must change on first login)`);
  process.exit(0);
}

run().catch((err) => { console.error('❌ Seeding failed:', err); process.exit(1); });
