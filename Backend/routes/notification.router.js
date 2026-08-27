const express = require('express');
const controller = require('../controller/notification.controller');
const { auth } = require('../middleware/auth.middleware');

const router = express.Router();
router.use(auth);
router.get('/', controller.list);
router.get('/:id', controller.get);
router.patch('/:id/read', controller.markRead);

module.exports = router;
