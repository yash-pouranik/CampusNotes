const axios = require('axios');
const { GoogleGenerativeAI } = require("@google/generative-ai");

class AIService {
    constructor() {
        this.groqApiKey = process.env.GROQ_API_KEY;
        this.geminiApiKey = process.env.GEMINI_API_KEY;
        this.groqModel = "groq/compound"; 
    }


    async generateResponse(messages, context = "") {
        // 1. Try Groq First (Preferred for quota)
        if (this.groqApiKey) {
            try {
                return await this._callGroq(messages, context);
            } catch (error) {
                console.warn("Groq failed, falling back to Gemini if available.", error.message);
                // Fallback will happen below
            }
        }

        // 2. Fallback to Gemini
        if (this.geminiApiKey) {
            return await this._callGemini(messages, context);
        }

        throw new Error("No available AI Provider configured. Please check GROQ_API_KEY or GEMINI_API_KEY.");
    }

    async _callGroq(messages, context) {
        // Construct System Prompt
        let systemPrompt = "You are 'Campus AI', a smart study assistant. IMPORTANT: Keep answers very concise, specific, and to the point. Avoid fluff. Use bullet points where possible to save tokens.";
        if (context) {
            systemPrompt += `\n\nCONTEXT FROM USER NOTE:\n${context}\n\nUse this context to answer the user's question.`;
        }


        const apiMessages = [
            { role: "system", content: systemPrompt },
            ...messages
                .filter(m => m.content && m.content.trim() !== "") // Remove empty
                .map(m => ({
                    role: m.role === 'ai' ? 'assistant' : 'user', // Ensure strict 'user'/'assistant' roles
                    content: m.content
                }))
        ];

        try {
            const response = await axios.post(
                'https://api.groq.com/openai/v1/chat/completions',
                {
                    model: this.groqModel,
                    messages: apiMessages,
                    temperature: 0.7,
                    max_tokens: 1024
                },
                {
                    headers: {
                        'Authorization': `Bearer ${this.groqApiKey}`,
                        'Content-Type': 'application/json'
                    }
                }
            );
            return response.data.choices[0].message.content;
        } catch (error) {
            // Enhanced logging for Groq errors
            console.error("Groq API Error:", error.response ? error.response.data : error.message);
            throw error;
        }
    }

    async _callGemini(messages, context) {
        // Gemini logic using the SDK (existing logic refactored)
        const genAI = new GoogleGenerativeAI(this.geminiApiKey);
        // Use the stable alias
        const model = genAI.getGenerativeModel({ model: "gemini-flash-latest" });

        // History construction
        const history = messages.map(m => `${m.role === 'user' ? 'User' : 'AI'}: ${m.content}`).join('\n');
        const lastMsg = messages[messages.length - 1]; // Actually we need the LAST user message separately for generateContent usually, or purely prompt based.

        let prompt = `System: You are a helpful study assistant.\n`;
        if (context) prompt += `Context: ${context}\n`;
        prompt += `\nConversation:\n${history}\nAnswer:`;

        const result = await model.generateContent(prompt);
        const response = await result.response;
        return response.text();
    }
}

module.exports = new AIService();
