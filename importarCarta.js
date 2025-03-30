const fs = require('fs');
const mongoose = require('mongoose');
const path = require('path');

// Conexión a la base de datos MongoDB local
mongoose.connect('mongodb://192.168.1.231:27017/feria', {
  useNewUrlParser: true,
  useUnifiedTopology: true
});

// Definimos el esquema de la carta
const cartaSchema = new mongoose.Schema({
  categoria: String,
  items: [
    {
      id: String,
      nombre: String,
      precio_socio: Number,
      precio_familiar: Number,
      precio_admin: Number
    }
  ],
  id: String
});

// Creamos el modelo
const Carta = mongoose.model('Carta', cartaSchema);

// Leemos el archivo carta.json
const ruta = path.join(__dirname, 'carta.json');
const datos = JSON.parse(fs.readFileSync(ruta, 'utf-8'));

// Insertamos los datos
Carta.insertMany(datos)
  .then(() => {
    console.log('✅ Carta cargada correctamente en MongoDB.');
    mongoose.disconnect();
  })
  .catch((err) => {
    console.error('❌ Error al cargar la carta:', err);
    mongoose.disconnect();
  });
