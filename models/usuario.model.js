const mongoose = require('mongoose');

const usuarioSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  alias: { type: String },
  nombre: { type: String },
  password: { type: String },
  role: { type: String, enum: ['admin', 'socio', 'familiar', 'invitado', 'portero', 'restaurante', 'camarero'], required: true },
  parent: { type: String },
  balance: { type: Number, default: 0 },
  entryQR: { type: String }, // ✅ Añadido para permitir almacenar el código QR
  eventosVistos: { type: [String], default: [] }, // ✅ También puedes incluir esto si usas eventos
  recargasVistas: [{ type: String }], // ✅ Y esto si gestionas recargas vistas
}, { timestamps: true });

module.exports = mongoose.model('Usuario', usuarioSchema);
