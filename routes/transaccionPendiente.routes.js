const express = require('express');
const router = express.Router();
const controller = require('../controllers/transaccionPendiente.controller');

router.get('/', controller.getPendientes);
router.post('/', controller.addPendiente);
router.delete('/:id', controller.deletePendiente);
router.post('/procesarTransaccionPendiente/:id', controller.procesarPendiente);


module.exports = router;