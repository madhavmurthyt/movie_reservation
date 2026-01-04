import { DataTypes } from 'sequelize';

export default function defineReservedSeat(sequelize) {
  return sequelize.define(
    'ReservedSeat',
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
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
      reservationId: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
          model: 'reservations',
          key: 'id'
        },
        onDelete: 'CASCADE'
      },
      seatNumber: {
        type: DataTypes.STRING,
        allowNull: false
      }
    },
    {
      tableName: 'reserved_seats',
      timestamps: true,
      indexes: [
        {
          unique: true,
          fields: ['showtimeId', 'seatNumber']
        }
      ]
    }
  );
}

