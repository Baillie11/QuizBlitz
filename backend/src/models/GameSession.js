const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const GameSession = sequelize.define(
  'GameSession',
  {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    // Nullable – allows guest play without an account
    user_id: { type: DataTypes.INTEGER, allowNull: true },
    category_id: { type: DataTypes.INTEGER, allowNull: false },
    difficulty: { type: DataTypes.STRING(20), allowNull: true },
    score: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
    total_questions: { type: DataTypes.INTEGER, allowNull: false },
    total_time_ms: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true },
    answer_times_json: { type: DataTypes.JSON, allowNull: true },
    started_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
    finished_at: { type: DataTypes.DATE, allowNull: true },
  },
  {
    tableName: 'game_sessions',
    timestamps: false,
  }
);

module.exports = GameSession;
