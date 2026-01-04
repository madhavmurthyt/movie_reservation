import { DataTypes } from 'sequelize';

export default function defineReservation(sequelize) {
  return sequelize.define(
    'Reservation',
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
      },
      userId: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
          model: 'users',
          key: 'id'
        },
        onDelete: 'CASCADE'
      },
      showtimeId: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
          model: 'showtimes',
          key: 'id'
        },
        onDelete: 'CASCADE'
      },
      status: {
        type: DataTypes.ENUM('upcoming', 'completed', 'cancelled'),
        allowNull: false,
        defaultValue: 'upcoming'
      },
      totalPrice: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
        defaultValue: 0
      }
    },
    {
      tableName: 'reservations',
      timestamps: true
    }
  );
}

