const mongoose = require('mongoose');
const logger = require('./logger');

const connectDB = async (retryCount = 0) => {
  const MAX_RETRIES = 3;
  const RETRY_INTERVAL = 5000;

  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI, {
      family: 4 // Force IPv4 to resolve SRV issues on some networks
    });

    logger.info(`MongoDB Connected: ${conn.connection.host}`);
    
    // Handle connection events
    mongoose.connection.on('disconnected', () => {
      logger.warn('MongoDB disconnected');
    });

    mongoose.connection.on('error', (err) => {
      logger.error('MongoDB connection error: %O', err);
    });

  } catch (error) {
    logger.error('Error connecting to MongoDB: %s', error.message);
    
    if (retryCount < MAX_RETRIES) {
      logger.info(`Retrying connection in ${RETRY_INTERVAL/1000}s... (Attempt ${retryCount + 1}/${MAX_RETRIES})`);
      setTimeout(() => connectDB(retryCount + 1), RETRY_INTERVAL);
    } else {
      logger.error('Max retries reached. Exiting...');
      process.exit(1);
    }
  }
};

module.exports = connectDB;
