const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Question = sequelize.define(
  'Question',
  {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    category_id: { type: DataTypes.INTEGER, allowNull: false },
    source_id: { type: DataTypes.INTEGER, allowNull: false },
    // Optional reference to the external provider's own ID
    external_ref: { type: DataTypes.STRING(255), allowNull: true },
    question_text: { type: DataTypes.TEXT, allowNull: false },
    // SHA-256 of "<source_id>:<question_text>" – used for deduplication
    question_text_hash: { type: DataTypes.CHAR(64), allowNull: false },
    difficulty: {
      type: DataTypes.ENUM('easy', 'medium', 'hard'),
      allowNull: false,
      defaultValue: 'medium',
    },
    correct_answer: { type: DataTypes.TEXT, allowNull: false },
    // Stored as a JSON array of strings, e.g. ["Wrong A", "Wrong B", "Wrong C"]
    incorrect_answers_json: { type: DataTypes.JSON, allowNull: false },
    points: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 2 },
  },
  {
    tableName: 'questions',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    indexes: [
      {
        unique: true,
        fields: ['source_id', 'question_text_hash'],
        name: 'uq_source_question_hash',
      },
    ],
  }
);

module.exports = Question;
