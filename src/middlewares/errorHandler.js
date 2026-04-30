const errorHandler = (error, req, res, _next) => {
  const errorMessage = error && error.message ? error.message : "Erro interno no servidor.";
  const isDatabaseConstraint = errorMessage.includes("SQLITE_CONSTRAINT");
  const status = error && error.status ? error.status : isDatabaseConstraint ? 400 : 500;
  const message = isDatabaseConstraint
    ? "Erro de validacao no banco. Verifique campos unicos como matricula."
    : errorMessage;

  if (status < 500 && req.method !== "GET" && req.session) {
    req.session.flash = {
      type: "error",
      message,
    };
    return res.redirect(req.get("Referrer") || "/");
  }

  console.error(error);
  return res.status(status).send(message);
};

module.exports = errorHandler;
