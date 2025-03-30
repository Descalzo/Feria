const Transaccion = require('../models/transaccion.model');

exports.getTransacciones = async (req, res) => {
  try {
    const transacciones = await Transaccion.find();
    res.json(transacciones);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.addTransaccion = async (req, res) => {
  try {
    const transaccion = new Transaccion(req.body);
    await transaccion.save();
    res.status(201).json(transaccion);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};