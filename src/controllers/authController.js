const bcrypt = require('bcryptjs');

// Senha padrão (em produção, usar variável de ambiente)
const ADMIN_PASSWORD_HASH = bcrypt.hashSync('admin123', 10);

const login = (req, res) => {
  const { password } = req.body;

  if (!password) {
    return res.render('login', { error: 'Por favor, digite a senha.' });
  }

  // Verifica se é a senha do admin
  if (bcrypt.compareSync(password, ADMIN_PASSWORD_HASH)) {
    req.session.userId = 'admin';
    req.session.userName = 'Administrador';
    req.session.role = 'admin';
    return req.session.save((err) => {
      if (err) console.error('Erro ao salvar sessão:', err);
      return res.redirect('/');
    });
  }

  // Senha incorreta
  return res.render('login', { error: 'Senha incorreta.' });
};

const logout = (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      console.error('Erro ao destruir sessão:', err);
      return res.redirect('/');
    }
    res.redirect('/login');
  });
};

const showLogin = (req, res) => {
  res.render('login', { error: null });
};

module.exports = { login, logout, showLogin };
