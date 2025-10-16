require('dotenv').config();
const express = require('express');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
const port = process.env.PORT || 10000;
app.use(express.json());
app.use(cors());

// --- INICIALIZAÇÃO E VERIFICAÇÃO ---
if (!process.env.GEMINI_API_KEY) {
    console.error("ERRO: A variável de ambiente GEMINI_API_KEY não foi definida.");
    process.exit(1);
}
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const knowledgeBaseContent = fs.readFileSync(path.join(__dirname, 'knowledge_base.txt'), 'utf8');
// ------------------------------------

app.post('/api/chat', async (req, res) => {
    try {
        const { history = [], question } = req.body;

        const systemPrompt = `[COPIE SEU PROMPT DETALHADO AQUI] \n\n Base de Conhecimento: \n${knowledgeBaseContent}`;
        
        const model = genAI.getGenerativeModel({ model: "gemini-pro" });
        const chat = model.startChat({
            history: [
                { role: "user", parts: [{ text: systemPrompt }] },
                { role: "model", parts: [{ text: "Entendido." }] },
                ...history,
            ],
        });
        
        const result = await chat.sendMessage(question);
        const botResponse = result.response.text();
        
        const newHistory = [...history, { role: "user", parts: [{ text: question }] }, { role: "model", parts: [{ text: botResponse }] }];
        
        // Lógica de Supabase desativada por simplicidade
        
        return res.status(200).json({ answer: botResponse, history: newHistory });

    } catch (error) {
        console.error("ERRO CRÍTICO NA ROTA /api/chat:", error.message);
        return res.status(500).json({ error: "Ocorreu um erro ao se comunicar com a IA do Gemini." });
    }
});

app.listen(port, () => {
    console.log(`Servidor do 'Manuel (bot)' rodando na porta ${port}.`);
});