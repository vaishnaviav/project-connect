const express = require('express');
const {
  getSystemStats,
  getAllUsers,
  banUser,
  unbanUser,
  suspendUser,
  activateUser,
  deleteUser,
  getAllGroups,
  deactivateGroup,
  deleteGroup,
  getRecentActivity
} = require('../controllers/adminController');

const router = express.Router();

const { protect, authorize } = require('../middleware/auth');

// All routes require authentication and admin role
router.use(protect);
router.use(authorize('admin'));

// Statistics
router.get('/stats', getSystemStats);
router.get('/activity', getRecentActivity);

// User management
router.get('/users', getAllUsers);
router.post('/users/:id/ban', banUser);
router.post('/users/:id/unban', unbanUser);
router.post('/users/:id/suspend', suspendUser);
router.post('/users/:id/activate', activateUser);
router.delete('/users/:id', deleteUser);

// Group management
router.get('/groups', getAllGroups);
router.post('/groups/:id/deactivate', deactivateGroup);
router.delete('/groups/:id', deleteGroup);

module.exports = router;