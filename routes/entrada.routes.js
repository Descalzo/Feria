const express = require('express');
const router = express.Router();
const controller = require('../controllers/entrada.controller');

router.get('/', controller.getEntradas);
router.post('/', controller.addEntrada);

module.exports = router;