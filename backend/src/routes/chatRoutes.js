const express = require('express');
const router = express.Router();
const chatController = require('../controllers/chatController');
const { authenticateToken } = require('../middleware/auth');

router.use(authenticateToken);

router.post('/', chatController.sendMessage);
router.post('/message', chatController.sendMessage);
router.post('/rag-query', chatController.queryRAGDocument);
router.get('/history', chatController.getChatHistory);
router.delete('/history', chatController.clearChatHistory);

module.exports = router;
