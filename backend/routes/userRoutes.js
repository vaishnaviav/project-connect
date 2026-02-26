const express = require('express');
const {
  getUsers,
  getUser,
  searchUsers,
  updateSkills,
  updateInterests,
  updateAvailability,
  updateProjectPreferences,
  rateUser,
  getUserRatings,
  uploadProfilePicture,
  getUserStats
} = require('../controllers/userController');

const router = express.Router();
const { protect } = require('../middleware/auth');

// All routes are protected
router.use(protect);

router.route('/')
  .get(getUsers);

router.route('/:id')
  .get(getUser);

router.route('/search/:query')
  .get(searchUsers);

router.route('/skills')
  .put(updateSkills);

router.route('/interests')
  .put(updateInterests);

router.route('/availability')
  .put(updateAvailability);

router.route('/preferences')
  .put(updateProjectPreferences);

router.route('/:id/rate')
  .post(rateUser);

router.route('/:id/ratings')
  .get(getUserRatings);

router.route('/profile-picture')
  .put(uploadProfilePicture);

router.route('/:id/stats')
  .get(getUserStats);

module.exports = router;