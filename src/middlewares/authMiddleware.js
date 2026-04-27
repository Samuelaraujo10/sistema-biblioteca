const checkAuthenticated = (req, res, next) => {
  console.log('checkAuthenticated:', {
    path: req.path,
    sessionId: req.sessionID,
    userId: req.session?.userId,
  });
  
  if (req.session && req.session.userId) {
    return next();
  }
  return res.redirect('/login');
};

const checkNotAuthenticated = (req, res, next) => {
  if (req.session && req.session.userId) {
    return res.redirect('/');
  }
  return next();
};

module.exports = { checkAuthenticated, checkNotAuthenticated };
