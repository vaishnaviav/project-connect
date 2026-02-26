const express = require('express');
const {
  createReport,
  getReports,
  getReport,
  getMyReports,
  updateReport,
  takeAction,
  deleteReport,
  getReportStats,
  escalateReport,
  appealReport,
  reviewAppeal
} = require('../controllers/reportController');

const router = express.Router();

const { protect, authorize } = require('../middleware/auth');

router.use(protect);

router.route('/')
  .get(authorize('admin'), getReports)
  .post(createReport);

router.get('/my-reports', getMyReports);
router.get('/stats', authorize('admin'), getReportStats);

router.route('/:id')
  .get(getReport)
  .put(authorize('admin'), updateReport)
  .delete(authorize('admin'), deleteReport);

router.post('/:id/action', authorize('admin'), takeAction);
router.post('/:id/escalate', authorize('admin'), escalateReport);
router.post('/:id/appeal', appealReport);
router.post('/:id/review-appeal', authorize('admin'), reviewAppeal);

module.exports = router;