const mongoose = require('mongoose');

mongoose.connect(process.env.MONGODB_URI || 'mongodb+srv://Arte1:Arte1_ya@cluster0.8ipualz.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0');

module.exports = mongoose;
