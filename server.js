const express = require('express');
const cors = require('cors');
const app = express();
const mongoose = require('mongoose');
require('dotenv').config();
const PORT = process.env.PORT || 8080;

console.log('🔐 Conectando a:', process.env.MONGO_URI);


mongoose.connect(process.env.MONGO_URI);
mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
.then(() => console.log('✅ Conectado a MongoDB'))
.catch((err) => {
  console.error('❌ Error conectando a MongoDB:', err);
});


require('./config/db');

app.use(cors());
app.use(express.json());
app.use(express.static('public'));

const TransaccionPendiente = require('./models/transaccionPendiente.model');
const Transaccion = require('./models/transaccion.model');
const Usuario = require('./models/usuario.model');

app.use('/usuarios', require('./routes/usuario.routes'));
app.use('/entradas', require('./routes/entrada.routes'));
app.use('/transacciones', require('./routes/transaccion.routes'));
app.use('/transaccionesPendientes', require('./routes/transaccionPendiente.routes'));
app.use('/mensajes', require('./routes/mensaje.routes'));
app.use('/eventos', require('./routes/eventos.routes'));
app.use('/carta', require('./routes/carta.routes'));



//app.get('/', (req, res) => {
//  res.send('Servidor de la caseta funcionando 🎉');
//});


app.listen(PORT, () => console.log(`🚀 Servidor activo en http://localhost:${PORT}`));



app.post('/procesarTransaccionPendientePorCustomId/:customId', async (req, res) => {
  try {
    const customId = req.params.customId;
    const transaccionPendiente = await TransaccionPendiente.findOne({ customId });

    if (!transaccionPendiente) {
      return res.status(404).json({ error: 'Transacción no encontrada por customId' });
    }

    if (transaccionPendiente.estado !== 'pendiente') {
      return res.status(400).json({ error: 'Transacción ya procesada' });
    }

    const fecha = new Date();

    const pago = new Transaccion({
      userEmail: transaccionPendiente.de,
      amount: transaccionPendiente.cantidad,
      date: fecha,
      type: 'pago',
      to: transaccionPendiente.restauranteEmail,
      customId
    });

    const venta = new Transaccion({
      userEmail: transaccionPendiente.restauranteEmail,
      amount: transaccionPendiente.cantidad,
      date: fecha,
      type: 'venta',
      from: transaccionPendiente.de,
      customId
    });

    const usuario = await Usuario.findOne({ email: transaccionPendiente.de });
    const restaurante = await Usuario.findOne({ email: transaccionPendiente.restauranteEmail });

    if (!usuario || !restaurante) {
      return res.status(404).json({ error: 'Usuario o restaurante no encontrado' });
    }

    usuario.balance = (usuario.balance || 0) - transaccionPendiente.cantidad;
    restaurante.balance = (restaurante.balance || 0) + transaccionPendiente.cantidad;

    await usuario.save();
    await restaurante.save();
    await pago.save();
    await venta.save();
    

    return res.status(200).json({
      message: 'Transacción por customId procesada correctamente',
      pago,
      venta
    });

  } catch (err) {
    console.error('❌ Error procesando transacción por customId:', err);
    res.status(500).json({ error: 'Error interno al procesar transacción' });
  }
});





app.delete('/limpiarTransacciones', async (req, res) => {
  try {
    const resultado = await Transaccion.deleteMany({});
    res.json({ mensaje: 'Transacciones borradas', borradas: resultado.deletedCount });
  } catch (err) {
    console.error('❌ Error al borrar transacciones:', err);
    res.status(500).json({ error: 'No se pudieron borrar las transacciones' });
  }
});
