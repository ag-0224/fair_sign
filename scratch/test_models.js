import { GoogleGenerativeAI } from "@google/generative-ai";
import dotenv from "dotenv";
dotenv.config();

const API_KEY = process.env.VITE_GEMINI_API_KEY;

async function test() {
  if (!API_KEY) {
    console.error("API_KEY not found in .env");
    return;
  }
  const genAI = new GoogleGenerativeAI(API_KEY);
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    console.log("Attempting to list models...");
    // We'll try to list models if possible, or just try a simple call
    const result = await model.generateContent("Hi");
    console.log("Success with gemini-1.5-flash!");
  } catch (e) {
    console.error("Failed with gemini-1.5-flash:", e.message);
    console.log("\nTrying to list all models...");
    try {
      // The SDK doesn't have a direct listModels in the simple client sometimes,
      // but let's try gemini-pro as a fallback
      const modelPro = genAI.getGenerativeModel({ model: "gemini-pro" });
      const resultPro = await modelPro.generateContent("Hi");
      console.log("Success with gemini-pro!");
    } catch (e2) {
      console.error("Failed with gemini-pro:", e2.message);
    }
  }
}

test();
