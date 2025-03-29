const mongoose = require("mongoose");

const cabBookSchema = new mongoose.Schema({
    tripType: {
        type: String,
        enum: ["One Way Trip", "Round Trip", "Rental"],
        required: true,
    },
    pickUpLocation: {
        type: String,
        required: true,
    },
    dropLocation: {
        type: String,
        required: true,
    },
    date: {
        type: Date,
        required: true,
    },
    time: {
        type: String,
        required: true,
    },
    returnDate: {
        type: Date,
        required: function () {
            return this.tripType === "Round Trip"; 
        },
    },
    returnTime: {
        type: String,
        required: function () {
            return this.tripType === "Round Trip"; 
        },
    },
    packageType: {
        type: String,
        required: function () {
            return this.tripType === "Rental"; 
        },
    },
    customerName: {
        type: String,
        required: true,
    },
    phoneNumber: {
        type: String,
        required: true,
        match: [/^\d{10}$/, "Phone number must be 10 digits"],
    },
    email: {
        type: String,
        required: true,
        match: [/.+\@.+\..+/, "Invalid email format"],
    },
    createdAt: {
        type: Date,
        default: Date.now,
    },
});

module.exports = mongoose.model("CabBook", cabBookSchema);
