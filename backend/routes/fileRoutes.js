const express = require('express');
const multer = require('multer');
const {
  uploadFile,
  getGroupFiles,
  deleteFile,
  getMyFiles
} = require('../controllers/fileController');

const router = express.Router();

const { protect } = require('../middleware/auth');

// Configure multer for file upload
const upload = multer({
  dest: 'uploads/',
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  }
});

router.use(protect);

router.post('/upload', upload.single('file'), uploadFile);
router.get('/group/:groupId', getGroupFiles);
router.delete('/:publicId', deleteFile);
router.get('/my-files', getMyFiles);

module.exports = router;