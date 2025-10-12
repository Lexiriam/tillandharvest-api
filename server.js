const path = require('path');
const express = require('express');
const dotenv = require('dotenv');
dotenv.config( {path: './config/config.env'} );  // Env file path

// Middleware jcustom file path or module
// const logger = require('./middleware/logger');
const morgan = require('morgan');
const colors = require('colors');
const fileupload = require('express-fileupload');
const cookieParser = require('cookie-parser');
const mongoSanitize = require('express-mongo-sanitize');
const helmet = require('helmet');
const xss = require('xss-clean');
const rateLimit = require('express-rate-limit');
const hpp = require('hpp');
const cors = require('cors');
const errorHandler = require('./middleware/error');
const connectDB = require('./config/db');

// Connect to database
connectDB();

// Route file paths in
const bootcamps = require('./routes/bootcamps');  
const courses = require('./routes/courses');
const auth = require('./routes/auth');
const users = require('./routes/users');
const reviews = require('./routes/reviews');

const app = express(); // Initialze app variable with express

// Body parser
app.use(express.json());

// Cookie parser
app.use(cookieParser());


// MIDDLEWARE
// Dev logging middleware
// app.use(logger); // Custom middleware path
if(process.env.NODE_ENV === 'development') {
   app.use(morgan('dev'));
}

// File Uploading
app.use(fileupload());

// Sanitize data
//app.use(mongoSanitize());

// Set security headers
app.use(helmet());

// Prevent XSS attacks
//app.use(xss());

// Rate limiting
const limiter = rateLimit({
   windowMS: 10 * 60 * 1000, // 10 mins
   max: 100
});

app.use(limiter);

// Prevent http param pollution
app.use(hpp());

// Enable cors
app.use(cors());

// Set static folder
app.use(express.static(path.join(__dirname, 'public')));

// Mount routers to router path
// Middleware must be after the initial router mount
app.use('/api/v1/bootcamps', bootcamps);
app.use('/api/v1/courses', courses);
app.use('/api/v1/auth', auth);
app.use('/api/v1/users', users);
app.use('/api/v1/reviews', reviews);

app.use(errorHandler);

const PORT = process.env.PORT || 5000;

// Create a global handler
const server = app.listen(
   PORT, 
   console.log(`Server running in ${process.env.NODE_ENV} mode on port ${PORT}`.yellow.bold)
);

// Handle unhandled promise rejections
process.on('unhandledRejection', (err, promise) => {
   console.log(`Error: ${err.message}`.red);
   // Close server process
   server.close(() => process.exit(1));
});