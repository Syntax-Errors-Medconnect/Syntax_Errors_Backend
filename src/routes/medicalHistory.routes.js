const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth.middleware');
const { authorize } = require('../middleware/role.middleware');
const {
    getMedicalHistory,
    addMedicalHistoryEvent,
    updateMedicalHistoryEvent,
    deleteMedicalHistoryEvent,
    getMedicalHistoryEvent,
} = require('../controllers/medicalHistory.controller');

router.use(authenticate);

router.get('/', getMedicalHistory);
router.get('/:eventId', getMedicalHistoryEvent);

router.post('/', addMedicalHistoryEvent);
router.put('/:eventId', updateMedicalHistoryEvent);
router.delete('/:eventId', deleteMedicalHistoryEvent);

module.exports = router;
