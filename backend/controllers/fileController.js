const cloudinary = require('cloudinary').v2;
const multer = require('multer');
const ErrorResponse = require('../utils/errorResponse');
const Group = require('../models/Group');
const logger = require('../utils/logger');

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

/**
 * @desc    Upload file
 * @route   POST /api/files/upload
 * @access  Private
 */
exports.uploadFile = async (req, res, next) => {
  try {
    if (!req.file) {
      return next(new ErrorResponse('Please upload a file', 400));
    }

    // Upload to Cloudinary
    const result = await cloudinary.uploader.upload(req.file.path, {
      folder: 'project-connect',
      resource_type: 'auto'
    });

    res.status(200).json({
      success: true,
      data: {
        fileName: req.file.originalname,
        fileUrl: result.secure_url,
        fileType: req.file.mimetype,
        fileSize: req.file.size,
        publicId: result.public_id
      }
    });

    logger.info(`File uploaded by ${req.user.id}`);
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Get files for a group
 * @route   GET /api/files/group/:groupId
 * @access  Private
 */
exports.getGroupFiles = async (req, res, next) => {
  try {
    const { groupId } = req.params;

    // Verify user is group member
    const group = await Group.findById(groupId);
    if (!group) {
      return next(new ErrorResponse('Group not found', 404));
    }

    if (!group.isMember(req.user.id)) {
      return next(new ErrorResponse('Not authorized', 403));
    }

    // Get files from group's file array or tasks
    const files = group.files || [];

    res.status(200).json({
      success: true,
      count: files.length,
      data: files
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Delete file
 * @route   DELETE /api/files/:publicId
 * @access  Private
 */
exports.deleteFile = async (req, res, next) => {
  try {
    const { publicId } = req.params;

    // Delete from Cloudinary
    await cloudinary.uploader.destroy(publicId);

    res.status(200).json({
      success: true,
      data: {}
    });

    logger.info(`File ${publicId} deleted by ${req.user.id}`);
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Get my uploaded files
 * @route   GET /api/files/my-files
 * @access  Private
 */
exports.getMyFiles = async (req, res, next) => {
  try {
    // This would require tracking uploaded files in user model or separate collection
    // For now, return empty array
    res.status(200).json({
      success: true,
      count: 0,
      data: []
    });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  uploadFile: exports.uploadFile,
  getGroupFiles: exports.getGroupFiles,
  deleteFile: exports.deleteFile,
  getMyFiles: exports.getMyFiles
};