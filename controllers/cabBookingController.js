const cabBookingSchema = require("../model/cabBook");
const dotenv = require('dotenv');
const axios = require('axios');
const pool = require('../config/db');

dotenv.config();

const GOOGLE_MAPS_API_KEY = process.env.GOOGLE_MAPS_API_KEY;

async function getDistance(origin, destination) {
    try {
        const response = await axios.get(`https://maps.googleapis.com/maps/api/distancematrix/json`, {
            params: {
                origins: origin,
                destinations: destination,
                key: GOOGLE_MAPS_API_KEY
            }
        });

        if (
            response.data.status === "OK" &&
            response.data.rows[0] &&
            response.data.rows[0].elements[0].status === "OK"
        ) {
            const distanceInMeters = response.data.rows[0].elements[0].distance.value;
            return distanceInMeters / 1000;
        } else {
            console.error("❌ Invalid response from Google Maps API:", response.data);
            return null;
        }
    } catch (error) {
        console.error("❌ Error fetching distance:", error.response ? error.response.data : error.message);
        return null;
    }
}



const createBooking = async (req, res) => {
    try {
        console.log("🚖 Creating Booking...");

        const {
             // 👈 Add this to destructuring
            user_trip_type,
            user_pickup,
            user_drop,
            date,
            time,
            return_date,
            time_end,
            name,
            phone,
            email,
            carType,
            bookingId
        } = req.body;

        // 🔍 Basic Validation
        if (!bookingId || !user_trip_type || !user_pickup || !user_drop || !date || !time || !name || !phone || !email) {
            return res.status(400).json({ success: false, message: "All fields are required" });
        }

        if (user_trip_type === "Round Trip" && (!return_date || !time_end)) {
            return res.status(400).json({ success: false, message: "Return Date and Time are required for Round Trip" });
        }

        // 🧠 Extract city and state from pickup/drop locations
        const extractCityAndState = (location) => {
            const parts = location.split(',').map(p => p.trim());
            return {
                city: parts[0] || null,
                state: parts[1] || null
            };
        };

        const pickupInfo = extractCityAndState(user_pickup);
        const dropInfo = extractCityAndState(user_drop);

        const source_city = pickupInfo.city;
        const source_state = pickupInfo.state;
        const destination_city = dropInfo.city;
        const destination_state = dropInfo.state;

        if (!source_city || !source_state || !destination_city || !destination_state) {
            return res.status(400).json({ success: false, message: "Invalid pickup or drop location format" });
        }

        // 📏 Get Distance
        const distance = await getDistance(user_pickup, user_drop);
        if (!distance) {
            return res.status(500).json({ success: false, message: "Error calculating distance" });
        }

        console.log(`📏 Distance: ${distance} km`);

        const validCarTypes = ["hatchback", "sedan", "suv", "suvplus"];
        let priceDetails = {};
        let selectedCarType = null;

        // 📦 Fetch Rate per KM from MySQL
        const ratePerKmQuery =
            user_trip_type === "One Way"
                ? `SELECT hatchback, sedan, suv, suvplus 
                   FROM oneway_trip 
                   WHERE source_city = ? 
                     AND destination_city = ? 
                     AND source_state = ? 
                     AND destination_state = ?`
                : `SELECT hatchback, sedan, suv, suvplus 
                   FROM round_trip 
                   WHERE source_city = ? 
                     AND destination_city = ? 
                     AND source_state = ? 
                     AND destination_state = ?`;

        console.log("Running ratePerKmQuery...");

        const [rateRows] = await pool.execute(ratePerKmQuery, [
            source_city,
            destination_city,
            source_state,
            destination_state
        ]);

        if (rateRows.length === 0) {
            return res.status(400).json({ success: false, message: "Pricing not available for this route" });
        }

        const rates = rateRows[0];

        if (user_trip_type === "Round Trip") {
            const pickupDate = new Date(date);
            const dropDate = new Date(return_date);
            const timeDiff = Math.abs(pickupDate - dropDate);
            const totalDays = Math.ceil(timeDiff / (1000 * 60 * 60 * 24)) + 1;

            const minKmPerDay = 300;
            const driverAllowancePerDay = 300;
            const totalMinKm = minKmPerDay * totalDays;
            const driverAllowance = driverAllowancePerDay * totalDays;
            const totalDistance = distance * totalDays;

            for (const type of validCarTypes) {
                const rate = rates[type];
                if (!rate) continue;

                let totalCost = 0;
                if (totalDistance < totalMinKm) {
                    totalCost = totalMinKm * rate + driverAllowance;
                } else {
                    totalCost = totalDistance * rate;
                }

                priceDetails[type] = parseFloat(totalCost.toFixed(2));
            }
        } else {
            for (const type of validCarTypes) {
                if (rates[type]) {
                    priceDetails[type] = parseFloat((distance * rates[type]).toFixed(2));
                }
            }
        }

        if (Object.keys(priceDetails).length === 0) {
            return res.status(400).json({ success: false, message: "No pricing found for selected car types" });
        }

        // ✅ Select car type
        if (carType) {
            if (!validCarTypes.includes(carType)) {
                return res.status(400).json({ success: false, message: "Invalid car type" });
            }
            selectedCarType = carType;
        } else {
            selectedCarType = Object.entries(priceDetails).reduce(
                (min, [type, price]) => price < priceDetails[min] ? type : min,
                validCarTypes.find(type => priceDetails[type])
            );
        }

        // 🗓️ Format Dates
        const formattedDate = new Date(date);
        const formattedReturnDate = return_date ? new Date(return_date) : null;

        // 💾 Save to MongoDB
        const booking = await cabBookingSchema.create({
             // 👈 Store booking ID
            user_trip_type,
            user_pickup,
            user_drop,
            source_state,
            destination_state,
            date: formattedDate,
            time,
            return_date: formattedReturnDate,
            time_end,
            name,
            phone,
            email,
            distance,
            baseAmount: priceDetails,
            car: selectedCarType,
            bookingId,

        });

        console.log("✅ Booking Saved Successfully!");

        res.status(201).json({
            success: true,
            message: "Booking Created Successfully",
            bookingId,
            data: {
                ...booking.toJSON(),
                baseAmount: priceDetails
            }
        });

    } catch (error) {
        console.error("❌ Error creating booking:", error.message);
        res.status(500).json({ success: false, message: "Internal Server Error" });
    }
};




