const express = require("express")
const {createBooking} = require("../controllers/cabBookingController");

const router = express.Router();

router.post("/create-booking", createBooking);

module.exports = router;