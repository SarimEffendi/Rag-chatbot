import fs from 'fs/promises';
import path from 'path';
import { RecursiveCharacterTextSplitter } from 'langchain/text_splitter';
import { pc } from '../config/pineconeClient.js';
import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);

const readJsonContent = async (filePath) => {
    try {
        const absoluteFilePath = path.resolve(filePath);
        await fs.access(absoluteFilePath); 
        const content = await fs.readFile(absoluteFilePath, 'utf8');
        const jsonData = JSON.parse(content);

        const extractTextFromJson = (data) => {
            let text = '';
            if (typeof data === 'object') {
                for (const key in data) {
                    text += extractTextFromJson(data[key]) + ' ';
                }
            } else if (typeof data === 'string') {
                text += data + ' ';
            }
            return text;
        };

        return extractTextFromJson(jsonData).trim();
    } catch (error) {
        throw new Error('Error reading JSON content: ' + error.message);
    }
};

export const processTextFile = async (filePath, originalFileName, namespace = 'default') => {
    try {
        const index = pc.Index(process.env.PINECONE_INDEX_NAME);
        const fileExtension = path.extname(originalFileName).toLowerCase();

        let textContent = '';

        if (fileExtension === '.txt') {
            textContent = await fs.readFile(filePath, 'utf8');
        } else if (fileExtension === '.json') {
            textContent = await readJsonContent(filePath);
        } else {
            throw new Error('Unsupported file format. Only TXT and JSON files are supported.');
        }

        console.log(`Processing text...`);

        const splitter = new RecursiveCharacterTextSplitter({
            chunkSize: 500, 
            chunkOverlap: 200,
            separators: ['\n\n', '\n', ' ', ''],
        });

        const chunks = await splitter.createDocuments([textContent]);

        if (chunks.length === 0) {
            console.error('No text chunks were created from the file.');
            return;
        }

        const model = genAI.getGenerativeModel({ model: "text-embedding-004" });
        const embeddings = await Promise.all(
            chunks.map(async (chunk) => {
                const result = await model.embedContent(chunk.pageContent);
                return result.embedding.values;
            })
        );

        const vectors = chunks.map((chunk, i) => ({
            id: `doc-${i}`,
            values: embeddings[i],
            metadata: { text: chunk.pageContent },
        }));

        console.log(`Successfully created ${vectors.length} vectors.`);

        if (vectors.length > 0) {
            await index.namespace(namespace).upsert(vectors);
            console.log(`Processed and stored ${chunks.length} documents in namespace "${namespace}".`);
            return `Processed ${chunks.length} documents from the file.`;
        } else {
            console.error('No valid vectors to upsert.');
        }
    } catch (error) {
        console.error('Error processing file:', error);
        throw new Error('Failed to process and store the file.');
    }
};
