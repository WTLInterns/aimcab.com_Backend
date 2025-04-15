const express = require("express")
const {createBooking, getBaseAmount, getAllCarPrices,updateBookingCarSelection,getDetailsForInvoice, updateInvoiceDetails} = require("../controllers/cabBookingController");
// const {
//     createInitialBooking,
//     finalizeBooking
// } = require('../controllers/cabBookingController');


const router = express.Router();

router.post("/create-booking", createBooking);

router.get('/getBaseAmount', getBaseAmount);
router.put('/update-booking', updateBookingCarSelection);
router.get('/get-invoice-details', getDetailsForInvoice);
router.post('/update-invoice-details', updateInvoiceDetails);

router.get('/get-all-car-prices', getAllCarPrices);

// router.post('/booking/initial', createInitialBooking);

// router.post('/booking/finalize', finalizeBooking);



module.exports = router;