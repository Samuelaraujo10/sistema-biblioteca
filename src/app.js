const express = require("express");
const methodOverride = require("method-override");
const session = require("express-session");
const path = require("path");

const homeRoutes = require("./routes/homeRoutes");
const bookRoutes = require("./routes/bookRoutes");
const studentRoutes = require("./routes/studentRoutes");
const loanRoutes = require("./routes/loanRoutes");
const staffRoutes = require("./routes/staffRoutes");
const backupRoutes = require("./routes/backupRoutes");
const authRoutes = require("./routes/authRoutes");
const errorHandler = require("./middlewares/errorHandler");
const { checkAuthenticated } = require("./middlewares/authMiddleware");

const app = express();
const cookieSecure =
  process.env.SESSION_COOKIE_SECURE === "true" ||
  (process.env.NODE_ENV === "production" && process.env.SESSION_COOKIE_SECURE !== "false");

if (cookieSecure) {
  app.set("trust proxy", 1);
}

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "..", "views"));

app.use(express.urlencoded({ extended: true }));
app.use(methodOverride("_method"));
app.use(express.static(path.join(__dirname, "..", "public")));

// Configurar session
app.use(session({
  secret: 'biblioteca-escolar-secret-key-2026',
  resave: false,
  saveUninitialized: true,
  cookie: { 
    secure: cookieSecure,
    maxAge: 24 * 60 * 60 * 1000 // 24 horas
  }
}));

// Passar dados de session para views
app.use((req, res, next) => {
  res.locals.user = req.session.userId || null;
  res.locals.userName = req.session.userName || null;
  res.locals.role = req.session.role || null;
  res.locals.flash = req.session.flash || null;
  delete req.session.flash;
  next();
});

// Rotas públicas (sem autenticação)
app.use(authRoutes);

// Rotas protegidas (exigem login)
app.use("/books", checkAuthenticated, bookRoutes);
app.use("/students", checkAuthenticated, studentRoutes);
app.use("/staff", checkAuthenticated, staffRoutes);
app.use("/loans", checkAuthenticated, loanRoutes);
app.use("/", checkAuthenticated, homeRoutes);
app.use("/backups", checkAuthenticated, backupRoutes);

app.use(errorHandler);

module.exports = app;
