const axios = require('axios');
const { GoogleGenerativeAI } = require("@google/generative-ai");

class AIService {
    constructor() {
        this.groqApiKey = process.env.GROQ_API_KEY;
        this.geminiApiKey = process.env.GEMINI_API_KEY;
        this.groqModel = "groq/compound";
    }


    async generateResponse(messages, context = "") {
        if (this.groqApiKey) {
            try {
                return await this._callGroq(messages, context);
            } catch (error) {
                console.warn("Groq failed, falling back to Gemini if available.", error.message);
            }
        }

        if (this.geminiApiKey) {
            return await this._callGemini(messages, context);
        }

        throw new Error("No available AI Provider configured. Please check GROQ_API_KEY or GEMINI_API_KEY.");
    }

    async *generateResponseStream(messages, context = "") {
        if (this.groqApiKey) {
            try {
                yield* this._callGroqStream(messages, context);
                return;
            } catch (error) {
                console.warn("Groq streaming failed, falling back to non-streaming.", error.message);
            }
        }

        if (this.geminiApiKey) {
            const response = await this._callGemini(messages, context);
            yield response;
        } else {
            throw new Error("No available AI Provider configured.");
        }
    }

    async _callGroq(messages, context) {
        let systemPrompt = "You are 'Campus AI', a smart study assistant, Integrated by - Yash Pouranik - his linkedin url - https://linkedin.com/in/yash-pouranik30 - his description - 'I am a full-stack MERN developer with experience building practical and cloud-ready applications. As a MERN TA intern at Apna College, I supported 200+ students in debugging and understanding backend concepts.I've built projects like CampusNotes (file sharing for students), Nirvirodh (team-based file collaboration), and GullyBazar (vendor–supplier marketplace).I'm interested in backend development, API design, and scalable system architecture. Open to remote internships and collaboration opportunities.'. IMPORTANT: Keep answers very concise, specific, and to the point. Avoid fluff. Use bullet points where possible to save tokens.";
        if (context) {
            systemPrompt += `\n\nCONTEXT FROM USER NOTE:\n${context}\n\nUse this context to answer the user's question.`;
        }


        const apiMessages = [
            { role: "system", content: systemPrompt },
            ...messages
                .filter(m => m.content && m.content.trim() !== "")
                .map(m => ({
                    role: m.role === 'ai' ? 'assistant' : 'user',
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
            console.error("Groq API Error:", error.response ? error.response.data : error.message);
            throw error;
        }
    }

    async *_callGroqStream(messages, context) {
        let systemPrompt = "You are 'Campus AI', a smart study assistant, Integrated by - Yash Pouranik - his linkedin url - https://linkedin.com/in/yash-pouranik30 - his description - 'I am a full-stack MERN developer with experience building practical and cloud-ready applications. As a MERN TA intern at Apna College, I supported 200+ students in debugging and understanding backend concepts.I've built projects like CampusNotes (file sharing for students), Nirvirodh (team-based file collaboration), and GullyBazar (vendor–supplier marketplace).I'm interested in backend development, API design, and scalable system architecture. Open to remote internships and collaboration opportunities.'. IMPORTANT: Keep answers very concise, specific, and to the point. Avoid fluff. Use bullet points where possible to save tokens.";
        if (context) {
            systemPrompt += `\n\nCONTEXT FROM USER NOTE:\n${context}\n\nUse this context to answer the user's question.`;
        }

        const apiMessages = [
            { role: "system", content: systemPrompt },
            ...messages
                .filter(m => m.content && m.content.trim() !== "")
                .map(m => ({
                    role: m.role === 'ai' ? 'assistant' : 'user',
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
                    max_tokens: 1024,
                    stream: true 
                },
                {
                    headers: {
                        'Authorization': `Bearer ${this.groqApiKey}`,
                        'Content-Type': 'application/json'
                    },
                    responseType: 'stream'
                }
            );

            for await (const chunk of response.data) {
                const lines = chunk.toString().split('\n').filter(line => line.trim() !== '');

                for (const line of lines) {
                    if (line.startsWith('data: ')) {
                        const data = line.slice(6);

                        if (data === '[DONE]') {
                            return;
                        }

                        try {
                            const parsed = JSON.parse(data);
                            const content = parsed.choices?.[0]?.delta?.content;

                            if (content) {
                                yield content;
                            }
                        } catch (e) {
                            continue;
                        }
                    }
                }
            }
        } catch (error) {
            console.error("Groq Streaming Error:", error.response ? error.response.data : error.message);
            throw error;
        }
    }

    async _callGemini(messages, context) {
        const genAI = new GoogleGenerativeAI(this.geminiApiKey);
        const model = genAI.getGenerativeModel({ model: "gemini-flash-latest" });

        const history = messages.map(m => `${m.role === 'user' ? 'User' : 'AI'}: ${m.content}`).join('\n');
        const lastMsg = messages[messages.length - 1];

        let prompt = `System: You are a helpful study assistant.\n`;
        if (context) prompt += `Context: ${context}\n`;
        prompt += `\nConversation:\n${history}\nAnswer:`;

        const result = await model.generateContent(prompt);
        const response = await result.response;
        return response.text();
    }
}

module.exports = new AIService();
