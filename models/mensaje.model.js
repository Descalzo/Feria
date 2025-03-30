const mongoose = require('mongoose');

const mensajeSchema = new mongoose.Schema({
  sender: { type: String, required: true },
  message: { type: String, required: true },
  date: { type: Date, required: true }
});

module.exports = mongoose.model('Mensaje', mensajeSchema);
