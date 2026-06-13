require('dotenv').config();
const express   = require('express');
const cors      = require('cors');
const helmet    = require('helmet');
const rateLimit = require('express-rate-limit');
const { logger } = require('./utils/logger');

const app  = express();
const PORT = process.env.PORT || 3001;

// ── Health check FIRST ────────────────────────────────────────────
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ── Security ──────────────────────────────────────────────────────
app.use(helmet({
  crossOriginEmbedderPolicy: false,
  contentSecurityPolicy: false,
}));

// ── CORS — allow all Vercel preview URLs + production URL ─────────
const ALLOWED_ORIGINS = [
  process.env.FRONTEND_URL,                    // https://student-portal-six-azure.vercel.app
  'http://localhost:5173',
  'http://localhost:3000',
].filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (Render health checks, curl, Postman)
    if (!origin) return callback(null, true);

    // Allow exact matches
    if (ALLOWED_ORIGINS.includes(origin)) return callback(null, true);

    // Allow ALL vercel.app subdomains (covers preview deploys)
    if (origin.endsWith('.vercel.app')) return callback(null, true);

    logger.warn(`CORS blocked origin: ${origin}`);
    callback(new Error(`CORS: origin ${origin} not allowed`));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  optionsSuccessStatus: 204,
}));

// Explicitly handle OPTIONS preflight for all routes
app.options('*', cors());

// ── Rate limiting ─────────────────────────────────────────────────
app.use('/api/', rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: { error: 'Too many requests. Please try again later.' },
}));

// ── Body parsing ──────────────────────────────────────────────────
app.use('/api/webhook', express.raw({ type: 'application/json' }));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// ── Request logging ───────────────────────────────────────────────
app.use((req, res, next) => {
  logger.info(`${req.method} ${req.path} — origin: ${req.headers.origin || 'none'}`);
  next();
});

// ── Routes ────────────────────────────────────────────────────────
app.use('/api/verification', require('./routes/verification'));
app.use('/api/webhook',      require('./routes/webhook'));
app.use('/api/application',  require('./routes/application'));
app.use('/api/admin',        require('./routes/admin'));

// ── 404 ───────────────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ error: `Route not found: ${req.method} ${req.path}` });
});

// ── Global error handler ──────────────────────────────────────────
app.use((err, req, res, next) => {
  logger.error('Unhandled error:', err.message);
  res.status(500).json({
    error: 'Internal server error',
    detail: process.env.NODE_ENV === 'development' ? err.message : undefined,
  });
});

// ── Start ─────────────────────────────────────────────────────────
app.listen(PORT, '0.0.0.0', () => {
  logger.info(`Server running on port ${PORT}`);
  logger.info(`Allowed origins: ${ALLOWED_ORIGINS.join(', ')}`);
});

module.exports = app;
