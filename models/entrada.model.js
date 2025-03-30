const mongoose = require('mongoose');

const entradaSchema = new mongoose.Schema({
  
  email: { type: String, required: true },
  nombre: { type: String, required: true },
  hora: { type: String, required: true },
  socio: { type: String, default: 'ninguno' },
  role: { type: String, enum: ['admin', 'socio', 'familiar', 'invitado'], required: true }
}, { timestamps: true });

module.exports = mongoose.model('Entrada', entradaSchema);