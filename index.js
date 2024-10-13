import express from 'express';
import dotenv from 'dotenv';
import multer from 'multer';
import path from 'path';
import { testConnection } from './config/pineconeClient.js';
import fileRoutes from './routes/fileRoutes.js';
import chatRoutes from './routes/chatRoutes.js'; // Import the chat routes
import cors from 'cors';

dotenv.config(); // Load environment variables

const app = express();
const PORT = process.env.PORT || 3000;
app.use(cors());

// Test Pinecone connection
testConnection();

// Multer setup for file upload
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads/');
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + path.extname(file.originalname)); // Add timestamp to prevent name collisions
    }
});

const upload = multer({ storage });

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.use('/api/files', upload.single('file'), fileRoutes);
app.use('/api/chat', chatRoutes); // Use the chat routes

// Start server
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
