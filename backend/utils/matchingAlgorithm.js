const User = require('../models/User');
const Group = require('../models/Group');

/**
 * Calculate matching score between two users based on skills, interests, and preferences
 */
exports.calculateUserMatchScore = (user1, user2) => {
  let score = 0;
  let maxScore = 100;

  // Skills matching (40 points)
  const user1Skills = user1.skills.map(s => s.name.toLowerCase());
  const user2Skills = user2.skills.map(s => s.name.toLowerCase());
  const commonSkills = user1Skills.filter(skill => user2Skills.includes(skill));
  const skillScore = (commonSkills.length / Math.max(user1Skills.length, user2Skills.length, 1)) * 40;
  score += skillScore;

  // Interests matching (30 points)
  const user1Interests = user1.interests.map(i => i.toLowerCase());
  const user2Interests = user2.interests.map(i => i.toLowerCase());
  const commonInterests = user1Interests.filter(interest => user2Interests.includes(interest));
  const interestScore = (commonInterests.length / Math.max(user1Interests.length, user2Interests.length, 1)) * 30;
  score += interestScore;

  // Availability matching (15 points)
  if (user1.availability && user2.availability) {
    const user1Days = user1.availability.preferredDays || [];
    const user2Days = user2.availability.preferredDays || [];
    const commonDays = user1Days.filter(day => user2Days.includes(day));
    const availabilityScore = (commonDays.length / 7) * 15;
    score += availabilityScore;
  }

  // Project preferences matching (15 points)
  if (user1.projectPreferences && user2.projectPreferences) {
    const user1Types = user1.projectPreferences.preferredProjectTypes || [];
    const user2Types = user2.projectPreferences.preferredProjectTypes || [];
    const commonTypes = user1Types.filter(type => user2Types.includes(type));
    const preferenceScore = (commonTypes.length / Math.max(user1Types.length, user2Types.length, 1)) * 15;
    score += preferenceScore;
  }

  return Math.round(score);
};

/**
 * Calculate matching score between a user and a group
 */
exports.calculateGroupMatchScore = (user, group) => {
  let score = 0;

  // Required skills matching (50 points)
  const userSkills = user.skills.map(s => s.name.toLowerCase());
  const requiredSkills = group.requiredSkills.map(rs => rs.skill.toLowerCase());
  const matchedSkills = requiredSkills.filter(skill => userSkills.includes(skill));
  const skillScore = (matchedSkills.length / Math.max(requiredSkills.length, 1)) * 50;
  score += skillScore;

  // Project type matching (25 points)
  if (user.projectPreferences && user.projectPreferences.preferredProjectTypes) {
    const hasMatchingType = user.projectPreferences.preferredProjectTypes.includes(group.projectType);
    if (hasMatchingType) {
      score += 25;
    }
  }

  // Team size preference (15 points)
  if (user.projectPreferences && user.projectPreferences.preferredTeamSize) {
    const currentSize = group.members.length;
    const preferredSize = user.projectPreferences.preferredTeamSize;
    const sizeDiff = Math.abs(currentSize - preferredSize);
    const sizeScore = Math.max(0, 15 - (sizeDiff * 3));
    score += sizeScore;
  }

  // Group reputation/activity (10 points)
  if (group.isActive && group.status === 'Open') {
    score += 10;
  }

  return Math.round(score);
};

/**
 * Find matching partners for a user
 */
exports.findMatchingPartners = async (userId, limit = 10) => {
  try {
    const currentUser = await User.findById(userId);
    
    if (!currentUser) {
      throw new Error('User not found');
    }

    // Get all active users except current user
    const allUsers = await User.find({
      _id: { $ne: userId },
      isActive: true,
      isBanned: false
    });

    // Calculate match scores
    const matches = allUsers.map(user => ({
      user: user,
      matchScore: this.calculateUserMatchScore(currentUser, user)
    }));

    // Sort by match score and return top matches
    matches.sort((a, b) => b.matchScore - a.matchScore);
    
    return matches.slice(0, limit);
  } catch (error) {
    throw error;
  }
};

/**
 * Find matching groups for a user
 */
exports.findMatchingGroups = async (userId, limit = 10) => {
  try {
    const currentUser = await User.findById(userId);
    
    if (!currentUser) {
      throw new Error('User not found');
    }

    // Get all open groups that user is not a member of
    const allGroups = await Group.find({
      status: 'Open',
      isActive: true,
      'members.user': { $ne: userId }
    }).populate('members.user', 'name profilePicture');

    // Filter out full groups
    const availableGroups = allGroups.filter(group => !group.isFull());

    // Calculate match scores
    const matches = availableGroups.map(group => ({
      group: group,
      matchScore: this.calculateGroupMatchScore(currentUser, group)
    }));

    // Sort by match score and return top matches
    matches.sort((a, b) => b.matchScore - a.matchScore);
    
    return matches.slice(0, limit);
  } catch (error) {
    throw error;
  }
};

/**
 * Get recommended users based on collaborative filtering
 */
exports.getRecommendedUsers = async (userId, limit = 10) => {
  try {
    const currentUser = await User.findById(userId).populate('groups');
    
    if (!currentUser) {
      throw new Error('User not found');
    }

    // Find users who are in the same groups
    const groupIds = currentUser.groups.map(g => g._id);
    
    const similarUsers = await User.find({
      _id: { $ne: userId },
      groups: { $in: groupIds },
      isActive: true,
      isBanned: false
    }).limit(limit);

    return similarUsers;
  } catch (error) {
    throw error;
  }
};