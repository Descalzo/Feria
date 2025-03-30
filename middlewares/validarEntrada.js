module.exports = (req, res, next) => {
  const { email, nombre, hora, role } = req.body;

  if (!email || !nombre || !hora || !role) {
    return res.status(400).json({ error: 'Faltan campos obligatorios' });
  }

  next();
};