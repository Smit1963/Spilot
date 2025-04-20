"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const dotenv = __importStar(require("dotenv"));
const fetch = (...args) => Promise.resolve().then(() => __importStar(require('node-fetch'))).then(mod => mod.default(...args));
dotenv.config(); // Load .env file
const apiKey = process.env.API_KEY; // Read API key
if (!apiKey) {
    console.error('❌ API key not found!');
    process.exit(1);
}
async function askQuestion(question) {
    const url = 'https://api.groq.com/openai/v1/chat/completions'; // Groq's chat completion endpoint
    const body = JSON.stringify({
        model: "meta-llama/llama-4-scout-17b-16e-instruct", // Replace with the correct model name
        messages: [
            { role: "user", content: question }
        ],
        temperature: 0.7,
        max_tokens: 100
    });
    const response = await fetch(url, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json'
        },
        body: body
    });
    const rawText = await response.text();
    console.log('🌐 Raw response from Groq:', rawText);
    if (!response.ok) {
        console.error('❌ Failed to communicate with Groq API');
    }
    else {
        let data;
        try {
            data = JSON.parse(rawText);
            console.log('Response:', data.choices?.[0]?.message?.content);
        }
        catch (error) {
            console.error('❌ Failed to parse the response:', error);
        }
    }
}
askQuestion('What is the capital of France?');
//# sourceMappingURL=test.js.map