import { DataTypes } from 'sequelize';

export default function defineMovie(sequelize) {
  return sequelize.define(
    'Movie',
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
      },
      title: {
        type: DataTypes.STRING,
        allowNull: false
      },
      description: {
        type: DataTypes.TEXT,
        allowNull: false
      },
      posterUrl: {
        type: DataTypes.STRING,
        allowNull: false
      },
      genre: {
        type: DataTypes.STRING,
        allowNull: false
      }
    },
    {
      tableName: 'movies',
      timestamps: true
    }
  );
}

