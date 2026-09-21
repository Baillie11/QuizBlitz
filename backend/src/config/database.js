const { Sequelize } = require('sequelize');
require('dotenv').config();

const commonOptions = {
  logging: process.env.NODE_ENV === 'development' ? console.log : false,
  pool: { max: 10, min: 0, acquire: 30000, idle: 10000 },
};

const sequelize = process.env.DATABASE_URL
  ? new Sequelize(process.env.DATABASE_URL, {
      ...commonOptions,
      dialect: 'postgres',
      dialectOptions: process.env.DB_SSL === 'true'
        ? { ssl: { require: true, rejectUnauthorized: false } }
        : {},
    })
  : new Sequelize(
      process.env.DB_NAME || 'quizblitz',
      process.env.DB_USER || 'root',
      process.env.DB_PASS || '',
      {
        ...commonOptions,
        host: process.env.DB_HOST || 'localhost',
        port: parseInt(process.env.DB_PORT) || 3306,
        dialect: 'mysql',
        define: { charset: 'utf8mb4', collate: 'utf8mb4_unicode_ci' },
      }
    );

module.exports = sequelize;
