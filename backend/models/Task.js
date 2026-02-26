const mongoose = require('mongoose');

const taskSchema = new mongoose.Schema({
  // Group Reference
  group: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Group',
    required: true
  },
  
  // Task Details
  title: {
    type: String,
    required: [true, 'Please provide a task title'],
    trim: true,
    maxlength: [200, 'Title cannot exceed 200 characters']
  },
  description: {
    type: String,
    maxlength: [1000, 'Description cannot exceed 1000 characters']
  },
  
  // Assignment
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  assignedTo: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  
  // Priority and Status
  priority: {
    type: String,
    enum: ['Low', 'Medium', 'High', 'Urgent'],
    default: 'Medium'
  },
  status: {
    type: String,
    enum: ['To Do', 'In Progress', 'Review', 'Done'],
    default: 'To Do'
  },
  
  // Timeline
  dueDate: {
    type: Date
  },
  startDate: {
    type: Date,
    default: Date.now
  },
  completedAt: Date,
  
  // Task Category/Label
  category: {
    type: String,
    trim: true
  },
  labels: [String],
  
  // Sub-tasks
  subtasks: [{
    title: {
      type: String,
      required: true
    },
    isCompleted: {
      type: Boolean,
      default: false
    },
    completedAt: Date,
    completedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }
  }],
  
  // Dependencies
  dependencies: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Task'
  }],
  blockedBy: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Task'
  }],
  
  // Attachments
  attachments: [{
    fileName: String,
    fileUrl: String,
    fileType: String,
    uploadedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    uploadedAt: {
      type: Date,
      default: Date.now
    }
  }],
  
  // Comments
  comments: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    text: {
      type: String,
      required: true
    },
    createdAt: {
      type: Date,
      default: Date.now
    }
  }],
  
  // Progress Tracking
  estimatedHours: Number,
  actualHours: Number,
  progressPercentage: {
    type: Number,
    min: 0,
    max: 100,
    default: 0
  },
  
  // Activity Log
  activityLog: [{
    action: String,
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    timestamp: {
      type: Date,
      default: Date.now
    },
    details: String
  }],
  
  // Recurrence (for recurring tasks)
  isRecurring: {
    type: Boolean,
    default: false
  },
  recurrence: {
    frequency: {
      type: String,
      enum: ['Daily', 'Weekly', 'Monthly']
    },
    endDate: Date
  },
  
  // Task Position (for drag-and-drop ordering)
  position: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true
});

// Index for efficient queries
taskSchema.index({ group: 1, status: 1 });
taskSchema.index({ assignedTo: 1, dueDate: 1 });
taskSchema.index({ priority: 1, status: 1 });

// Check if task is overdue
taskSchema.methods.isOverdue = function() {
  if (!this.dueDate || this.status === 'Done') return false;
  return new Date() > this.dueDate;
};

// Calculate subtask completion percentage
taskSchema.methods.getSubtaskCompletionRate = function() {
  if (this.subtasks.length === 0) return 0;
  const completed = this.subtasks.filter(st => st.isCompleted).length;
  return Math.round((completed / this.subtasks.length) * 100);
};

// Update progress based on subtasks
taskSchema.methods.updateProgress = function() {
  const subtaskProgress = this.getSubtaskCompletionRate();
  if (subtaskProgress === 100 && this.status !== 'Done') {
    this.status = 'Review';
  }
  this.progressPercentage = subtaskProgress;
};

// Add activity log entry
taskSchema.methods.logActivity = function(action, userId, details = '') {
  this.activityLog.push({
    action,
    user: userId,
    details
  });
};

module.exports = mongoose.model('Task', taskSchema);