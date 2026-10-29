const express = require('express');
const multer = require('multer');
const path = require('path');
const dischargeController = require('../controllers/dischargeController');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// Multer storage setup
const uploadDir = path.resolve(__dirname, '../../uploads');
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const safeName = file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_');
    cb(null, `${Date.now()}-${safeName}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 25 * 1024 * 1024 }, // 25 MB limit
  fileFilter: (req, file, cb) => {
    const allowedExts = ['.pdf', '.txt', '.doc', '.docx', '.png', '.jpg', '.jpeg'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowedExts.includes(ext) || file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new Error('Unsupported file type. Please upload a PDF, text, or image file.'));
    }
  }
});

// All discharge endpoints require patient authentication
router.use(authenticateToken);

// 1. Upload & Analyze Document (PDF, text, etc.)
router.post('/upload', upload.single('file'), dischargeController.uploadAndAnalyze);

// 2. Direct Text Submission & Analysis (support both /text and /analyze-text)
router.post('/text', dischargeController.analyzeDirectText);
router.post('/analyze-text', dischargeController.analyzeDirectText);

// 3. Latest & History
router.get('/latest', dischargeController.getLatestDischarge);
router.get('/history', dischargeController.getDischargeHistory);
router.get('/', dischargeController.listDischargeRecords);

// 4. Review endpoints
router.get('/review/:id', dischargeController.getDischargeReview);
router.put('/review/:id', dischargeController.updateDischargeReview);

// 5. Specific record & legacy review routes
router.get('/:id', dischargeController.getDischargeRecord);
router.put('/:id/review', dischargeController.reviewInstruction);
router.put('/:id/review-bulk', dischargeController.bulkReviewInstructions);
router.post('/:id/sync-reminders', dischargeController.syncConfirmedToReminders);

module.exports = router;
