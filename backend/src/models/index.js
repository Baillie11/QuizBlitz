const sequelize = require('../config/database');
const User = require('./User');
const Category = require('./Category');
const QuestionSource = require('./QuestionSource');
const Question = require('./Question');
const GameSession = require('./GameSession');

// ── Associations ──────────────────────────────────────────────────────────────
Question.belongsTo(Category, { foreignKey: 'category_id', as: 'category' });
Question.belongsTo(QuestionSource, { foreignKey: 'source_id', as: 'source' });
Category.hasMany(Question, { foreignKey: 'category_id', as: 'questions' });

GameSession.belongsTo(User, { foreignKey: 'user_id', as: 'user' });
GameSession.belongsTo(Category, { foreignKey: 'category_id', as: 'category' });
User.hasMany(GameSession, { foreignKey: 'user_id', as: 'sessions' });

module.exports = {
  sequelize,
  User,
  Category,
  QuestionSource,
  Question,
  GameSession,
};
