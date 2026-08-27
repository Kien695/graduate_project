const express = require('express');
const controller = require('../controller/customerContract.controller');
const { auth, authorize } = require('../middleware/auth.middleware');
const { enforceContractAccess } = require('../middleware/mac.middleware');

const router = express.Router();
router.use(auth, authorize('customer'));
router.get('/', controller.list);
router.get('/:id', enforceContractAccess, controller.get);
router.post('/:id/confirm', enforceContractAccess, controller.confirm);

module.exports = router;
