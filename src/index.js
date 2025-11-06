import express from 'express';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import authRoutes from './routes/authRoutes.js';

dotenv.config();
const app = express();
app.use(express.json());

// Routes
app.use('/api/auth', authRoutes);

// Global error handler (keeps controllers clean)
app.use((err, _req, res, _next) =>
  res.status(err.statusCode || 500).json({ message: err.message })
);

mongoose
  .connect(process.env.MONGODB_URI)
  .then(() => app.listen(process.env.PORT, () =>
        console.log(`Server ready on port ${process.env.PORT}`)))
  .catch(err => console.error(err));

  