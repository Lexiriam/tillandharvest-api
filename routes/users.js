const express = require('express');
const { 
   getUsers,
   getUser,
   createUser,
   updateUser,
   deleteUser
   
} = require('../controllers/users');

const User = require('../models/User');
const router = express.Router( { mergeParams: true } );

const advancedResults = require('../middleware/advancedResults');

// after initializing, to use protect, it must be added as a first parameter
const { protect, authorize } = require('../middleware/auth');

router.use(protect);  // anything below this will use protect
router.use(authorize('admin'));  // anything below this will use protect

router
   .route('/')
      .get(advancedResults(User), getUsers)
      .post(createUser);

router
   .route('/:id')
      .get(getUser)
      .put(updateUser)
      .delete(deleteUser);
   
module.exports = router;

