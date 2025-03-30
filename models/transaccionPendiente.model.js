const mongoose = require('mongoose');

const transaccionPendienteSchema = new mongoose.Schema({
  cantidad: { type: Number, required: true },
  de: { type: String, required: true },
  fecha: { type: Date, required: true },
  estado: { type: String, required: true },
  restauranteEmail: { type: String },
  customId: { type: String, required: true, unique: true } // 🔥 identificador único
}, { timestamps: true });

module.exports = mongoose.model('TransaccionPendiente', transaccionPendienteSchema, 'transaccionesPendientes');
