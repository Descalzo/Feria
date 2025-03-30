const Mensaje = require('../models/mensaje.model');

exports.obtenerMensajes = async (req, res) => {
  try {
    const mensajes = await Mensaje.find();
    res.json(mensajes);
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener los mensajes' });
  }
};

exports.crearMensaje = async (req, res) => {
  try {
    const { sender, message, date } = req.body;
    if (!sender || !message || !date) {
      return res.status(400).json({ error: 'Faltan campos obligatorios' });
    }

    const nuevoMensaje = new Mensaje({ sender, message, date });
    await nuevoMensaje.save();
    res.status(201).json(nuevoMensaje);
  } catch (error) {
    console.error('❌ Error en el controlador:', error);
    res.status(500).json({ error: 'Error al guardar el mensaje' });
  }
};
