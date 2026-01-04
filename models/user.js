import { DataTypes } from 'sequelize';

export default function defineUser(sequelize) {
  return sequelize.define(
    'User',
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
      },
      username: {
        type: DataTypes.STRING(40),
        allowNull: false,
        unique: true,
        validate: {
          len: [3, 40]
        }
      },
      passwordHash: {
        type: DataTypes.STRING,
        allowNull: false
      },
      role: {
        type: DataTypes.ENUM('user', 'admin'),
        allowNull: false,
        defaultValue: 'user'
      }
    },
    {
      tableName: 'users',
      timestamps: true
    }
  );
}

