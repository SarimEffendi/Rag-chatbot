import express from 'express';
import { uploadFile, processFileFromPath} from "../controllers/fileUpload.controller.js";

const router = express.Router();

// Route for uploading and processing files
router.post('/upload', uploadFile);

// Route for processing file from a specified path
router.get('/process', processFileFromPath);

// Route for handling chatbot queries
// router.post('/chat', async (req, res) => {
//     const { query } = req.body; // Expecting a JSON body with a 'query' field

//     if (!query) {
//         return res.status(400).json({ error: 'Query is required' });
//     }

//     try {
//         const response = await getChatbotResponse(query);
//         res.status(200).json({ response });
//     } catch (error) {
//         console.error('Error in chat route:', error);
//         res.status(500).json({ error: 'Failed to fetch chatbot response' });
//     }
// });

export default router;
