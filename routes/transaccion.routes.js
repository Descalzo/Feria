const express = require('express');
const router = express.Router();
const Transaccion = require('../models/transaccion.model');
const Usuario = require('../models/usuario.model'); 

// Obtener todas las transacciones
router.get('/', async (req, res) => {
  try {
    const transacciones = await Transaccion.find();
    res.json(transacciones);
  } catch (error) {
    console.error('❌ Error al obtener transacciones:', error);
    res.status(500).json({ error: 'Error al obtener transacciones' });
  }
});

// Ruta POST ya la tendrás aquí seguramente
router.post('/', async (req, res) => {
  try {
    const nueva = new Transaccion(req.body);
    await nueva.save();
    res.status(201).json(nueva);
  } catch (error) {
    console.error('❌ Error al guardar transacción:', error);
    res.status(400).json({ error: 'Error al guardar transacción' });
  }
});

module.exports = router;
