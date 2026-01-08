const express = require('express');
const router = express.Router();
const {
    register,
    login,
    logout,
    refreshToken,
    getMe,
    logoutAll,
    updateProfile,
    changePassword,
    forgotPassword,
} = require('../controllers/auth.controller');
const { authenticate, authenticateForgotPassword } = require('../middleware/auth.middleware');

router.post('/register', register);
router.post('/login', login);
router.post('/refresh', refreshToken);

router.post('/logout', authenticate, logout);
router.post('/logout-all', authenticate, logoutAll);
router.get('/me', authenticate, getMe);
router.put('/profile', authenticate, updateProfile);
router.put('/change-password', authenticateForgotPassword, changePassword);
router.post('/forgot-password', forgotPassword);

module.exports = router;
