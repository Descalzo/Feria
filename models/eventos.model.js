const mongoose = require('mongoose');

const eventoSchema = new mongoose.Schema({
  descripcion: { type: String, required: true },
  dia: { type: Date, required: true },
  hora: { type: String, required: true },
  creadoPor: String
}, {
  timestamps: true
});

module.exports = mongoose.model('Evento', eventoSchema);
