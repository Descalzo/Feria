const Entrada = require('../models/entrada.model');

exports.getEntradas = async (req, res) => {
  try {
    const entradas = await Entrada.find();
    res.json(entradas);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.addEntrada = async (req, res) => {
  try {
    // 🔥 Asegurarnos de que no venga un _id manual
    if ('_id' in req.body) delete req.body._id;

    const entrada = new Entrada(req.body);
    await entrada.save();
    res.status(201).json(entrada);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};
