const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const User = sequelize.define(
  'User',
  {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    email: {
      type: DataTypes.STRING(255),
      allowNull: false,
      unique: true,
      validate: { isEmail: true },
    },
    password_hash: { type: DataTypes.STRING(255), allowNull: false },
    display_name: { type: DataTypes.STRING(100), allowNull: true },
    is_premium: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
    // 'stripe' | 'iap' | 'manual' – ready for Level 2 payments
    premium_source: { type: DataTypes.STRING(50), allowNull: true },
    ad_opt_out: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
    // JSON array of category IDs the user prefers
    preferred_categories: {
      type: DataTypes.JSON,
      allowNull: true,
      defaultValue: [],
      get() {
        const v = this.getDataValue('preferred_categories');
        return v || [];
      },
    },
  },
  {
    tableName: 'users',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: false,
  }
);

module.exports = User;
