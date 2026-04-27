const express = require('express');
const authController = require('../controllers/authController');
const { checkNotAuthenticated } = require('../middlewares/authMiddleware');

const router = express.Router();

router.get('/login', checkNotAuthenticated, authController.showLogin);
router.post('/login', checkNotAuthenticated, authController.login);
router.get('/logout', authController.logout);

module.exports = router;
