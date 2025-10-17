require('dotenv').config();
const express = require('express');
const OpenAI = require('openai');
const cors = require('cors');

const app = express();
const port = process.env.PORT || 10000;
app.use(express.json());
app.use(cors());

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const ASSISTANT_ID = process.env.ASSISTANT_ID;

app.post('/api/chat', async (req, res) => {
    if (!ASSISTANT_ID || !process.env.OPENAI_API_KEY) {
        console.error("ERRO: Variáveis de ambiente da OpenAI não encontradas.");
        return res.status(500).json({ error: "Configuração do servidor do assistente incompleta." });
    }

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
        
        const run = await openai.beta.threads.runs.createAndPoll(
            threadId, 
            { assistant_id: ASSISTANT_ID }
        );

        if (run.status === 'completed') {
            const messages = await openai.beta.threads.messages.list(run.thread_id);
            const botResponse = messages.data[0].content[0].text.value;
            
            return res.status(200).json({ answer: botResponse, threadId: run.thread_id });
        } else {
            throw new Error(`A execução do assistente falhou com o status: ${run.status}`);
        }

    } catch (error) {
        console.error("ERRO CRÍTICO NA ROTA /api/chat:", error);
        return res.status(500).json({ error: "Ocorreu um erro interno ao se comunicar com a OpenAI." });
    }
});

app.listen(port, () => {
    console.log(`Servidor do 'Manuel (bot)' rodando na porta ${port}.`);
});