const updateBookingCarSelection = async (req, res) => {
    try {
        const { carType } = req.body;
        const { bookingId } = req.query; // Get bookingId from query string
        console.log("bookingId", bookingId);

        if (!bookingId || !carType) {
            return res.status(400).json({ success: false, message: "bookingId and carType are required" });
        }

        const validCarTypes = ["hatchback", "sedan", "suv", "suvplus"];
        if (!validCarTypes.includes(carType)) {
            return res.status(400).json({ success: false, message: "Invalid car type" });
        }

        // 1️⃣ Fetch booking row from MySQL
        const [rows] = await pool.execute(
            `SELECT baseAmount FROM user_booking WHERE bookingId = ?`,
            [bookingId]
        );

        if (rows.length === 0) {
            return res.status(404).json({ success: false, message: "Booking not found" });
        }

        // 2️⃣ Parse baseAmount (object string)
        const baseAmountObj = rows[0].baseAmount;
        // const carPrice = baseAmountObj[carType];
        const carPrice = Math.floor(baseAmountObj[carType]);

        if (!carPrice) {
            return res.status(400).json({ success: false, message: "Price not found for selected car" });
        }

        // 3️⃣ Update MySQL booking record
        await pool.execute(
            `UPDATE user_booking SET car = ?, price = ? WHERE bookingId = ?`,
            [carType, carPrice, bookingId]
        );

        res.status(200).json({
            success: true,
            message: "Car type and price updated successfully",
            data: { carType, price: carPrice }
        });

    } catch (error) {
        console.error("❌ Error updating booking car info:", error.message);
        res.status(500).json({ success: false, message: "Internal Server Error" });
    }
};


const getBaseAmount = async (req, res) => {
    const { user_trip_type, user_pickup, user_drop, date, return_date, car } = req.query;

    // Validation
    if (!user_trip_type || !user_pickup || !user_drop || !date) {
        return res.status(400).json({
            message: 'Missing one or more required query parameters: user_trip_type, user_pickup, user_drop, or date.',
        });
    }

    if (user_trip_type === 'Round Trip' && !return_date) {
        return res.status(400).json({
            message: 'Missing return_date for Round Trip.',
        });
    }

    try {
        const whereCondition = {
            user_trip_type,
            user_pickup,
            user_drop,
            date,
        };

        if (user_trip_type === 'Round Trip') {
            whereCondition.return_date = return_date;
        }

        const result = await cabBookingSchema.findOne({
            attributes: ['baseAmount'],
            where: whereCondition,
        });

        if (!result || !result.baseAmount) {
            const allCombos = await cabBookingSchema.findAll({
                attributes: ['user_trip_type', 'user_pickup', 'user_drop', 'date', 'return_date'],
                group: ['user_trip_type', 'user_pickup', 'user_drop', 'date', 'return_date'],
            });

            return res.status(404).json({
                message: 'No pricing found for this combination or baseAmount is missing.',
                available: allCombos,
            });
        }

        const baseAmountData = result.baseAmount;

        if (car) {
            const carLower = car.toLowerCase();
            const amount = baseAmountData[carLower];

            if (!amount) {
                return res.status(404).json({
                    message: `No base amount found for car type: ${carLower}`,
                });
            }

            return res.json({ baseAmount: Math.round(amount) });
        }

        return res.json({ baseAmount: baseAmountData });

    } catch (err) {
        console.error('Database error:', err);
        return res.status(500).json({ error: 'Database error', details: err.message });
    }
};

