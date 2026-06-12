const mongoose = require('mongoose');
const env = require('./env');
const logger = require('./logger');

const connectDB = async () => {
    const uri = env.MONGODB_URI;
    logger.info('mongo connecting', {
        host: uri.replace(/\/\/[^@]+@/, '//***@'), // mask credentials in logs
    });
    try {
        const conn = await mongoose.connect(uri, {
            serverSelectionTimeoutMS: 10000,
            maxPoolSize: 20,
            socketTimeoutMS: 30000,
        });
        return conn;
    } catch (error) {
        logger.error('MongoDB connection error', { message: error.message });
        throw error;
    }
};

module.exports = connectDB;
