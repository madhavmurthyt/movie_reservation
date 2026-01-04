import { DataTypes } from 'sequelize';

export default function defineShowtime(sequelize) {
  return sequelize.define(
    'Showtime',
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
      },
      movieId: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
          model: 'movies',
          key: 'id'
        },
        onDelete: 'CASCADE'
      },
      startTime: {
        type: DataTypes.DATE,
        allowNull: false
      },
      capacity: {
        type: DataTypes.INTEGER,
        allowNull: false,
        validate: {
          min: 1
        }
      },
      price: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
        defaultValue: 0
      }
    },
    {
      tableName: 'showtimes',
      timestamps: true
    }
  );
}

