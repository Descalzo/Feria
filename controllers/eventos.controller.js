const Evento = require('../models/eventos.model');

exports.crearEvento = async (req, res) => {
  try {
    const nuevoEvento = new Evento(req.body);
    await nuevoEvento.save();
    res.status(201).json(nuevoEvento);
  } catch (error) {
    res.status(500).json({ error: 'Error al crear el evento' });
  }
};

exports.obtenerEventos = async (req, res) => {
  try {
    const eventos = await Evento.find().sort({ fecha: 1 });
    res.json(eventos);
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener los eventos' });
  }
};

exports.eliminarEvento = async (req, res) => {
  try {
    await Evento.findByIdAndDelete(req.params.id);
    res.json({ mensaje: 'Evento eliminado' });
  } catch (error) {
    res.status(500).json({ error: 'Error al eliminar el evento' });
  }
};
