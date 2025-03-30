const mongoose = require('mongoose');

const itemSchema = new mongoose.Schema({
  nombre: String,
  precio_familiar: Number
});

const categoriaSchema = new mongoose.Schema({
  categoria: String,
  items: [itemSchema]
});

module.exports = mongoose.model('Carta', categoriaSchema);
