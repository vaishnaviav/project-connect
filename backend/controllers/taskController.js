const Task = require('../models/Task');
const Group = require('../models/Group');
const User = require('../models/User');
const ErrorResponse = require('../utils/errorResponse');
const logger = require('../utils/logger');

/**
 * @desc    Get all tasks for a group
 * @route   GET /api/tasks/group/:groupId
 * @access  Private
 */
exports.getGroupTasks = async (req, res, next) => {
  try {
    const { groupId } = req.params;
    const { status, priority, assignedTo } = req.query;

    // Verify user is group member
    const group = await Group.findById(groupId);
    if (!group) {
      return next(new ErrorResponse('Group not found', 404));
    }

    if (!group.isMember(req.user.id)) {
      return next(new ErrorResponse('Not authorized to view group tasks', 403));
    }

    const query = { group: groupId };
    if (status) query.status = status;
    if (priority) query.priority = priority;
    if (assignedTo) query.assignedTo = assignedTo;

    const tasks = await Task.find(query)
      .populate('createdBy', 'name profilePicture')
      .populate('assignedTo', 'name profilePicture')
      .sort('position');

    res.status(200).json({
      success: true,
      count: tasks.length,
      data: tasks
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Get single task
 * @route   GET /api/tasks/:id
 * @access  Private
 */
exports.getTask = async (req, res, next) => {
  try {
    const task = await Task.findById(req.params.id)
      .populate('createdBy', 'name profilePicture email')
      .populate('assignedTo', 'name profilePicture email')
      .populate('comments.user', 'name profilePicture')
      .populate('dependencies');

    if (!task) {
      return next(new ErrorResponse('Task not found', 404));
    }

    // Verify user is group member
    const group = await Group.findById(task.group);
    if (!group.isMember(req.user.id)) {
      return next(new ErrorResponse('Not authorized', 403));
    }

    res.status(200).json({
      success: true,
      data: task
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Create a task
 * @route   POST /api/tasks
 * @access  Private
 */
exports.createTask = async (req, res, next) => {
  try {
    req.body.createdBy = req.user.id;

    // Verify user is group member
    const group = await Group.findById(req.body.group);
    if (!group) {
      return next(new ErrorResponse('Group not found', 404));
    }

    if (!group.isMember(req.user.id)) {
      return next(new ErrorResponse('Not authorized to create tasks in this group', 403));
    }

    // Set position as last
    const lastTask = await Task.findOne({ group: req.body.group }).sort('-position');
    req.body.position = lastTask ? lastTask.position + 1 : 0;

    const task = await Task.create(req.body);
    
    // Update group stats
    group.totalTasks += 1;
    await group.save();

    // Log activity
    task.logActivity('Task created', req.user.id);
    await task.save();

    await task.populate('createdBy', 'name profilePicture');
    await task.populate('assignedTo', 'name profilePicture');

    res.status(201).json({
      success: true,
      data: task
    });

    logger.info(`Task created in group ${req.body.group} by ${req.user.id}`);
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Update a task
 * @route   PUT /api/tasks/:id
 * @access  Private
 */
exports.updateTask = async (req, res, next) => {
  try {
    let task = await Task.findById(req.params.id);
    
    if (!task) {
      return next(new ErrorResponse('Task not found', 404));
    }

    // Verify user is group member
    const group = await Group.findById(task.group);
    if (!group.isMember(req.user.id)) {
      return next(new ErrorResponse('Not authorized', 403));
    }

    const oldStatus = task.status;
    
    task = await Task.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true
    });

    // Update group stats if status changed
    if (oldStatus !== task.status) {
      if (task.status === 'Done' && oldStatus !== 'Done') {
        group.completedTasks += 1;
      } else if (oldStatus === 'Done' && task.status !== 'Done') {
        group.completedTasks -= 1;
      }
      await group.save();
    }

    // Log activity
    task.logActivity('Task updated', req.user.id, `Status: ${oldStatus} → ${task.status}`);
    
    // Update progress based on subtasks
    task.updateProgress();
    await task.save();

    res.status(200).json({
      success: true,
      data: task
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Delete a task
 * @route   DELETE /api/tasks/:id
 * @access  Private
 */
exports.deleteTask = async (req, res, next) => {
  try {
    const task = await Task.findById(req.params.id);
    
    if (!task) {
      return next(new ErrorResponse('Task not found', 404));
    }

    const group = await Group.findById(task.group);
    
    // Only group leaders or task creator can delete
    if (!group.isLeader(req.user.id) && task.createdBy.toString() !== req.user.id) {
      return next(new ErrorResponse('Not authorized to delete this task', 403));
    }

    await task.deleteOne();
    
    // Update group stats
    group.totalTasks -= 1;
    if (task.status === 'Done') {
      group.completedTasks -= 1;
    }
    await group.save();

    res.status(200).json({
      success: true,
      data: {}
    });

    logger.info(`Task ${req.params.id} deleted by ${req.user.id}`);
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Add comment to task
 * @route   POST /api/tasks/:id/comments
 * @access  Private
 */
exports.addComment = async (req, res, next) => {
  try {
    const task = await Task.findById(req.params.id);
    
    if (!task) {
      return next(new ErrorResponse('Task not found', 404));
    }

    // Verify user is group member
    const group = await Group.findById(task.group);
    if (!group.isMember(req.user.id)) {
      return next(new ErrorResponse('Not authorized', 403));
    }

    task.comments.push({
      user: req.user.id,
      text: req.body.text
    });

    task.logActivity('Comment added', req.user.id);
    await task.save();

    await task.populate('comments.user', 'name profilePicture');

    res.status(200).json({
      success: true,
      data: task
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Update comment
 * @route   PUT /api/tasks/:id/comments/:commentId
 * @access  Private
 */
exports.updateComment = async (req, res, next) => {
  try {
    const task = await Task.findById(req.params.id);
    
    if (!task) {
      return next(new ErrorResponse('Task not found', 404));
    }

    const comment = task.comments.id(req.params.commentId);
    if (!comment) {
      return next(new ErrorResponse('Comment not found', 404));
    }

    // Only comment author can update
    if (comment.user.toString() !== req.user.id) {
      return next(new ErrorResponse('Not authorized to update this comment', 403));
    }

    comment.text = req.body.text;
    await task.save();

    res.status(200).json({
      success: true,
      data: task
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Delete comment
 * @route   DELETE /api/tasks/:id/comments/:commentId
 * @access  Private
 */
exports.deleteComment = async (req, res, next) => {
  try {
    const task = await Task.findById(req.params.id);
    
    if (!task) {
      return next(new ErrorResponse('Task not found', 404));
    }

    const comment = task.comments.id(req.params.commentId);
    if (!comment) {
      return next(new ErrorResponse('Comment not found', 404));
    }

    // Only comment author or group leader can delete
    const group = await Group.findById(task.group);
    if (comment.user.toString() !== req.user.id && !group.isLeader(req.user.id)) {
      return next(new ErrorResponse('Not authorized', 403));
    }

    comment.remove();
    await task.save();

    res.status(200).json({
      success: true,
      data: {}
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Add subtask
 * @route   POST /api/tasks/:id/subtasks
 * @access  Private
 */
exports.addSubtask = async (req, res, next) => {
  try {
    const task = await Task.findById(req.params.id);
    
    if (!task) {
      return next(new ErrorResponse('Task not found', 404));
    }

    // Verify user is group member
    const group = await Group.findById(task.group);
    if (!group.isMember(req.user.id)) {
      return next(new ErrorResponse('Not authorized', 403));
    }

    task.subtasks.push({
      title: req.body.title
    });

    task.logActivity('Subtask added', req.user.id, req.body.title);
    task.updateProgress();
    await task.save();

    res.status(200).json({
      success: true,
      data: task
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Toggle subtask completion
 * @route   PUT /api/tasks/:id/subtasks/:subtaskId/toggle
 * @access  Private
 */
exports.toggleSubtask = async (req, res, next) => {
  try {
    const task = await Task.findById(req.params.id);
    
    if (!task) {
      return next(new ErrorResponse('Task not found', 404));
    }

    const subtask = task.subtasks.id(req.params.subtaskId);
    if (!subtask) {
      return next(new ErrorResponse('Subtask not found', 404));
    }

    subtask.isCompleted = !subtask.isCompleted;
    if (subtask.isCompleted) {
      subtask.completedAt = Date.now();
      subtask.completedBy = req.user.id;
    } else {
      subtask.completedAt = undefined;
      subtask.completedBy = undefined;
    }

    task.logActivity('Subtask toggled', req.user.id, subtask.title);
    task.updateProgress();
    await task.save();

    res.status(200).json({
      success: true,
      data: task
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Assign task to users
 * @route   PUT /api/tasks/:id/assign
 * @access  Private
 */
exports.assignTask = async (req, res, next) => {
  try {
    const { userIds } = req.body;
    const task = await Task.findById(req.params.id);
    
    if (!task) {
      return next(new ErrorResponse('Task not found', 404));
    }

    // Verify user is group leader
    const group = await Group.findById(task.group);
    if (!group.isLeader(req.user.id) && task.createdBy.toString() !== req.user.id) {
      return next(new ErrorResponse('Not authorized to assign tasks', 403));
    }

    // Verify all users are group members
    for (const userId of userIds) {
      if (!group.isMember(userId)) {
        return next(new ErrorResponse(`User ${userId} is not a group member`, 400));
      }
    }

    task.assignedTo = userIds;
    task.logActivity('Task reassigned', req.user.id);
    await task.save();

    await task.populate('assignedTo', 'name profilePicture');

    res.status(200).json({
      success: true,
      data: task
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Update task position (for drag and drop)
 * @route   PUT /api/tasks/:id/position
 * @access  Private
 */
exports.updatePosition = async (req, res, next) => {
  try {
    const { position } = req.body;
    const task = await Task.findById(req.params.id);
    
    if (!task) {
      return next(new ErrorResponse('Task not found', 404));
    }

    // Verify user is group member
    const group = await Group.findById(task.group);
    if (!group.isMember(req.user.id)) {
      return next(new ErrorResponse('Not authorized', 403));
    }

    task.position = position;
    await task.save();

    res.status(200).json({
      success: true,
      data: task
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Add attachment to task
 * @route   POST /api/tasks/:id/attachments
 * @access  Private
 */
exports.addAttachment = async (req, res, next) => {
  try {
    const task = await Task.findById(req.params.id);
    
    if (!task) {
      return next(new ErrorResponse('Task not found', 404));
    }

    // Verify user is group member
    const group = await Group.findById(task.group);
    if (!group.isMember(req.user.id)) {
      return next(new ErrorResponse('Not authorized', 403));
    }

    task.attachments.push({
      fileName: req.body.fileName,
      fileUrl: req.body.fileUrl,
      fileType: req.body.fileType,
      uploadedBy: req.user.id
    });

    task.logActivity('Attachment added', req.user.id, req.body.fileName);
    await task.save();

    res.status(200).json({
      success: true,
      data: task
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Get my tasks (assigned to current user)
 * @route   GET /api/tasks/my-tasks
 * @access  Private
 */
exports.getMyTasks = async (req, res, next) => {
  try {
    const { status, priority } = req.query;

    const query = {
      assignedTo: req.user.id
    };

    if (status) query.status = status;
    if (priority) query.priority = priority;

    const tasks = await Task.find(query)
      .populate('group', 'name projectTitle')
      .populate('createdBy', 'name profilePicture')
      .populate('assignedTo', 'name profilePicture')
      .sort('-createdAt');

    res.status(200).json({
      success: true,
      count: tasks.length,
      data: tasks
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Get overdue tasks
 * @route   GET /api/tasks/overdue
 * @access  Private
 */
exports.getOverdueTasks = async (req, res, next) => {
  try {
    const tasks = await Task.find({
      assignedTo: req.user.id,
      dueDate: { $lt: new Date() },
      status: { $ne: 'Done' }
    })
    .populate('group', 'name projectTitle')
    .populate('createdBy', 'name profilePicture')
    .sort('dueDate');

    res.status(200).json({
      success: true,
      count: tasks.length,
      data: tasks
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Get task statistics for a group
 * @route   GET /api/tasks/group/:groupId/stats
 * @access  Private
 */
exports.getGroupTaskStats = async (req, res, next) => {
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

    const stats = await Task.aggregate([
      { $match: { group: group._id } },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      }
    ]);

    const overdue = await Task.countDocuments({
      group: groupId,
      dueDate: { $lt: new Date() },
      status: { $ne: 'Done' }
    });

    res.status(200).json({
      success: true,
      data: {
        byStatus: stats,
        overdue,
        completionRate: group.getCompletionPercentage()
      }
    });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getGroupTasks: exports.getGroupTasks,
  getTask: exports.getTask,
  createTask: exports.createTask,
  updateTask: exports.updateTask,
  deleteTask: exports.deleteTask,
  addComment: exports.addComment,
  updateComment: exports.updateComment,
  deleteComment: exports.deleteComment,
  addSubtask: exports.addSubtask,
  toggleSubtask: exports.toggleSubtask,
  assignTask: exports.assignTask,
  updatePosition: exports.updatePosition,
  addAttachment: exports.addAttachment,
  getMyTasks: exports.getMyTasks,
  getOverdueTasks: exports.getOverdueTasks,
  getGroupTaskStats: exports.getGroupTaskStats
};