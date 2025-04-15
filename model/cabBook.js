const { Sequelize, DataTypes } = require('sequelize');
const sequelize = new Sequelize('demo', 'root', 'root', {
    host: '127.0.0.1',
    dialect: 'mysql',
});

const CabBooking = sequelize.define('CabBooking', {
    user_trip_type: {
        type: DataTypes.ENUM('One Way Trip', 'Round Trip', 'Rental'),
        allowNull: false
    },
    user_pickup: {
        type: DataTypes.STRING,
        allowNull: false
    },
    user_drop: {
        type: DataTypes.STRING,
        allowNull: false
    },
    date: {
        type: DataTypes.DATEONLY,
        allowNull: false
    },
    time: {
        type: DataTypes.TIME,
        allowNull: false
    },
    return_date: {
        type: DataTypes.DATEONLY,
        allowNull: true
    },
    time_end: {
        type: DataTypes.TIME,
        allowNull: true
    },
    // package_type: {
    //     type: DataTypes.STRING,
    //     allowNull: false
    // },
    name: {
        type: DataTypes.STRING,
        allowNull: false
    },
    phone: {
        type: DataTypes.STRING(10),
        allowNull: false,
        validate: {
            is: /^[0-9]{10}$/
        }
    },
    email: {
        type: DataTypes.STRING,
        allowNull: false,
        validate: {
            isEmail: true
        }
    },
    distance: {
        type: DataTypes.FLOAT,
        allowNull: false
    },
   baseAmount: {
  type: DataTypes.JSON,
  allowNull: true
},
    car: {
        type: DataTypes.ENUM('hatchback', 'sedan', 'suv', 'suvplus'),
        allowNull: true
    },
    price: {
        type: DataTypes.FLOAT,
        allowNull: true
    },
    bookingId: {
        type: DataTypes.STRING,
        allowNull: true
      },
    created_at: {
        type: DataTypes.DATE,
        defaultValue: Sequelize.NOW
    }

}, {
    tableName: 'user_booking',
    timestamps: false 
});

module.exports = CabBooking;
