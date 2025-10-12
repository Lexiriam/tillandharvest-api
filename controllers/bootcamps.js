const path = require('path');
const ErrorResponse = require('../utils/errorResponse');
const asyncHandler = require('../middleware/async');
const geocoder = require('../utils/geocoder');
const Bootcamp = require('../models/Bootcamp');
// const advancedResults = require('../middleware/advancedResults');

// @desc:   Get all bootcamps
// @route   GET /api/v1/bootcamps
// @access  Public
exports.getBootcamps = asyncHandler( async (req, res, next) => {
   res.status(200).json(res.advancedResults);
});


// @desc:   Get single bootcamp
// @route   GET /api/v1/bootcamps/:id
// @access  Public
exports.getBootcamp = asyncHandler( async (req, res, next) => {
   const bootcamp = await Bootcamp.findById(req.params.id);

   if (!bootcamp) {
      return next(new ErrorResponse(`Bootcamp not found with id of ${req.params.id}`, 404));
   }

   res.status(200).json({ success: true, data: bootcamp });
});


// @desc:   Create new bootcamp
// @route   POST /api/v1/bootcamps
// @access  Private
exports.createBootcamp = asyncHandler( async (req, res, next) => {
   // Add user to req.body from middleware
   req.body.user = req.user.id;

   // Check for published bootcamp
   const publishedBootcamp = await Bootcamp.findOne( { user: req.user.id });

   // if the user is not admin, they can only add one bootcamp
   if (publishedBootcamp && req.user.role !== 'admin') {
      return next(new ErrorResponse(`The user with ID ${req.user.id} has already published a bootcamp.`, 400));
   }


   const bootcamp = await Bootcamp.create(req.body);
   

   res.status(201).json({
      success: true,
      data: bootcamp
   });
});


// @desc:   Update bootcamp
// @route   PUT /api/v1/bootcamps/:id
// @access  Private
exports.updateBootcamp = asyncHandler( async (req, res, next) => {
   let bootcamp = await Bootcamp.findById(req.params.id);
   
   if (!bootcamp) {
      // return res.status(400).json( { success: false });
      return next(new ErrorResponse(`Bootcamp not found with id of ${req.params.id}`, 404));
   }

   // Make sure user is bootcamp owner
   if ( bootcamp.user.toString() !== req.user.id && req.user.role !== 'admin' ) {
      return next(new ErrorResponse(`User ${req.params.id} is not authorized to update this bootcamp`, 401));
   }

   bootcamp = await Bootcamp.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true
   });

   res.status(200).json( { success: true, data: bootcamp } );
});


// @desc:   Delete bootcamp
// @route   DELETE /api/v1/bootcamps/:id
// @access  Private
exports.deleteBootcamp = asyncHandler( async (req, res, next) => {
   // Get id of bootcamp and assign to bootcamp
   const bootcamp = await Bootcamp.findById(req.params.id);

   if(!bootcamp) {
      // return res.status(400).json( { success: false } );
      return next(new ErrorResponse(`Bootcamp not found with id of ${req.params.id}`, 404));
   }

   // Make sure user is bootcamp owner
   if ( bootcamp.user.toString() !== req.user.id && req.user.role !== 'admin' ) {
      return next(new ErrorResponse(`User ${req.params.id} is not authorized to delete this bootcamp`, 401));
   }

   // delete by bootcamp.id that has been retrieved.
   // note: .remove has been deprecated. Use: .deleteOne()
   await bootcamp.deleteOne();

   res.status(200).json( { success: true, data: {} } );
});


// @desc:   Get bootcamps within a radius
// @route   GET /api/v1/bootcamps/radius/:zipcode/:distance
// @access  Private
exports.getBootcampsInRadius = asyncHandler( async (req, res, next) => {
   const { zipcode, distance } = req.params;

   // Get lat/lng from geocoder
   const loc = await geocoder.geocode(zipcode);
   const lat = loc[0].latitude;
   const lng = loc[0].longitude;

   // Calculate radius by dividing the distance by radius of Earth (3963 Miles / 6378 Km)
   const radius = distance / 3963;

   const bootcamps = await Bootcamp.find({
      location: { $geoWithin: { $centerSphere: [ [ lng, lat ], radius ] } }
   });

   res.status(200).json( { success: true, count: bootcamps.length, data: bootcamps });
});


// @desc:   Upload Photo for Bootcamp
// @route   PUT /api/v1/bootcamps/:id/photo
// @access  Private
exports.bootcampPhotoUpload = asyncHandler( async (req, res, next) => {
   // Get id of bootcamp and assign to bootcamp
   const bootcamp = await Bootcamp.findById(req.params.id);

   if(!bootcamp) {
      // return res.status(400).json( { success: false } );
      return next(new ErrorResponse(`Bootcamp not found with id of ${req.params.id}`, 404));
   }

   // Make sure user is bootcamp owner
   if ( bootcamp.user.toString() !== req.user.id && req.user.role !== 'admin' ) {
      return next(new ErrorResponse(`User ${req.params.id} is not authorized to update this bootcamp`, 401));
   }

   if(!req.files) {
      return next(new ErrorResponse(`Pleasae upload a file`, 400));
   }

   const file = req.files.file;

   // Make sure the image is a photo
   if (!file.mimetype.startsWith('image/')) {
      return next(new ErrorResponse(`Please upload an image file`, 400));
   }

   // Check Filesize
   if(file.size > process.env.MAX_FILE_UPLOAD) {
      return next(new ErrorResponse(`Pleasae upload an image less than ${process.env.MAX_FILE_UPLOAD}`, 400));
   }

   // Create custom filename
   file.name = `photo_${bootcamp._id}${path.parse(file.name).ext}`;

   file.mv(`${process.env.FILE_UPLOAD_PATH}/${file.name}`, async err => {
      if(err) {
         console.error(err);

         return next(`Problem with file upload.`, 500);
      }

      // Insert filename into the database
      await Bootcamp.findByIdAndUpdate(req.params.id, { photo: file.name });

      res.status(200).json({
         success: true,
         data: file.name
      });
   });

});