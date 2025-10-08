// index.js (A VERSÃO FINAL DA VITÓRIA ABSOLUTA)
require('dotenv').config();
const express = require('express');
const OpenAI = require('openai');
const cors = require('cors');

const app = express();
const port = process.env.PORT || 8080;
app.use(express.json());
app.use(cors());

// --- INICIALIZAÇÃO ---
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const ASSISTANT_ID = process.env.ASSISTANT_ID;

app.post('/api/chat', async (req, res) => {
    try {
        let { question, threadId } = req.body;
        
        if (!threadId) {
            const thread = await openai.beta.threads.create();
            threadId = thread.id;
        }

        await openai.beta.threads.messages.create(threadId, {
            role: "user",
            content: question
        });

        const run = await openai.beta.threads.runs.create(threadId, {
            assistant_id: ASSISTANT_ID
        });

        let runStatus = await openai.beta.threads.runs.retrieve(threadId, run.id);
        while (runStatus.status === "in_progress" || runStatus.status === 'queued') {
            await new Promise(resolve => setTimeout(resolve, 300));
            runStatus = await openai.beta.threads.runs.retrieve(threadId, run.id);
        }
        
        if (runStatus.status !== "completed") {
            throw new Error(`A execução falhou com o status: ${runStatus.status}`);
        }

        const messages = await openai.beta.threads.messages.list(threadId);
        const botResponse = messages.data[0].content[0].text.value;
        
        res.status(200).json({ answer: botResponse, threadId: threadId });

    } catch (error) {
        console.error("ERRO CRÍTICO NA ROTA /api/chat:", error);
        res.status(500).json({ error: "Ocorreu um erro interno ao se comunicar com a OpenAI." });
    }
});

app.listen(port, "0.0.0.0", () => {
    console.log(`Servidor do Manuel (bot) rodando na porta ${port}.`);
});