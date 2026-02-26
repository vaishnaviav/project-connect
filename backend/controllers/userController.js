const User = require('../models/User');
const ErrorResponse = require('../utils/errorResponse');
const logger = require('../utils/logger');

/**
 * @desc    Get all users with filtering, sorting, and pagination
 * @route   GET /api/users
 * @access  Private
 */
exports.getUsers = async (req, res, next) => {
  try {
    // Copy req.query
    const reqQuery = { ...req.query };

    // Fields to exclude from filtering
    const removeFields = ['select', 'sort', 'page', 'limit'];
    removeFields.forEach(param => delete reqQuery[param]);

    // Ensure only active, non-banned users are returned
    reqQuery.isActive = true;
    reqQuery.isBanned = false;

    // Create query string
    let queryStr = JSON.stringify(reqQuery);

    // Create operators ($gt, $gte, etc)
    queryStr = queryStr.replace(/\b(gt|gte|lt|lte|in)\b/g, match => `$${match}`);

    // Finding resource
    let query = User.find(JSON.parse(queryStr)).select('-password');

    // Select Fields
    if (req.query.select) {
      const fields = req.query.select.split(',').join(' ');
      query = query.select(fields);
    }

    // Sort
    if (req.query.sort) {
      const sortBy = req.query.sort.split(',').join(' ');
      query = query.sort(sortBy);
    } else {
      query = query.sort('-reputationScore -createdAt');
    }

    // Pagination
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 20;
    const startIndex = (page - 1) * limit;
    const endIndex = page * limit;
    const total = await User.countDocuments(JSON.parse(queryStr));

    query = query.skip(startIndex).limit(limit);

    // Execute query
    const users = query;

    // Pagination result
    const pagination = {};

    if (endIndex < total) {
      pagination.next = {
        page: page + 1,
        limit
      };
    }

    if (startIndex > 0) {
      pagination.prev = {
        page: page - 1,
        limit
      };
    }

    res.status(200).json({
      success: true,
      count: users.length,
      pagination,
      data: await users
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Get single user
 * @route   GET /api/users/:id
 * @access  Private
 */
exports.getUser = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id)
      .populate('groups', 'name projectTitle groupImage status')
      .select('-password');

    if (!user) {
      return next(new ErrorResponse(`User not found with id of ${req.params.id}`, 404));
    }

    res.status(200).json({
      success: true,
      data: user
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Search users by skills, interests, or name
 * @route   GET /api/users/search/:query
 * @access  Private
 */
exports.searchUsers = async (req, res, next) => {
  try {
    const searchQuery = req.params.query;

    const users = await User.find({
      $and: [
        {
          $or: [
            { name: { $regex: searchQuery, $options: 'i' } },
            { 'skills.name': { $regex: searchQuery, $options: 'i' } },
            { interests: { $regex: searchQuery, $options: 'i' } },
            { department: { $regex: searchQuery, $options: 'i' } }
          ]
        },
        { isActive: true, isBanned: false }
      ]
    })
    .select('-password')
    .limit(20);

    res.status(200).json({
      success: true,
      count: users.length,
      data: users
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Update user skills
 * @route   PUT /api/users/skills
 * @access  Private
 */
exports.updateSkills = async (req, res, next) => {
  try {
    const { skills } = req.body;

    const user = await User.findByIdAndUpdate(
      req.user.id,
      { skills },
      { new: true, runValidators: true }
    ).select('-password');

    res.status(200).json({
      success: true,
      data: user
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Update user interests
 * @route   PUT /api/users/interests
 * @access  Private
 */
exports.updateInterests = async (req, res, next) => {
  try {
    const { interests } = req.body;

    const user = await User.findByIdAndUpdate(
      req.user.id,
      { interests },
      { new: true, runValidators: true }
    ).select('-password');

    res.status(200).json({
      success: true,
      data: user
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Update user availability
 * @route   PUT /api/users/availability
 * @access  Private
 */
exports.updateAvailability = async (req, res, next) => {
  try {
    const { availability } = req.body;

    const user = await User.findByIdAndUpdate(
      req.user.id,
      { availability },
      { new: true, runValidators: true }
    ).select('-password');

    res.status(200).json({
      success: true,
      data: user
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Update project preferences
 * @route   PUT /api/users/preferences
 * @access  Private
 */
exports.updateProjectPreferences = async (req, res, next) => {
  try {
    const { projectPreferences } = req.body;

    const user = await User.findByIdAndUpdate(
      req.user.id,
      { projectPreferences },
      { new: true, runValidators: true }
    ).select('-password');

    res.status(200).json({
      success: true,
      data: user
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Rate a user
 * @route   POST /api/users/:id/rate
 * @access  Private
 */
exports.rateUser = async (req, res, next) => {
  try {
    const { rating, comment } = req.body;
    const userToRate = await User.findById(req.params.id);

    if (!userToRate) {
      return next(new ErrorResponse(`User not found with id of ${req.params.id}`, 404));
    }

    // Check if user has already rated
    const existingRating = userToRate.ratings.find(
      r => r.ratedBy.toString() === req.user.id
    );

    if (existingRating) {
      return next(new ErrorResponse('You have already rated this user', 400));
    }

    // Add rating
    userToRate.ratings.push({
      ratedBy: req.user.id,
      rating,
      comment
    });

    // Update reputation score
    userToRate.updateReputation();
    await userToRate.save();

    res.status(200).json({
      success: true,
      data: userToRate
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Get user ratings
 * @route   GET /api/users/:id/ratings
 * @access  Private
 */
exports.getUserRatings = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id)
      .populate('ratings.ratedBy', 'name profilePicture')
      .select('ratings reputationScore');

    if (!user) {
      return next(new ErrorResponse(`User not found with id of ${req.params.id}`, 404));
    }

    res.status(200).json({
      success: true,
      data: {
        ratings: user.ratings,
        reputationScore: user.reputationScore,
        averageRating: user.calculateAverageRating()
      }
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Upload profile picture
 * @route   PUT /api/users/profile-picture
 * @access  Private
 */
exports.uploadProfilePicture = async (req, res, next) => {
  try {
    if (!req.file) {
      return next(new ErrorResponse('Please upload a file', 400));
    }

    // File URL will be provided by multer/cloudinary middleware
    const profilePicture = req.file.path;

    const user = await User.findByIdAndUpdate(
      req.user.id,
      { profilePicture },
      { new: true }
    ).select('-password');

    res.status(200).json({
      success: true,
      data: user
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Get user statistics
 * @route   GET /api/users/:id/stats
 * @access  Private
 */
exports.getUserStats = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id)
      .populate('groups')
      .select('-password');

    if (!user) {
      return next(new ErrorResponse(`User not found with id of ${req.params.id}`, 404));
    }

    const stats = {
      totalGroups: user.groups.length,
      activeGroups: user.groups.filter(g => g.status === 'In Progress').length,
      completedProjects: user.completedProjects,
      reputationScore: user.reputationScore,
      averageRating: user.calculateAverageRating(),
      totalRatings: user.ratings.length,
      memberSince: user.createdAt
    };

    res.status(200).json({
      success: true,
      data: stats
    });
  } catch (err) {
    next(err);
  }
};