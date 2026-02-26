const express = require('express');
const {
  getGroupTasks,
  getTask,
  createTask,
  updateTask,
  deleteTask,
  addComment,
  updateComment,
  deleteComment,
  addSubtask,
  toggleSubtask,
  assignTask,
  updatePosition,
  addAttachment,
  getMyTasks,
  getOverdueTasks,
  getGroupTaskStats
} = require('../controllers/taskController');

const router = express.Router();

const { protect } = require('../middleware/auth');

router.use(protect);

router.get('/my-tasks', getMyTasks);
router.get('/overdue', getOverdueTasks);

router.route('/group/:groupId')
  .get(getGroupTasks);

router.get('/group/:groupId/stats', getGroupTaskStats);

router.route('/')
  .post(createTask);

router.route('/:id')
  .get(getTask)
  .put(updateTask)
  .delete(deleteTask);

router.post('/:id/comments', addComment);
router.put('/:id/comments/:commentId', updateComment);
router.delete('/:id/comments/:commentId', deleteComment);

router.post('/:id/subtasks', addSubtask);
router.put('/:id/subtasks/:subtaskId/toggle', toggleSubtask);

router.put('/:id/assign', assignTask);
router.put('/:id/position', updatePosition);
router.post('/:id/attachments', addAttachment);

module.exports = router;