const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const User = sequelize.define('User', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    username: {
        type: DataTypes.STRING(50),
        allowNull: false,
        unique: true
    },
    email: {
        type: DataTypes.STRING(100),
        allowNull: false,
        unique: true,
        validate: {
            isEmail: true
        }
    },
    password_hash: {
        type: DataTypes.STRING(255),
        allowNull: false
    },
    first_name: {
        type: DataTypes.STRING(50),
        allowNull: false
    },
    last_name: {
        type: DataTypes.STRING(50),
        allowNull: false
    },
    birth_date: {
        type: DataTypes.DATE,
        allowNull: true
    },
    bank_name: {
        type: DataTypes.STRING(100),
        allowNull: true
    },
    bank_account: {
        type: DataTypes.STRING(50),
        allowNull: true
    },
    contract_start: {
        type: DataTypes.DATE,
        allowNull: true
    },
    contract_end: {
        type: DataTypes.DATE,
        allowNull: true
    },
    salary: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: true
    }
}, {
    tableName: 'users',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at'
});

module.exports = User; 