const mongoose = require('mongoose');

const transaccionSchema = new mongoose.Schema({
  userEmail: { type: String, required: true },
  amount: { type: Number, required: true },
  date: { type: Date, required: true },
  type: {
    type: String,
    enum: ['ingreso', 'gasto', 'recarga', 'transferencia', 'venta', 'pago', 'ticket'],
    required: true
  },
  from: { type: String, required: false },
  to: { type: String, required: false },
  alias: { type: String, required: false },
  customId: { type: String, required: false } // 🟢 Añadido para enlazar con transacciones pendientes
}, { timestamps: true });

module.exports = mongoose.model('Transaccion', transaccionSchema, 'transacciones');
