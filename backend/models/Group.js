const mongoose = require('mongoose');

const groupSchema = new mongoose.Schema({
  // Basic Information
  name: {
    type: String,
    required: [true, 'Please provide a group name'],
    trim: true,
    maxlength: [100, 'Group name cannot exceed 100 characters']
  },
  description: {
    type: String,
    required: [true, 'Please provide a group description'],
    maxlength: [1000, 'Description cannot exceed 1000 characters']
  },
  projectTitle: {
    type: String,
    trim: true
  },
  
  // Group Image
  groupImage: {
    type: String,
    default: 'default-group.png'
  },
  
  // Project Details
  projectType: {
    type: String,
    enum: ['Academic', 'Research', 'Personal', 'Competition', 'Startup', 'Other'],
    required: true
  },
  subject: {
    type: String,
    trim: true
  },
  
  // Required Skills
  requiredSkills: [{
    skill: String,
    required: Boolean
  }],
  
  // Members
  creator: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  members: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    role: {
      type: String,
      enum: ['Leader', 'Co-Leader', 'Member'],
      default: 'Member'
    },
    joinedAt: {
      type: Date,
      default: Date.now
    }
  }],
  
  // Membership Settings
  maxMembers: {
    type: Number,
    required: true,
    min: 2,
    max: 20
  },
  isPrivate: {
    type: Boolean,
    default: false
  },
  requiresApproval: {
    type: Boolean,
    default: true
  },
  
  // Join Requests
  joinRequests: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    message: String,
    requestedAt: {
      type: Date,
      default: Date.now
    },
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      default: 'pending'
    }
  }],
  
  // Project Timeline
  startDate: Date,
  endDate: Date,
  deadline: Date,
  
  // Status
  status: {
    type: String,
    enum: ['Open', 'In Progress', 'Completed', 'Closed'],
    default: 'Open'
  },
  
  // Group Activity
  isActive: {
    type: Boolean,
    default: true
  },
  lastActivity: {
    type: Date,
    default: Date.now
  },
  
  // Communication
  allowChat: {
    type: Boolean,
    default: true
  },
  allowFileSharing: {
    type: Boolean,
    default: true
  },
  
  // Tags for Search
  tags: [String],
  
  // Statistics
  totalMessages: {
    type: Number,
    default: 0
  },
  totalFiles: {
    type: Number,
    default: 0
  },
  totalTasks: {
    type: Number,
    default: 0
  },
  completedTasks: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true
});

// Index for search optimization
groupSchema.index({ name: 'text', description: 'text', tags: 'text' });
groupSchema.index({ status: 1, isActive: 1 });

// Check if group is full
groupSchema.methods.isFull = function() {
  return this.members.length >= this.maxMembers;
};

// Check if user is member
groupSchema.methods.isMember = function(userId) {
  return this.members.some(member => 
    member.user.toString() === userId.toString()
  );
};

// Check if user is leader
groupSchema.methods.isLeader = function(userId) {
  return this.members.some(member => 
    member.user.toString() === userId.toString() && 
    (member.role === 'Leader' || member.role === 'Co-Leader')
  );
};

// Get member count
groupSchema.methods.getMemberCount = function() {
  return this.members.length;
};

// Calculate completion percentage
groupSchema.methods.getCompletionPercentage = function() {
  if (this.totalTasks === 0) return 0;
  return Math.round((this.completedTasks / this.totalTasks) * 100);
};

module.exports = mongoose.model('Group', groupSchema);