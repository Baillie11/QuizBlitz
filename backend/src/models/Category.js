const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Category = sequelize.define(
  'Category',
  {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    name: { type: DataTypes.STRING(100), allowNull: false },
    slug: { type: DataTypes.STRING(100), allowNull: false, unique: true },
    // Maps to the external provider's category ID (e.g. OpenTDB: 9 = General Knowledge)
    external_id: { type: DataTypes.INTEGER, allowNull: true },
    is_enabled: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
  },
  {
    tableName: 'categories',
    timestamps: false,
  }
);

module.exports = Category;
