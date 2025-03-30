const express = require('express');
const router = express.Router();
const controller = require('../controllers/usuario.controller');
const Usuario = require('../models/usuario.model');



router.get('/', controller.getUsuarios);
router.post('/', controller.addUsuario);
router.put('/email/:email', controller.actualizarUsuarioPorEmail);

// Eliminar usuario por _id

router.delete('/id/:id', async (req, res) => {
  try {
    const resultado = await Usuario.findByIdAndDelete(req.params.id);
    if (!resultado) return res.status(404).json({ error: 'Usuario no encontrado' });
    res.json({ mensaje: 'Usuario eliminado correctamente' });
  } catch (err) {
    res.status(500).json({ error: 'Error al eliminar usuario' });
  }
});



module.exports = router;