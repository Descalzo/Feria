const express = require('express');
const router = express.Router();
const eventoController = require('../controllers/eventos.controller');

router.get('/', eventoController.obtenerEventos);
router.post('/', eventoController.crearEvento);
router.delete('/:id', eventoController.eliminarEvento);

module.exports = router;
