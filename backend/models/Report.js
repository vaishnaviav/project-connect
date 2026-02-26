const mongoose = require('mongoose');

const reportSchema = new mongoose.Schema({
  // Reporter Information
  reportedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  
  // Reported Entity
  reportedUser: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  reportedGroup: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Group'
  },
  reportedMessage: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Message'
  },
  
  // Report Type
  reportType: {
    type: String,
    enum: ['user', 'group', 'message', 'other'],
    required: true
  },
  
  // Report Category
  category: {
    type: String,
    enum: [
      'Harassment',
      'Spam',
      'Inappropriate Content',
      'False Information',
      'Hate Speech',
      'Violence',
      'Privacy Violation',
      'Impersonation',
      'Other'
    ],
    required: true
  },
  
  // Report Details
  reason: {
    type: String,
    required: [true, 'Please provide a reason for reporting'],
    maxlength: [1000, 'Reason cannot exceed 1000 characters']
  },
  additionalDetails: {
    type: String,
    maxlength: [2000, 'Additional details cannot exceed 2000 characters']
  },
  
  // Evidence
  screenshots: [{
    url: String,
    uploadedAt: {
      type: Date,
      default: Date.now
    }
  }],
  
  // Status
  status: {
    type: String,
    enum: ['pending', 'under_review', 'resolved', 'dismissed'],
    default: 'pending'
  },
  
  // Priority
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'critical'],
    default: 'medium'
  },
  
  // Moderation
  reviewedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  reviewedAt: Date,
  moderatorNotes: String,
  
  // Action Taken
  actionTaken: {
    type: String,
    enum: [
      'No Action',
      'Warning Issued',
      'Content Removed',
      'User Suspended',
      'User Banned',
      'Group Removed',
      'Other'
    ]
  },
  actionDetails: String,
  actionDate: Date,
  
  // Resolution
  resolutionNotes: String,
  resolvedAt: Date,
  
  // Appeal
  isAppealed: {
    type: Boolean,
    default: false
  },
  appealReason: String,
  appealedAt: Date,
  appealStatus: {
    type: String,
    enum: ['pending', 'accepted', 'rejected']
  }
}, {
  timestamps: true
});

// Index for efficient queries
reportSchema.index({ status: 1, priority: -1, createdAt: -1 });
reportSchema.index({ reportedBy: 1 });
reportSchema.index({ reportedUser: 1 });
reportSchema.index({ reportType: 1 });

// Check if report is resolved
reportSchema.methods.isResolved = function() {
  return this.status === 'resolved' || this.status === 'dismissed';
};

// Check if report is overdue (pending for more than 7 days)
reportSchema.methods.isOverdue = function() {
  if (this.isResolved()) return false;
  const daysSinceReport = (Date.now() - this.createdAt) / (1000 * 60 * 60 * 24);
  return daysSinceReport > 7;
};

module.exports = mongoose.model('Report', reportSchema);