const errorHandler = (error, req, res, _next) => {
  if (error && error.status) {
    return res.status(error.status).send(error.message);
  }

  if (error && error.message.includes("SQLITE_CONSTRAINT")) {
    return res.status(400).send(
      "Erro de validacao no banco. Verifique campos unicos como matricula.",
    );
  }

  console.error(error);
  return res.status(500).send("Erro interno no servidor.");
};

module.exports = errorHandler;
