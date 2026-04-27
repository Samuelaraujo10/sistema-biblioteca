const app = require("./app");
const { initDatabase } = require("./config/database");
const { startBackupScheduler } = require("./services/backupService");
const PORT = process.env.PORT || 3000;

const startServer = async () => {
  await initDatabase();
  await startBackupScheduler();
  app.listen(PORT, () => {
    console.log(`Servidor rodando em http://localhost:${PORT}`);
  });
};

startServer().catch((error) => {
  console.error("Falha ao iniciar a aplicacao:", error);
  process.exit(1);
});
