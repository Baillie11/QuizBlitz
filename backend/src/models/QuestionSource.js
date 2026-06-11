const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const QuestionSource = sequelize.define(
  'QuestionSource',
  {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    name: { type: DataTypes.STRING(100), allowNull: false },
    base_url: { type: DataTypes.STRING(255), allowNull: false },
    notes: { type: DataTypes.TEXT, allowNull: true },
  },
  {
    tableName: 'question_sources',
    timestamps: false,
  }
);

module.exports = QuestionSource;
