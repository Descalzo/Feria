const express = require('express');
const router = express.Router();
const mensajeController = require('../controllers/mensaje.controller');

router.get('/', mensajeController.obtenerMensajes);
router.post('/', mensajeController.crearMensaje);

module.exports = router;
