const Message = require('../models/Message');
const User = require('../models/User');
const Group = require('../models/Group');
const ErrorResponse = require('../utils/errorResponse');
const logger = require('../utils/logger');

/**
 * @desc    Get direct messages between two users
 * @route   GET /api/messages/direct/:userId
 * @access  Private
 */
exports.getDirectMessages = async (req, res, next) => {
  try {
    const { userId } = req.params;
    const { page = 1, limit = 50 } = req.query;

    const skip = (page - 1) * limit;

    const messages = await Message.find({
      messageType: 'direct',
      $or: [
        { sender: req.user.id, recipient: userId },
        { sender: userId, recipient: req.user.id }
      ],
      isDeleted: false
    })
    .populate('sender', 'name profilePicture')
    .populate('recipient', 'name profilePicture')
    .sort('-createdAt')
    .skip(skip)
    .limit(parseInt(limit));

    const total = await Message.countDocuments({
      messageType: 'direct',
      $or: [
        { sender: req.user.id, recipient: userId },
        { sender: userId, recipient: req.user.id }
      ],
      isDeleted: false
    });

    res.status(200).json({
      success: true,
      count: messages.length,
      total,
      page: parseInt(page),
      pages: Math.ceil(total / limit),
      data: messages.reverse() // Return in chronological order
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Get group messages
 * @route   GET /api/messages/group/:groupId
 * @access  Private
 */
exports.getGroupMessages = async (req, res, next) => {
  try {
    const { groupId } = req.params;
    const { page = 1, limit = 50 } = req.query;

    // Verify user is group member
    const group = await Group.findById(groupId);
    if (!group) {
      return next(new ErrorResponse('Group not found', 404));
    }

    if (!group.isMember(req.user.id)) {
      return next(new ErrorResponse('Not authorized to view group messages', 403));
    }

    const skip = (page - 1) * limit;

    const messages = await Message.find({
      messageType: 'group',
      group: groupId,
      isDeleted: false
    })
    .populate('sender', 'name profilePicture')
    .sort('-createdAt')
    .skip(skip)
    .limit(parseInt(limit));

    const total = await Message.countDocuments({
      messageType: 'group',
      group: groupId,
      isDeleted: false
    });

    res.status(200).json({
      success: true,
      count: messages.length,
      total,
      page: parseInt(page),
      pages: Math.ceil(total / limit),
      data: messages.reverse()
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Send direct message
 * @route   POST /api/messages/direct
 * @access  Private
 */
exports.sendDirectMessage = async (req, res, next) => {
  try {
    const { recipientId, content, contentType, attachments } = req.body;

    // Verify recipient exists
    const recipient = await User.findById(recipientId);
    if (!recipient) {
      return next(new ErrorResponse('Recipient not found', 404));
    }

    const message = await Message.create({
      messageType: 'direct',
      sender: req.user.id,
      recipient: recipientId,
      content,
      contentType: contentType || 'text',
      attachments: attachments || []
    });

    await message.populate('sender', 'name profilePicture');
    await message.populate('recipient', 'name profilePicture');

    // Emit socket event (handled by socket.io)
    const io = req.app.get('io');
    if (io) {
      io.to(`user-${recipientId}`).emit('new-message', message);
    }

    res.status(201).json({
      success: true,
      data: message
    });

    logger.info(`Direct message sent from ${req.user.id} to ${recipientId}`);
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Send group message
 * @route   POST /api/messages/group
 * @access  Private
 */
exports.sendGroupMessage = async (req, res, next) => {
  try {
    const { groupId, content, contentType, attachments } = req.body;

    // Verify group exists and user is member
    const group = await Group.findById(groupId);
    if (!group) {
      return next(new ErrorResponse('Group not found', 404));
    }

    if (!group.isMember(req.user.id)) {
      return next(new ErrorResponse('Not authorized to send messages in this group', 403));
    }

    const message = await Message.create({
      messageType: 'group',
      sender: req.user.id,
      group: groupId,
      content,
      contentType: contentType || 'text',
      attachments: attachments || []
    });

    await message.populate('sender', 'name profilePicture');

    // Emit socket event to all group members
    const io = req.app.get('io');
    if (io) {
      io.to(`group-${groupId}`).emit('new-message', message);
    }

    res.status(201).json({
      success: true,
      data: message
    });

    logger.info(`Group message sent in ${groupId} by ${req.user.id}`);
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Mark message as read
 * @route   PUT /api/messages/:id/read
 * @access  Private
 */
exports.markAsRead = async (req, res, next) => {
  try {
    const message = await Message.findById(req.params.id);

    if (!message) {
      return next(new ErrorResponse('Message not found', 404));
    }

    // Only recipient can mark as read
    if (message.recipient && message.recipient.toString() !== req.user.id) {
      return next(new ErrorResponse('Not authorized', 403));
    }

    message.isRead = true;
    message.readAt = Date.now();
    await message.save();

    res.status(200).json({
      success: true,
      data: message
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Edit message
 * @route   PUT /api/messages/:id
 * @access  Private
 */
exports.editMessage = async (req, res, next) => {
  try {
    let message = await Message.findById(req.params.id);

    if (!message) {
      return next(new ErrorResponse('Message not found', 404));
    }

    // Only sender can edit
    if (message.sender.toString() !== req.user.id) {
      return next(new ErrorResponse('Not authorized to edit this message', 403));
    }

    message.content = req.body.content;
    message.isEdited = true;
    message.editedAt = Date.now();
    await message.save();

    res.status(200).json({
      success: true,
      data: message
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Delete message
 * @route   DELETE /api/messages/:id
 * @access  Private
 */
exports.deleteMessage = async (req, res, next) => {
  try {
    const message = await Message.findById(req.params.id);

    if (!message) {
      return next(new ErrorResponse('Message not found', 404));
    }

    // Only sender can delete
    if (message.sender.toString() !== req.user.id) {
      return next(new ErrorResponse('Not authorized to delete this message', 403));
    }

    message.isDeleted = true;
    message.deletedAt = Date.now();
    await message.save();

    res.status(200).json({
      success: true,
      data: {}
    });

    logger.info(`Message ${req.params.id} deleted by ${req.user.id}`);
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Add reaction to message
 * @route   POST /api/messages/:id/reactions
 * @access  Private
 */
exports.addReaction = async (req, res, next) => {
  try {
    const message = await Message.findById(req.params.id);

    if (!message) {
      return next(new ErrorResponse('Message not found', 404));
    }

    const { emoji } = req.body;

    // Check if user already reacted with this emoji
    const existingReaction = message.reactions.find(
      r => r.user.toString() === req.user.id && r.emoji === emoji
    );

    if (existingReaction) {
      return next(new ErrorResponse('Already reacted with this emoji', 400));
    }

    message.reactions.push({
      user: req.user.id,
      emoji
    });

    await message.save();

    res.status(200).json({
      success: true,
      data: message
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Remove reaction from message
 * @route   DELETE /api/messages/:id/reactions/:reactionId
 * @access  Private
 */
exports.removeReaction = async (req, res, next) => {
  try {
    const message = await Message.findById(req.params.id);

    if (!message) {
      return next(new ErrorResponse('Message not found', 404));
    }

    const reaction = message.reactions.id(req.params.reactionId);
    if (!reaction) {
      return next(new ErrorResponse('Reaction not found', 404));
    }

    // Only the user who reacted can remove it
    if (reaction.user.toString() !== req.user.id) {
      return next(new ErrorResponse('Not authorized', 403));
    }

    reaction.remove();
    await message.save();

    res.status(200).json({
      success: true,
      data: {}
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Get unread message count
 * @route   GET /api/messages/unread/count
 * @access  Private
 */
exports.getUnreadCount = async (req, res, next) => {
  try {
    const count = await Message.countDocuments({
      recipient: req.user.id,
      isRead: false,
      isDeleted: false
    });

    res.status(200).json({
      success: true,
      data: {
        unreadCount: count
      }
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Get all conversations (direct + group)
 * @route   GET /api/messages/conversations
 * @access  Private
 */
exports.getConversations = async (req, res, next) => {
  try {
    // Get direct message conversations
    const directMessages = await Message.aggregate([
      {
        $match: {
          $or: [
            { sender: req.user._id },
            { recipient: req.user._id }
          ],
          messageType: 'direct',
          isDeleted: false
        }
      },
      {
        $sort: { createdAt: -1 }
      },
      {
        $group: {
          _id: {
            $cond: [
              { $eq: ['$sender', req.user._id] },
              '$recipient',
              '$sender'
            ]
          },
          lastMessage: { $first: '$content' },
          lastMessageTime: { $first: '$createdAt' },
          unreadCount: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $eq: ['$recipient', req.user._id] },
                    { $eq: ['$isRead', false] }
                  ]
                },
                1,
                0
              ]
            }
          }
        }
      }
    ]);

    // Populate user details
    await Message.populate(directMessages, {
      path: '_id',
      select: 'name profilePicture email'
    });

    // Get group conversations (user's groups)
    const groups = await Group.find({
      'members.user': req.user.id
    }).select('name projectTitle');

    const conversations = [
      ...directMessages.map(conv => ({
        type: 'direct',
        userId: conv._id._id,
        name: conv._id.name,
        profilePicture: conv._id.profilePicture,
        lastMessage: conv.lastMessage,
        lastMessageTime: conv.lastMessageTime,
        unreadCount: conv.unreadCount
      })),
      ...groups.map(group => ({
        type: 'group',
        groupId: group._id,
        name: group.name,
        lastMessage: null,
        lastMessageTime: null,
        unreadCount: 0
      }))
    ];

    // Sort by last message time
    conversations.sort((a, b) => {
      const timeA = a.lastMessageTime || new Date(0);
      const timeB = b.lastMessageTime || new Date(0);
      return timeB - timeA;
    });

    res.status(200).json({
      success: true,
      count: conversations.length,
      data: conversations
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Search messages
 * @route   GET /api/messages/search
 * @access  Private
 */
exports.searchMessages = async (req, res, next) => {
  try {
    const { query, messageType } = req.query;

    if (!query) {
      return next(new ErrorResponse('Please provide search query', 400));
    }

    const searchQuery = {
      $or: [
        { sender: req.user.id },
        { recipient: req.user.id }
      ],
      content: { $regex: query, $options: 'i' },
      isDeleted: false
    };

    if (messageType) {
      searchQuery.messageType = messageType;
    }

    const messages = await Message.find(searchQuery)
      .populate('sender', 'name profilePicture')
      .populate('recipient', 'name profilePicture')
      .populate('group', 'name')
      .sort('-createdAt')
      .limit(50);

    res.status(200).json({
      success: true,
      count: messages.length,
      data: messages
    });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getDirectMessages: exports.getDirectMessages,
  getGroupMessages: exports.getGroupMessages,
  sendDirectMessage: exports.sendDirectMessage,
  sendGroupMessage: exports.sendGroupMessage,
  markAsRead: exports.markAsRead,
  editMessage: exports.editMessage,
  deleteMessage: exports.deleteMessage,
  addReaction: exports.addReaction,
  removeReaction: exports.removeReaction,
  getUnreadCount: exports.getUnreadCount,
  getConversations: exports.getConversations,
  searchMessages: exports.searchMessages
};
