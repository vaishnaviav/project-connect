const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const {
  findMatchingPartners,
  findMatchingGroups,
  getRecommendedUsers
} = require('../utils/matchingAlgorithm');

// All routes are protected
router.use(protect);

/**
 * @desc    Find matching partners for current user
 * @route   GET /api/matches/partners
 * @access  Private
 */
router.get('/partners', async (req, res, next) => {
  try {
    const limit = parseInt(req.query.limit) || 10;
    const matches = await findMatchingPartners(req.user.id, limit);

    res.status(200).json({
      success: true,
      count: matches.length,
      data: matches
    });
  } catch (err) {
    next(err);
  }
});

/**
 * @desc    Find matching groups for current user
 * @route   GET /api/matches/groups
 * @access  Private
 */
router.get('/groups', async (req, res, next) => {
  try {
    const limit = parseInt(req.query.limit) || 10;
    const matches = await findMatchingGroups(req.user.id, limit);

    res.status(200).json({
      success: true,
      count: matches.length,
      data: matches
    });
  } catch (err) {
    next(err);
  }
});

/**
 * @desc    Get recommended users based on collaborative filtering
 * @route   GET /api/matches/recommended
 * @access  Private
 */
router.get('/recommended', async (req, res, next) => {
  try {
    const limit = parseInt(req.query.limit) || 10;
    const recommended = await getRecommendedUsers(req.user.id, limit);

    res.status(200).json({
      success: true,
      count: recommended.length,
      data: recommended
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;