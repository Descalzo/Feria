const express = require('express');
const router = express.Router();
const cartaController = require('../controllers/carta.controller');

router.get('/', cartaController.getCarta);
router.post('/', cartaController.crearCarta);

module.exports = router;
