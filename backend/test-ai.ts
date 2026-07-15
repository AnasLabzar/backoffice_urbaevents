import 'dotenv/config';
import { analyzeCPSFile } from './src/services/aiService';

async function test() {
    try {
        console.log("Testing AI Service...");
        // Use a dummy file or test if the function compiles and runs
        // We'll just test if the API key is loaded
        console.log("API KEY:", process.env.OPENROUTER_API_KEY ? "Loaded" : "Missing");
        console.log("Model:", process.env.AI_MODEL || "Default");
        
        // Let's create a dummy text file to act as PDF for testing, but pdf-parse expects a real PDF.
        // I won't run analyzeCPSFile with a dummy text file since it will fail pdf parsing.
        console.log("Test script ready.");
    } catch (e) {
        console.error(e);
    }
}
test();
