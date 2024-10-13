
import { GoogleGenerativeAI} from '@google/generative-ai'
import { pc } from '../config/pineconeClient.js';

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);

const contactDetails = "You can reach us at contact@tekrevol.com or call us at +123-456-7890.";

export const getChatbotResponse = async (query, maxLines = 20) => {
    try {
        const startTime = Date.now();

        // Embedding the query
        const model = genAI.getGenerativeModel({ model: "text-embedding-004" });
        const embedResponse = await model.embedContent(query);

        const queryEmbedding = embedResponse.embedding.values;
        console.log('Query Embedding:', queryEmbedding);

        const scoreThreshold = 0.4;
        const pineconeIndex = pc.Index(process.env.PINECONE_INDEX_NAME).namespace('default');
        const results = await pineconeIndex.query({
            topK: 5,
            vector: queryEmbedding,
            includeMetadata: true,
            includeValues: true,
        });

        console.log('Query Results:', results);

        if (!results.matches || results.matches.length === 0) {
            const endTime = Date.now();
            console.log(`Response time: ${endTime - startTime}ms`);
            return `I couldn't find any information related to your query. Please reach out to us for further assistance. ${contactDetails}`;
        }

        const relevantMatches = results.matches.filter((match) => match.score >= scoreThreshold);
        console.log('Relevant Matches:', relevantMatches);

        if (relevantMatches.length === 0) {
            const endTime = Date.now();
            console.log(`Response time: ${endTime - startTime}ms`);
            return `It seems we don't have enough relevant information to answer your question. Please reach out to us for more details. ${contactDetails}`;
        }

        let retrievedContext = relevantMatches.map((match) => match.metadata.text || '').join(' ');

        if (!retrievedContext || retrievedContext.trim().length < 50) {
            const endTime = Date.now();
            console.log(`Response time: ${endTime - startTime}ms`);
            return `The available context is insufficient to provide a meaningful answer. Please contact us for further assistance. ${contactDetails}`;
        }

        retrievedContext = retrievedContext.split(' ').slice(0, 1500).join(' ');

        const prompt = `Assistant for the "Hair Dash" project. Answer questions based on the following context:

Context:
${retrievedContext}

Question:
${query}

Answer (focus on project features and functionalities, and do not give a general or unrelated response):`;

        const maxOutputTokens = query.length > 100 ? 900 : 700;

        const generationResponse = await genAI.generate({
            model: 'chat-bison-001',
            prompt: prompt,
            max_tokens: maxOutputTokens,
            temperature: 0.5,
            stop_sequences: ["\n"],
        });

        if (generationResponse && generationResponse.generations && generationResponse.generations.length > 0) {
            const generatedText = generationResponse.generations[0].text.trim();

            const endTime = Date.now();
            console.log(`Response time: ${endTime - startTime}ms`);

            return generatedText;
        } else {
            console.error('Unexpected response:', generationResponse);
            const endTime = Date.now();
            console.log(`Response time: ${endTime - startTime}ms`);
            return `Sorry, I couldn't generate a relevant response to your query. If you have further questions, please contact us. ${contactDetails}`;
        }
    } catch (error) {
        console.error('Error fetching response:', error);
        throw new Error(`Failed to fetch chatbot response. Please reach out to us for assistance. ${contactDetails}`);
    }
};
