const TransaccionPendiente = require('../models/transaccionPendiente.model');
const Transaccion = require('../models/transaccion.model');

exports.getPendientes = async (req, res) => {
  try {
    const pendientes = await TransaccionPendiente.find();
    res.json(pendientes);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.addPendiente = async (req, res) => {
  try {
    const pendiente = new TransaccionPendiente(req.body);
    await pendiente.save();
    res.status(201).json(pendiente);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

exports.deletePendiente = async (req, res) => {
  try {
    const { id } = req.params;
    await TransaccionPendiente.deleteOne({ id });
    res.json({ message: 'Eliminado' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.procesarPendiente = async (req, res) => {
  try {
    const { id } = req.params;
    const pendiente = await TransaccionPendiente.findById(id);

    if (!pendiente) return res.status(404).json({ error: 'Transacción pendiente no encontrada' });

    // Crear la transacción real
    const nuevaTransaccion = await Transaccion.create({
      _id: pendiente._id, // 🔴 Para que coincida con el QR y el polling lo detecte
      userEmail: pendiente.de,
      to: pendiente.restauranteEmail,
      amount: pendiente.cantidad,
      date: new Date().toISOString(),
      type: 'pago'
    });

    // Borrar la transacción pendiente
    await TransaccionPendiente.findByIdAndDelete(id);

    res.json({ ok: true, pago: nuevaTransaccion });
  } catch (err) {
    console.error('❌ Error al procesar transacción pendiente:', err);
    res.status(500).json({ error: err.message });
  }
};