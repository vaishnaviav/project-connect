const Group = require('../models/Group');
const User = require('../models/User');
const ErrorResponse = require('../utils/errorResponse');
const logger = require('../utils/logger');

/**
 * @desc    Get all groups with filtering and pagination
 * @route   GET /api/groups
 * @access  Private
 */
/**
 * @desc    Get all groups
 * @route   GET /api/groups
 * @access  Public
 */
exports.getGroups = async (req, res, next) => {
  try {
    const { projectType, status, isPrivate, page = 1, limit = 20 } = req.query;

    const query = {};
    
    // Only add filters if they have actual values
    if (projectType) query.projectType = projectType;
    if (status) query.status = status;
    
    // Fix for isPrivate - only add if it's a valid boolean value
    if (isPrivate === 'true') {
      query.isPrivate = true;
    } else if (isPrivate === 'false') {
      query.isPrivate = false;
    }
    // If isPrivate is empty string or undefined, don't add it to query

    const skip = (page - 1) * limit;

    const groups = await Group.find(query)
      .populate('creator', 'name email')
      .populate('members.user', 'name profilePicture')
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
    console.error('getGroups error:', err);
    next(err);
  }
};
exports.getGroup = async (req, res, next) => {
  try {
    const group = await Group.findById(req.params.id)
      .populate('creator', 'name profilePicture email')
      .populate('members.user', 'name profilePicture email skills reputationScore')
      .populate('joinRequests.user', 'name profilePicture email skills');

    if (!group) {
      return next(new ErrorResponse(`Group not found with id of ${req.params.id}`, 404));
    }

    res.status(200).json({
      success: true,
      data: group
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Create new group
 * @route   POST /api/groups
 * @access  Private
 */
exports.createGroup = async (req, res, next) => {
  try {
    // Add creator to req.body
    req.body.creator = req.user.id;
    
    // Add creator as first member with Leader role
    req.body.members = [{
      user: req.user.id,
      role: 'Leader'
    }];

    const group = await Group.create(req.body);

    // Add group to user's groups
    await User.findByIdAndUpdate(req.user.id, {
      $push: { groups: group._id }
    });

    res.status(201).json({
      success: true,
      data: group
    });

    logger.info(`New group created: ${group.name} by user ${req.user.email}`);
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Update group
 * @route   PUT /api/groups/:id
 * @access  Private (Group Leader only)
 */
exports.updateGroup = async (req, res, next) => {
  try {
    let group = await Group.findById(req.params.id);

    if (!group) {
      return next(new ErrorResponse(`Group not found with id of ${req.params.id}`, 404));
    }

    // Check if user is group leader
    if (!group.isLeader(req.user.id) && req.user.role !== 'admin') {
      return next(new ErrorResponse('Not authorized to update this group', 403));
    }

    group = await Group.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true
    });

    res.status(200).json({
      success: true,
      data: group
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Delete group
 * @route   DELETE /api/groups/:id
 * @access  Private (Group Creator only)
 */
exports.deleteGroup = async (req, res, next) => {
  try {
    const group = await Group.findById(req.params.id);

    if (!group) {
      return next(new ErrorResponse(`Group not found with id of ${req.params.id}`, 404));
    }

    // Check if user is creator or admin
    if (group.creator.toString() !== req.user.id && req.user.role !== 'admin') {
      return next(new ErrorResponse('Not authorized to delete this group', 403));
    }

    // Remove group from all members' groups array
    await User.updateMany(
      { groups: group._id },
      { $pull: { groups: group._id } }
    );

    await group.deleteOne();

    res.status(200).json({
      success: true,
      data: {}
    });

    logger.info(`Group deleted: ${group.name}`);
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Request to join group
 * @route   POST /api/groups/:id/join-request
 * @access  Private
 */
exports.requestJoinGroup = async (req, res, next) => {
  try {
    const group = await Group.findById(req.params.id);

    if (!group) {
      return next(new ErrorResponse(`Group not found with id of ${req.params.id}`, 404));
    }

    // Check if group is full
    if (group.isFull()) {
      return next(new ErrorResponse('Group is full', 400));
    }

    // Check if already a member
    if (group.isMember(req.user.id)) {
      return next(new ErrorResponse('You are already a member of this group', 400));
    }

    // Check if already requested
    const existingRequest = group.joinRequests.find(
      r => r.user.toString() === req.user.id && r.status === 'pending'
    );

    if (existingRequest) {
      return next(new ErrorResponse('You have already requested to join this group', 400));
    }

    // Add join request
    group.joinRequests.push({
      user: req.user.id,
      message: req.body.message
    });

    await group.save();

    res.status(200).json({
      success: true,
      data: group
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Approve join request
 * @route   PUT /api/groups/:id/join-request/:requestId/approve
 * @access  Private (Group Leader only)
 */
exports.approveJoinRequest = async (req, res, next) => {
  try {
    const group = await Group.findById(req.params.id);

    if (!group) {
      return next(new ErrorResponse(`Group not found`, 404));
    }

    if (!group.isLeader(req.user.id)) {
      return next(new ErrorResponse('Not authorized', 403));
    }

    const request = group.joinRequests.id(req.params.requestId);

    if (!request) {
      return next(new ErrorResponse('Join request not found', 404));
    }

    if (group.isFull()) {
      return next(new ErrorResponse('Group is full', 400));
    }

    // Add user to members
    group.members.push({
      user: request.user,
      role: 'Member'
    });

    // Update request status
    request.status = 'approved';

    // Add group to user's groups
    await User.findByIdAndUpdate(request.user, {
      $push: { groups: group._id }
    });

    await group.save();

    res.status(200).json({
      success: true,
      data: group
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Reject join request
 * @route   PUT /api/groups/:id/join-request/:requestId/reject
 * @access  Private (Group Leader only)
 */
exports.rejectJoinRequest = async (req, res, next) => {
  try {
    const group = await Group.findById(req.params.id);

    if (!group) {
      return next(new ErrorResponse(`Group not found`, 404));
    }

    if (!group.isLeader(req.user.id)) {
      return next(new ErrorResponse('Not authorized', 403));
    }

    const request = group.joinRequests.id(req.params.requestId);

    if (!request) {
      return next(new ErrorResponse('Join request not found', 404));
    }

    request.status = 'rejected';
    await group.save();

    res.status(200).json({
      success: true,
      data: group
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Leave group
 * @route   POST /api/groups/:id/leave
 * @access  Private
 */
exports.leaveGroup = async (req, res, next) => {
  try {
    const group = await Group.findById(req.params.id);

    if (!group) {
      return next(new ErrorResponse(`Group not found`, 404));
    }

    if (!group.isMember(req.user.id)) {
      return next(new ErrorResponse('You are not a member of this group', 400));
    }

    // Cannot leave if you're the only member
    if (group.members.length === 1) {
      return next(new ErrorResponse('Cannot leave group as the only member. Delete the group instead.', 400));
    }

    // Remove from members
    group.members = group.members.filter(
      m => m.user.toString() !== req.user.id
    );

    // Remove group from user's groups
    await User.findByIdAndUpdate(req.user.id, {
      $pull: { groups: group._id }
    });

    await group.save();

    res.status(200).json({
      success: true,
      data: {}
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Remove member from group
 * @route   DELETE /api/groups/:id/members/:userId
 * @access  Private (Group Leader only)
 */
exports.removeMember = async (req, res, next) => {
  try {
    const group = await Group.findById(req.params.id);

    if (!group) {
      return next(new ErrorResponse(`Group not found`, 404));
    }

    if (!group.isLeader(req.user.id)) {
      return next(new ErrorResponse('Not authorized', 403));
    }

    // Cannot remove yourself
    if (req.params.userId === req.user.id) {
      return next(new ErrorResponse('Cannot remove yourself. Use leave group instead.', 400));
    }

    group.members = group.members.filter(
      m => m.user.toString() !== req.params.userId
    );

    await User.findByIdAndUpdate(req.params.userId, {
      $pull: { groups: group._id }
    });

    await group.save();

    res.status(200).json({
      success: true,
      data: group
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Search groups
 * @route   GET /api/groups/search/:query
 * @access  Private
 */
exports.searchGroups = async (req, res, next) => {
  try {
    const searchQuery = req.params.query;

    const groups = await Group.find({
      $and: [
        {
          $or: [
            { name: { $regex: searchQuery, $options: 'i' } },
            { description: { $regex: searchQuery, $options: 'i' } },
            { tags: { $regex: searchQuery, $options: 'i' } },
            { projectType: { $regex: searchQuery, $options: 'i' } }
          ]
        },
        { isActive: true, status: 'Open' }
      ]
    })
    .populate('creator', 'name profilePicture')
    .populate('members.user', 'name profilePicture')
    .limit(20);

    res.status(200).json({
      success: true,
      count: groups.length,
      data: groups
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Get user's groups
 * @route   GET /api/groups/my-groups
 * @access  Private
 */
exports.getMyGroups = async (req, res, next) => {
  try {
    const groups = await Group.find({
      'members.user': req.user.id,
      isActive: true
    })
    .populate('creator', 'name profilePicture')
    .populate('members.user', 'name profilePicture')
    .sort('-lastActivity');

    res.status(200).json({
      success: true,
      count: groups.length,
      data: groups
    });
  } catch (err) {
    next(err);
  }
};