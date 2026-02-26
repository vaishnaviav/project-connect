const User = require('../models/User');
const Group = require('../models/Group');
const Task = require('../models/Task');
const Message = require('../models/Message');
const Report = require('../models/Report');
const ErrorResponse = require('../utils/errorResponse');
const logger = require('../utils/logger');

/**
 * @desc    Get system statistics
 * @route   GET /api/admin/stats
 * @access  Private/Admin
 */
exports.getSystemStats = async (req, res, next) => {
  try {
    const totalUsers = await User.countDocuments();
    const activeUsers = await User.countDocuments({ status: 'active' });
    const totalGroups = await Group.countDocuments();
    const activeGroups = await Group.countDocuments({ status: 'active' });
    const totalTasks = await Task.countDocuments();
    const completedTasks = await Task.countDocuments({ status: 'completed' });
    const totalMessages = await Message.countDocuments();
    const pendingReports = await Report.countDocuments({ status: 'pending' });

    // Get recent registrations (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const recentRegistrations = await User.countDocuments({
      createdAt: { $gte: thirtyDaysAgo }
    });

    res.status(200).json({
      success: true,
      data: {
        users: {
          total: totalUsers,
          active: activeUsers,
          recentRegistrations
        },
        groups: {
          total: totalGroups,
          active: activeGroups
        },
        tasks: {
          total: totalTasks,
          completed: completedTasks,
          completionRate: totalTasks > 0 ? ((completedTasks / totalTasks) * 100).toFixed(2) : 0
        },
        messages: {
          total: totalMessages
        },
        reports: {
          pending: pendingReports
        }
      }
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Get all users (admin view)
 * @route   GET /api/admin/users
 * @access  Private/Admin
 */
exports.getAllUsers = async (req, res, next) => {
  try {
    const { status, role, page = 1, limit = 20 } = req.query;

    const query = {};
    if (status) query.status = status;
    if (role) query.role = role;

    const skip = (page - 1) * limit;

    const users = await User.find(query)
      .select('+email +status')
      .sort('-createdAt')
      .skip(skip)
      .limit(parseInt(limit));

    const total = await User.countDocuments(query);

    res.status(200).json({
      success: true,
      count: users.length,
      total,
      page: parseInt(page),
      pages: Math.ceil(total / limit),
      data: users
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Ban user
 * @route   POST /api/admin/users/:id/ban
 * @access  Private/Admin
 */
exports.banUser = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id);

    if (!user) {
      return next(new ErrorResponse('User not found', 404));
    }

    if (user.role === 'admin') {
      return next(new ErrorResponse('Cannot ban an admin', 400));
    }

    user.status = 'banned';
    user.bannedAt = Date.now();
    user.banReason = req.body.reason || 'Violation of terms';
    await user.save();

    res.status(200).json({
      success: true,
      data: user
    });

    logger.info(`User ${req.params.id} banned by admin ${req.user.id}`);
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Unban user
 * @route   POST /api/admin/users/:id/unban
 * @access  Private/Admin
 */
exports.unbanUser = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id);

    if (!user) {
      return next(new ErrorResponse('User not found', 404));
    }

    user.status = 'active';
    user.bannedAt = null;
    user.banReason = null;
    await user.save();

    res.status(200).json({
      success: true,
      data: user
    });

    logger.info(`User ${req.params.id} unbanned by admin ${req.user.id}`);
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Suspend user
 * @route   POST /api/admin/users/:id/suspend
 * @access  Private/Admin
 */
exports.suspendUser = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id);

    if (!user) {
      return next(new ErrorResponse('User not found', 404));
    }

    if (user.role === 'admin') {
      return next(new ErrorResponse('Cannot suspend an admin', 400));
    }

    user.status = 'suspended';
    user.suspendedAt = Date.now();
    user.suspensionReason = req.body.reason || 'Temporary suspension';
    user.suspensionDuration = req.body.duration || 7; // days
    await user.save();

    res.status(200).json({
      success: true,
      data: user
    });

    logger.info(`User ${req.params.id} suspended by admin ${req.user.id}`);
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Activate user
 * @route   POST /api/admin/users/:id/activate
 * @access  Private/Admin
 */
exports.activateUser = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id);

    if (!user) {
      return next(new ErrorResponse('User not found', 404));
    }

    user.status = 'active';
    user.suspendedAt = null;
    user.suspensionReason = null;
    await user.save();

    res.status(200).json({
      success: true,
      data: user
    });

    logger.info(`User ${req.params.id} activated by admin ${req.user.id}`);
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Delete user
 * @route   DELETE /api/admin/users/:id
 * @access  Private/Admin
 */
exports.deleteUser = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id);

    if (!user) {
      return next(new ErrorResponse('User not found', 404));
    }

    if (user.role === 'admin') {
      return next(new ErrorResponse('Cannot delete an admin', 400));
    }

    await user.deleteOne();

    res.status(200).json({
      success: true,
      data: {}
    });

    logger.info(`User ${req.params.id} deleted by admin ${req.user.id}`);
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Get all groups (admin view)
 * @route   GET /api/admin/groups
 * @access  Private/Admin
 */
exports.getAllGroups = async (req, res, next) => {
  try {
    const { status, projectType, page = 1, limit = 20 } = req.query;

    const query = {};
    if (status) query.status = status;
    if (projectType) query.projectType = projectType;

    const skip = (page - 1) * limit;

    const groups = await Group.find(query)
      .populate('creator', 'name email')
      .sort('-createdAt')
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Group.countDocuments(query);

    res.status(200).json({
      success: true,
      count: groups.length,
      total,
      page: parseInt(page),
      pages: Math.ceil(total / limit),
      data: groups
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Deactivate group
 * @route   POST /api/admin/groups/:id/deactivate
 * @access  Private/Admin
 */
exports.deactivateGroup = async (req, res, next) => {
  try {
    const group = await Group.findById(req.params.id);

    if (!group) {
      return next(new ErrorResponse('Group not found', 404));
    }

    group.status = 'suspended';
    await group.save();

    res.status(200).json({
      success: true,
      data: group
    });

    logger.info(`Group ${req.params.id} deactivated by admin ${req.user.id}`);
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Delete group
 * @route   DELETE /api/admin/groups/:id
 * @access  Private/Admin
 */
exports.deleteGroup = async (req, res, next) => {
  try {
    const group = await Group.findById(req.params.id);

    if (!group) {
      return next(new ErrorResponse('Group not found', 404));
    }

    await group.deleteOne();

    res.status(200).json({
      success: true,
      data: {}
    });

    logger.info(`Group ${req.params.id} deleted by admin ${req.user.id}`);
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Get recent activity
 * @route   GET /api/admin/activity
 * @access  Private/Admin
 */
exports.getRecentActivity = async (req, res, next) => {
  try {
    const { limit = 50 } = req.query;

    // Get recent users
    const recentUsers = await User.find()
      .select('name email createdAt')
      .sort('-createdAt')
      .limit(10);

    // Get recent groups
    const recentGroups = await Group.find()
      .select('name creator createdAt')
      .populate('creator', 'name')
      .sort('-createdAt')
      .limit(10);

    // Get recent reports
    const recentReports = await Report.find()
      .select('reportType severity status createdAt')
      .sort('-createdAt')
      .limit(10);

    res.status(200).json({
      success: true,
      data: {
        recentUsers,
        recentGroups,
        recentReports
      }
    });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getSystemStats: exports.getSystemStats,
  getAllUsers: exports.getAllUsers,
  banUser: exports.banUser,
  unbanUser: exports.unbanUser,
  suspendUser: exports.suspendUser,
  activateUser: exports.activateUser,
  deleteUser: exports.deleteUser,
  getAllGroups: exports.getAllGroups,
  deactivateGroup: exports.deactivateGroup,
  deleteGroup: exports.deleteGroup,
  getRecentActivity: exports.getRecentActivity
};