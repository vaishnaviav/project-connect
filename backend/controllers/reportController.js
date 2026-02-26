const Report = require('../models/Report');
const User = require('../models/User');
const Group = require('../models/Group');
const ErrorResponse = require('../utils/errorResponse');
const logger = require('../utils/logger');

/**
 * @desc    Create a report
 * @route   POST /api/reports
 * @access  Private
 */
exports.createReport = async (req, res, next) => {
  try {
    req.body.reporter = req.user.id;

    // Verify reported entity exists
    if (req.body.reportedUser) {
      const user = await User.findById(req.body.reportedUser);
      if (!user) {
        return next(new ErrorResponse('Reported user not found', 404));
      }
    }

    if (req.body.reportedGroup) {
      const group = await Group.findById(req.body.reportedGroup);
      if (!group) {
        return next(new ErrorResponse('Reported group not found', 404));
      }
    }

    const report = await Report.create(req.body);

    await report.populate('reporter', 'name email');
    await report.populate('reportedUser', 'name email');
    await report.populate('reportedGroup', 'name');

    res.status(201).json({
      success: true,
      data: report
    });

    logger.info(`Report created by ${req.user.id}`);
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Get all reports (admin only)
 * @route   GET /api/reports
 * @access  Private/Admin
 */
exports.getReports = async (req, res, next) => {
  try {
    const { status, reportType, severity } = req.query;

    const query = {};
    if (status) query.status = status;
    if (reportType) query.reportType = reportType;
    if (severity) query.severity = severity;

    const reports = await Report.find(query)
      .populate('reporter', 'name email')
      .populate('reportedUser', 'name email')
      .populate('reportedGroup', 'name')
      .populate('resolvedBy', 'name email')
      .sort('-createdAt');

    res.status(200).json({
      success: true,
      count: reports.length,
      data: reports
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Get single report
 * @route   GET /api/reports/:id
 * @access  Private
 */
exports.getReport = async (req, res, next) => {
  try {
    const report = await Report.findById(req.params.id)
      .populate('reporter', 'name email')
      .populate('reportedUser', 'name email')
      .populate('reportedGroup', 'name')
      .populate('resolvedBy', 'name email');

    if (!report) {
      return next(new ErrorResponse('Report not found', 404));
    }

    // Only admin, reporter, or reported user can view
    if (
      req.user.role !== 'admin' &&
      report.reporter.toString() !== req.user.id &&
      report.reportedUser?.toString() !== req.user.id
    ) {
      return next(new ErrorResponse('Not authorized', 403));
    }

    res.status(200).json({
      success: true,
      data: report
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Get my reports (reports I created)
 * @route   GET /api/reports/my-reports
 * @access  Private
 */
exports.getMyReports = async (req, res, next) => {
  try {
    const reports = await Report.find({ reporter: req.user.id })
      .populate('reportedUser', 'name email')
      .populate('reportedGroup', 'name')
      .populate('resolvedBy', 'name email')
      .sort('-createdAt');

    res.status(200).json({
      success: true,
      count: reports.length,
      data: reports
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Update report
 * @route   PUT /api/reports/:id
 * @access  Private/Admin
 */
exports.updateReport = async (req, res, next) => {
  try {
    let report = await Report.findById(req.params.id);

    if (!report) {
      return next(new ErrorResponse('Report not found', 404));
    }

    // Only admin can update
    if (req.user.role !== 'admin') {
      return next(new ErrorResponse('Not authorized', 403));
    }

    report = await Report.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true
    });

    res.status(200).json({
      success: true,
      data: report
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Take action on report
 * @route   POST /api/reports/:id/action
 * @access  Private/Admin
 */
exports.takeAction = async (req, res, next) => {
  try {
    const report = await Report.findById(req.params.id);

    if (!report) {
      return next(new ErrorResponse('Report not found', 404));
    }

    const { action, actionDetails } = req.body;

    report.status = 'resolved';
    report.resolvedBy = req.user.id;
    report.resolvedAt = Date.now();
    report.actionTaken = action;
    report.actionDetails = actionDetails;

    await report.save();

    // Take actual action based on action type
    if (action === 'ban' && report.reportedUser) {
      await User.findByIdAndUpdate(report.reportedUser, {
        status: 'banned',
        bannedAt: Date.now(),
        banReason: report.reason
      });
    }

    if (action === 'suspend' && report.reportedUser) {
      await User.findByIdAndUpdate(report.reportedUser, {
        status: 'suspended',
        suspendedAt: Date.now(),
        suspensionReason: report.reason
      });
    }

    if (action === 'delete' && report.reportedGroup) {
      await Group.findByIdAndDelete(report.reportedGroup);
    }

    res.status(200).json({
      success: true,
      data: report
    });

    logger.info(`Action ${action} taken on report ${req.params.id} by ${req.user.id}`);
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Delete report
 * @route   DELETE /api/reports/:id
 * @access  Private/Admin
 */
exports.deleteReport = async (req, res, next) => {
  try {
    const report = await Report.findById(req.params.id);

    if (!report) {
      return next(new ErrorResponse('Report not found', 404));
    }

    // Only admin can delete
    if (req.user.role !== 'admin') {
      return next(new ErrorResponse('Not authorized', 403));
    }

    await report.deleteOne();

    res.status(200).json({
      success: true,
      data: {}
    });

    logger.info(`Report ${req.params.id} deleted by ${req.user.id}`);
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Get report statistics
 * @route   GET /api/reports/stats
 * @access  Private/Admin
 */
exports.getReportStats = async (req, res, next) => {
  try {
    const stats = await Report.aggregate([
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      }
    ]);

    const byType = await Report.aggregate([
      {
        $group: {
          _id: '$reportType',
          count: { $sum: 1 }
        }
      }
    ]);

    const bySeverity = await Report.aggregate([
      {
        $group: {
          _id: '$severity',
          count: { $sum: 1 }
        }
      }
    ]);

    res.status(200).json({
      success: true,
      data: {
        byStatus: stats,
        byType,
        bySeverity
      }
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Escalate report
 * @route   POST /api/reports/:id/escalate
 * @access  Private/Admin
 */
exports.escalateReport = async (req, res, next) => {
  try {
    const report = await Report.findById(req.params.id);

    if (!report) {
      return next(new ErrorResponse('Report not found', 404));
    }

    report.severity = 'critical';
    report.status = 'escalated';
    await report.save();

    res.status(200).json({
      success: true,
      data: report
    });

    logger.info(`Report ${req.params.id} escalated by ${req.user.id}`);
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Appeal a report decision
 * @route   POST /api/reports/:id/appeal
 * @access  Private
 */
exports.appealReport = async (req, res, next) => {
  try {
    const report = await Report.findById(req.params.id);

    if (!report) {
      return next(new ErrorResponse('Report not found', 404));
    }

    // Only reported user can appeal
    if (report.reportedUser?.toString() !== req.user.id) {
      return next(new ErrorResponse('Not authorized', 403));
    }

    if (report.status !== 'resolved') {
      return next(new ErrorResponse('Can only appeal resolved reports', 400));
    }

    report.appealStatus = 'pending';
    report.appealMessage = req.body.message;
    report.appealedAt = Date.now();
    await report.save();

    res.status(200).json({
      success: true,
      data: report
    });

    logger.info(`Report ${req.params.id} appealed by ${req.user.id}`);
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Review appeal (admin)
 * @route   POST /api/reports/:id/review-appeal
 * @access  Private/Admin
 */
exports.reviewAppeal = async (req, res, next) => {
  try {
    const report = await Report.findById(req.params.id);

    if (!report) {
      return next(new ErrorResponse('Report not found', 404));
    }

    const { decision, reviewMessage } = req.body;

    report.appealStatus = decision;
    report.appealReviewedBy = req.user.id;
    report.appealReviewedAt = Date.now();
    report.appealReviewMessage = reviewMessage;

    if (decision === 'approved') {
      // Reverse the action
      if (report.actionTaken === 'ban' && report.reportedUser) {
        await User.findByIdAndUpdate(report.reportedUser, {
          status: 'active',
          bannedAt: null,
          banReason: null
        });
      }
    }

    await report.save();

    res.status(200).json({
      success: true,
      data: report
    });

    logger.info(`Appeal for report ${req.params.id} reviewed by ${req.user.id}`);
  } catch (err) {
    next(err);
  }
};

module.exports = {
  createReport: exports.createReport,
  getReports: exports.getReports,
  getReport: exports.getReport,
  getMyReports: exports.getMyReports,
  updateReport: exports.updateReport,
  takeAction: exports.takeAction,
  deleteReport: exports.deleteReport,
  getReportStats: exports.getReportStats,
  escalateReport: exports.escalateReport,
  appealReport: exports.appealReport,
  reviewAppeal: exports.reviewAppeal
};