// controllers/bookingController.js

const getDetailsForInvoice = async (req, res) => {
  const { bookingId, car } = req.query;
  console.log("Received query params:", req.query);

  // Validate the request parameters
  if (!bookingId || !car) {
    return res.status(400).json({ message: 'Missing bookingId or car' });
  }

  try {
    // IMPORTANT: Make sure your bookingId field in the document exactly matches the query
    const booking = await cabBookingSchema.findOne({ where: { bookingId } });
    console.log("Query filter used: { bookingId: ", bookingId, "}");

    if (!booking) {
      return res.status(404).json({ message: 'Booking not found' });
    }

    // Create the invoiceDetails using the correct field names from your schema and document.
    const invoiceDetails = {
      name: booking.name,
      email: booking.email,
      phone: booking.phone,
      trip_type: booking.user_trip_type,           // Use the stored field name here
      pickup_location: booking.user_pickup, // Adjust if stored as user_pickup etc.
      drop_location: booking.user_drop,     // Adjust if stored as user_drop etc.
      date: booking.date,
      time: booking.time,
      distance: booking.distance,
      return_date: booking.return_date,
      bookingId: booking.bookingId,
      car, 
      price: booking.price, // Optionally, add logic to modify price based on car type here.
    };

    console.log("Invoice details:", invoiceDetails);
    res.json(invoiceDetails);
  } catch (err) {
    console.error("Error in getDetailsForInvoice:", err.message);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};





const updateInvoiceDetails = async (req, res) => {
    try {
        const { bookingId, totalAmount } = req.body;

        if (!bookingId || !totalAmount) {
            return res.status(400).json({
                success: false,
                message: "bookingId and totalAmount are required",
            });
        }

        // Update totalAmount in DB
        const [result] = await pool.execute(
            `UPDATE user_booking SET totalAmount = ? WHERE bookingId = ?`,
            [totalAmount, bookingId]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ success: false, message: "Booking not found" });
        }

        res.status(200).json({
            success: true,
            message: "Total amount updated successfully",
            data: { totalAmount },
        });

    } catch (error) {
        console.error("❌ Error updating invoice:", error.message);
        res.status(500).json({ success: false, message: "Internal Server Error" });
    }
};


  
  

const getAllCarPrices = async (req, res) => {
    try {
        const { user_trip_type, user_pickup, user_drop } = req.query;

        if (!user_trip_type || !user_pickup || !user_drop) {
            return res.status(400).json({ success: false, message: "Trip type, pickup, and drop are required" });
        }

        // Get Distance
        const distance = await getDistance(user_pickup, user_drop);
        if (!distance) {
            return res.status(500).json({ success: false, message: "Error calculating distance" });
        }

        const validCarTypes = ["hatchback", "sedan", "suv", "suvplus"];
        let priceDetails = {};

        for (const carType of validCarTypes) {
            let ratePerKmQuery = "";
            let queryParams = [];

            if (user_trip_type === "One Way") {
                ratePerKmQuery = `SELECT ${carType} AS rate_per_km FROM oneway_trip WHERE source_city = ? AND destination_city = ?`;
                queryParams = [user_pickup, user_drop];
            } else if (user_trip_type === "Round Trip") {
                ratePerKmQuery = `SELECT ${carType} AS rate_per_km FROM round_trip WHERE source_city = ? AND destination_city = ?`;
                queryParams = [user_pickup, user_drop];
            } else {
                return res.status(400).json({ success: false, message: "Invalid trip type" });
            }

            const [rateRows] = await pool.execute(ratePerKmQuery, queryParams);

            if (rateRows.length > 0 && rateRows[0].rate_per_km) {
                const ratePerKm = rateRows[0].rate_per_km;
                const totalPrice = distance * ratePerKm;
                priceDetails[carType] = Math.round(totalPrice);
            }
        }

        res.status(200).json({
            success: true,
            data: {
                distance,
                priceDetails
            }
        });

    } catch (error) {
        console.error("❌ Error getting car prices:", error.message);
        res.status(500).json({ success: false, message: "Internal Server Error" });
    }
};

module.exports = { createBooking, getBaseAmount, getDetailsForInvoice, getAllCarPrices, updateBookingCarSelection, updateInvoiceDetails };