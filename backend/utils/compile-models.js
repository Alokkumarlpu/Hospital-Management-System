import './load-models.js';
import mongoose from 'mongoose';
import { disconnectDatabase } from '../config/db.js';

console.log(`Loaded ${mongoose.modelNames().length} Mongoose models: ${mongoose.modelNames().join(', ')}`);
await disconnectDatabase();
