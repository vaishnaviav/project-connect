const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const Message = require('../models/Message');
const ErrorResponse = require('../utils/errorResponse');

// All routes are protected
router.use(protect);

/**
 * @desc    Get direct messages with a user
 * @route   GET /api/messages/direct/:userId
 * @access  Private
 */
router.get('/direct/:userId', async (req, res, next) => {
  try {
    const messages = await Message.find({
      messageType: 'direct',
      $or: [
        { sender: req.user.id, recipient: req.params.userId },
        { sender: req.params.userId, recipient: req.user.id }
      ],
      isDeleted: false
    })
    .populate('sender', 'name profilePicture')
    .populate('recipient', 'name profilePicture')
    .sort('createdAt');

    res.status(200).json({
      success: true,
      count: messages.length,
      data: messages
    });
  } catch (err) {
    next(err);
  }
});

/**
 * @desc    Get group messages
 * @route   GET /api/messages/group/:groupId
 * @access  Private
 */
router.get('/group/:groupId', async (req, res, next) => {
  try {
    const messages = await Message.find({
      messageType: 'group',
      group: req.params.groupId,
      isDeleted: false
    })
    .populate('sender', 'name profilePicture')
    .sort('createdAt')
    .limit(100);

    res.status(200).json({
      success: true,
      count: messages.length,
      data: messages
    });
  } catch (err) {
    next(err);
  }
});

/**
 * @desc    Mark messages as read
 * @route   PUT /api/messages/:messageId/read
 * @access  Private
 */
router.put('/:messageId/read', async (req, res, next) => {
  try {
    const message = await Message.findById(req.params.messageId);
    
    if (!message) {
      return next(new ErrorResponse('Message not found', 404));
    }

    message.markAsRead(req.user.id);
    await message.save();

    res.status(200).json({
      success: true,
      data: message
    });
  } catch (err) {
    next(err);
  }
});

/**
 * @desc    Delete message
 * @route   DELETE /api/messages/:messageId
 * @access  Private
 */
router.delete('/:messageId', async (req, res, next) => {
  try {
    const message = await Message.findById(req.params.messageId);
    
    if (!message) {
      return next(new ErrorResponse('Message not found', 404));
    }

    // Only sender can delete
    if (message.sender.toString() !== req.user.id) {
      return next(new ErrorResponse('Not authorized', 403));
    }

    message.isDeleted = true;
    message.deletedAt = Date.now();
    message.deletedBy = req.user.id;
    await message.save();

    res.status(200).json({
      success: true,
      data: {}
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;