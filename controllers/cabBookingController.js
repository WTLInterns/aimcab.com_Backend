const cabBookingSchema = require("../model/cabBook");

const createBooking = async (req, res) => {
    try {
        const { tripType, pickUpLocation, dropLocation, date, time, returnDate, returnTime, packageType, customerName, phoneNumber, email } = req.body;

        if (!tripType || !pickUpLocation || !dropLocation || !date || !time || !customerName || !phoneNumber || !email) {
            return res.status(400).json({ success: false, message: "All fields are required" });
        }

        if (tripType === "Round Trip" && (!returnDate || !returnTime)) {
            return res.status(400).json({ success: false, message: "Return Date and Time are required for Round Trip" });
        }

        if (tripType === "Rental" && !packageType) {
            return res.status(400).json({ success: false, message: "Package Type is required for Rental" });
        }

        // Convert date fields to Date objects (if they are strings)
        const formattedDate = new Date(date);
        const formattedReturnDate = returnDate ? new Date(returnDate) : undefined;

        const booking = new cabBookingSchema({
            tripType,
            pickUpLocation,
            dropLocation,
            date: formattedDate,
            time,
            returnDate: formattedReturnDate,
            returnTime,
            packageType,
            customerName,
            phoneNumber,
            email
        });

        await booking.save();

        // ✅ Remove undefined values from response
        const responseData = booking.toObject();
        Object.keys(responseData).forEach(key => {
            if (responseData[key] === null || responseData[key] === undefined) delete responseData[key];
        });

        res.status(201).json({ success: true, message: "Booking Created Successfully", data: booking });

    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
}

module.exports = { createBooking };
