const express = require('express');
const controller = require('../controller/customerOrder.controller');
const inspectionController = require('../controller/customerInspection.controller');
const { auth, authorize } = require('../middleware/auth.middleware');

const router = express.Router();
router.use(auth, authorize('customer'));
router.get('/', controller.list);
router.get('/:id/inspection', inspectionController.getByOrder);
router.post('/', controller.create);

module.exports = router;
