const mongoose = require('mongoose');
const logger = require('../utils/logger');

const connectDB = async () => {
  const conn = await mongoose.connect(process.env.MONGODB_URI, {
    serverSelectionTimeoutMS: 5000,
  });
  logger.info(`MongoDB: ${conn.connection.host}`.cyan);
};

module.exports = connectDB;
