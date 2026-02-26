const express = require('express');
const {
  getGroups,
  getGroup,
  createGroup,
  updateGroup,
  deleteGroup,
  requestJoinGroup,
  approveJoinRequest,
  rejectJoinRequest,
  leaveGroup,
  removeMember,
  searchGroups,
  getMyGroups
} = require('../controllers/groupController');

const router = express.Router();
const { protect } = require('../middleware/auth');
const { body } = require('express-validator');
const { validate } = require('../middleware/validation');

// Validation rules
const createGroupValidation = [
  body('name').trim().notEmpty().withMessage('Group name is required'),
  body('description').trim().notEmpty().withMessage('Description is required'),
  body('projectType').notEmpty().withMessage('Project type is required'),
  body('maxMembers')
    .isInt({ min: 2, max: 20 })
    .withMessage('Max members must be between 2 and 20'),
  validate
];

// All routes are protected
router.use(protect);

router.route('/')
  .get(getGroups)
  .post(createGroupValidation, createGroup);

router.route('/my-groups')
  .get(getMyGroups);

router.route('/search/:query')
  .get(searchGroups);

router.route('/:id')
  .get(getGroup)
  .put(updateGroup)
  .delete(deleteGroup);

router.route('/:id/join-request')
  .post(requestJoinGroup);

router.route('/:id/join-request/:requestId/approve')
  .put(approveJoinRequest);

router.route('/:id/join-request/:requestId/reject')
  .put(rejectJoinRequest);

router.route('/:id/leave')
  .post(leaveGroup);

router.route('/:id/members/:userId')
  .delete(removeMember);

module.exports = router;