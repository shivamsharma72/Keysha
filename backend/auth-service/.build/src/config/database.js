"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.connectDatabase = connectDatabase;
exports.disconnectDatabase = disconnectDatabase;
const mongoose_1 = __importDefault(require("mongoose"));
const logger_1 = __importDefault(require("../utils/logger"));
/**
 * MongoDB Connection Setup
 *
 * Why Mongoose? It's an ODM (Object Document Mapper) that:
 * 1. Provides schemas (structure for documents)
 * 2. Validates data before saving
 * 3. Provides easy query methods
 * 4. Handles connection pooling automatically
 *
 * Connection pooling: Instead of opening/closing connections for each request,
 * Mongoose maintains a pool of connections and reuses them. Like a taxi service
 * that keeps cars ready instead of building new ones each time.
 */
let isConnected = false;
async function connectDatabase() {
    if (isConnected) {
        logger_1.default.info('Database already connected');
        return;
    }
    const mongoUri = process.env.MONGODB_URI;
    if (!mongoUri) {
        throw new Error('MONGODB_URI environment variable is not set');
    }
    try {
        // Connect to MongoDB Atlas
        // Options explained:
        // - bufferCommands: false = fail fast if not connected (good for Lambda)
        // - serverSelectionTimeoutMS: 5000 = timeout after 5 seconds
        await mongoose_1.default.connect(mongoUri, {
            serverSelectionTimeoutMS: 5000,
            socketTimeoutMS: 45000,
        });
        isConnected = true;
        logger_1.default.info('✅ Connected to MongoDB Atlas');
        // Handle connection events
        mongoose_1.default.connection.on('error', (err) => {
            logger_1.default.error('MongoDB connection error:', err);
            isConnected = false;
        });
        mongoose_1.default.connection.on('disconnected', () => {
            logger_1.default.warn('MongoDB disconnected');
            isConnected = false;
        });
        // Graceful shutdown
        process.on('SIGINT', async () => {
            await mongoose_1.default.connection.close();
            logger_1.default.info('MongoDB connection closed due to app termination');
            process.exit(0);
        });
    }
    catch (error) {
        logger_1.default.error('Failed to connect to MongoDB:', error);
        isConnected = false;
        throw error;
    }
}
async function disconnectDatabase() {
    if (isConnected) {
        await mongoose_1.default.connection.close();
        isConnected = false;
        logger_1.default.info('Disconnected from MongoDB');
    }
}
//# sourceMappingURL=database.js.map