const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const cookieParser = require('cookie-parser');

const authRoutes = require('./routes/authRoutes');
const healthRoutes = require('./routes/healthRoutes');
const syncRoutes = require('./routes/syncRoutes');
const storeRoutes = require('./routes/storeRoutes');
const userRoutes = require('./routes/userRoutes');
const publicRoutes = require('./routes/publicRoutes');
const reportRoutes = require('./routes/reportRoutes');
const productRoutes = require('./routes/productRoutes');
const categoryRoutes = require('./routes/categoryRoutes');
const brandRoutes = require('./routes/brandRoutes');
const supplierRoutes = require('./routes/supplierRoutes');
const supplierGroupRoutes = require('./routes/supplierGroupRoutes');
const purchaseOrderRoutes = require('./routes/purchaseOrderRoutes');
const purchaseReturnRoutes = require('./routes/purchaseReturnRoutes');
const orderRoutes = require('./routes/orderRoutes');
const returnRoutes = require('./routes/returnRoutes');
const customerRoutes = require('./routes/customerRoutes');

const app = express();

const corsOrigins = (process.env.CLIENT_ORIGIN || 'http://localhost:5173')
  .split(',')
  .map((item) => item.trim())
  .filter(Boolean);

const isDev = process.env.NODE_ENV !== 'production';

app.use(helmet());
app.use(cookieParser());
app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    if (corsOrigins.includes(origin)) return callback(null, true);
    if (isDev && origin.startsWith('http://localhost:')) return callback(null, true);
    if (isDev && origin.startsWith('http://127.0.0.1:')) return callback(null, true);
    return callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
}));

const bodyLimit = process.env.BODY_LIMIT || '5mb';
app.use(express.json({ limit: bodyLimit }));

const rateLimitWindowMs = Number(process.env.RATE_LIMIT_WINDOW_MS || 60000);
const rateLimitMax = Number(process.env.RATE_LIMIT_MAX || 300);
app.use(rateLimit({
  windowMs: rateLimitWindowMs,
  max: rateLimitMax,
}));

app.use('/api/health', healthRoutes);
app.use('/api/public', publicRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/sync', syncRoutes);
app.use('/api/stores', storeRoutes);
app.use('/api/users', userRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/products', productRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/brands', brandRoutes);
app.use('/api/suppliers', supplierRoutes);
app.use('/api/supplier-groups', supplierGroupRoutes);
app.use('/api/purchase-orders', purchaseOrderRoutes);
app.use('/api/purchase-returns', purchaseReturnRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/returns', returnRoutes);
app.use('/api/customers', customerRoutes);

app.use((err, req, res, next) => {
  // eslint-disable-next-line no-console
  console.error(err);
  res.status(500).json({ message: 'Server error' });
});

module.exports = app;
