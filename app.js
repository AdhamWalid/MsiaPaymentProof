const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const multer = require('multer');
const path = require('path');
const chalk = require('chalk')
const app = express();
let qrcode = require('qrcode')
require('dotenv').config();

// Middleware
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'views')));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
// Connect to MongoDB

//Pass: 
//Username: 
mongoose.connect(process.env.MONGODB_URI).then(() => console.log("MongoDB connected"))
  .catch(err => console.log(err));

// Define Mongoose Schemas
const paymentSchema = new mongoose.Schema({
  studentID: String,
  studentName: String,
  tier: String,
  email: String,
  transactionRefID: String,
  receiptPath: String,
  verificationCode: String,  // Unique code for verification
  verified: { type: Boolean, default: false } // Track if code was already scanned

});

const Payment = mongoose.model('Payment', paymentSchema);

// Set up multer for file upload
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, './uploads/');
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(`${file.originalname}-${Date.now}`)); // Save files with unique names
  }
});
const upload = multer({ storage: storage });


// Payment submission route
app.post('/submit-payment', upload.single('receipt'), async (req, res) => {
    try {
      const { studentID, studentName, tier, email, transactionRefID } = req.body;
      const receiptPath = req.file ? req.file.path : null;
      const verificationCode = Date.now() + '-' + Math.random().toString(36).substr(2, 9);
  
      const payment = new Payment({
        studentID,
        studentName,
        tier,
        email,
        transactionRefID,
        receiptPath,
        verificationCode
      });
  
      await payment.save();
  
      // Generate QR code
      const verificationURL = `http://localhost:3030/verify-payment/${verificationCode}`;
      const qrCodeDataURL = await qrcode.toDataURL(verificationURL);
  
      res.status(200).json({
        message: "Payment successfully submitted and verified.",
        qrCode: qrCodeDataURL // Send QR code as a data URL
      });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "An error occurred while processing the payment." });
    }
  });
  
  app.get('/seller', (req, res) => {
    res.render('seller'); // Render seller.ejs
  });
  

  app.get('/verify-payment/:code', async (req, res) => {
    try {
      const { code } = req.params;
      const payment = await Payment.findOne({ verificationCode: code });
  
      if (payment) {
        if (!payment.verified) {
          // Mark as verified
          payment.verified = true;
          await payment.save();
          res.render('success', { message: "Payment verified successfully! ✅" });
        } else {
          res.render('error', { message: "This payment has already been verified." });
        }
      } else {
        res.render('error', { message: "Invalid or expired QR code." });
      }
    } catch (error) {
      console.error(error);
      res.status(500).render('error', { message: "An error occurred during verification." });
    }
  });

  

  app.get('/' , (req,res) =>{
    res.render('index')
  })
app.listen(3030 , () => {
    console.log(chalk`App {green Stable}`)
})