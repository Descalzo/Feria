const Carta = require('../models/carta.model');

exports.getCarta = async (req, res) => {
  try {
    const carta = await Carta.find();
    res.json(carta);
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener la carta' });
  }
};

exports.crearCarta = async (req, res) => {
  try {
    const nuevaCarta = new Carta(req.body);
    await nuevaCarta.save();
    res.status(201).json(nuevaCarta);
  } catch (error) {
    res.status(500).json({ error: 'Error al crear la carta' });
  }
};
