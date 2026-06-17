const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const cookieParser = require('cookie-parser');
const mongoSanitize = require('express-mongo-sanitize');
const rateLimit = require('express-rate-limit');
const dotenv = require('dotenv');
const colors = require('colors');
const path = require('path');

dotenv.config();

const authRoutes        = require('./routes/authRoutes');
const userRoutes        = require('./routes/userRoutes');
const productRoutes     = require('./routes/productRoutes');
const stockRoutes       = require('./routes/stockRoutes');
const supplierRoutes    = require('./routes/supplierRoutes');
const orderRoutes       = require('./routes/orderRoutes');
const saleRoutes        = require('./routes/saleRoutes');
const clientRoutes      = require('./routes/clientRoutes');
const prescriptionRoutes= require('./routes/prescriptionRoutes');
const invoiceRoutes     = require('./routes/invoiceRoutes');
const alertRoutes       = require('./routes/alertRoutes');
const analyticsRoutes   = require('./routes/analyticsRoutes');
const dashboardRoutes   = require('./routes/dashboardRoutes');
const financeRoutes     = require('./routes/financeRoutes');
const settingsRoutes    = require('./routes/settingsRoutes');
const archiveRoutes     = require('./routes/archiveRoutes');
const { errorHandler }  = require('./middleware/errorMiddleware');
const { setupSocket }   = require('./services/socketService');
const logger            = require('./utils/logger');

const app    = express();
const server = http.createServer(app);
const io     = new Server(server, {
  cors: { origin: process.env.CLIENT_URL || 'http://localhost:3000', methods: ['GET','POST'] }
});

// ── DB ─────────────────────────────────────────────────────────────────────────
mongoose.connect(process.env.MONGODB_URI)
  .then(() => logger.info('MongoDB connecté'.green.bold))
  .catch(err => { logger.error('Erreur MongoDB:'.red, err); process.exit(1); });

// ── MIDDLEWARE ─────────────────────────────────────────────────────────────────
app.use(helmet());
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:3000',
  credentials: true,
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(mongoSanitize());
if (process.env.NODE_ENV === 'development') app.use(morgan('dev'));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  message: { success: false, message: 'Trop de requêtes, réessayez dans 15 minutes.' }
});
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: { success: false, message: 'Trop de tentatives de connexion.' }
});

app.use('/api', limiter);
app.use('/api/auth/login', authLimiter);

// Socket.io
setupSocket(io);
app.use((req, _res, next) => { req.io = io; next(); });

// ── ROUTES ─────────────────────────────────────────────────────────────────────
app.use('/api/auth',          authRoutes);
app.use('/api/users',         userRoutes);
app.use('/api/products',      productRoutes);
app.use('/api/stock',         stockRoutes);
app.use('/api/suppliers',     supplierRoutes);
app.use('/api/orders',        orderRoutes);
app.use('/api/sales',         saleRoutes);
app.use('/api/clients',       clientRoutes);
app.use('/api/prescriptions', prescriptionRoutes);
app.use('/api/invoices',      invoiceRoutes);
app.use('/api/alerts',        alertRoutes);
app.use('/api/analytics',     analyticsRoutes);
app.use('/api/dashboard',     dashboardRoutes);
app.use('/api/finance',       financeRoutes);
app.use('/api/settings',      settingsRoutes);
app.use('/api/archive',       archiveRoutes);

app.get('/api/health', (_req, res) =>
  res.json({ status: 'ok', env: process.env.NODE_ENV, time: new Date() })
);

// Static uploads
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Production: serve React build
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '../frontend/dist')));
  app.get('*', (_req, res) =>
    res.sendFile(path.resolve(__dirname, '../frontend/dist/index.html'))
  );
}

app.use(errorHandler);

const PORT = process.env.PORT || 5000;
server.listen(PORT, () =>
  logger.info(`Serveur PharmaERP démarré sur le port ${PORT} [${process.env.NODE_ENV}]`.cyan.bold)
);

module.exports = { app, io };
