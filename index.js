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
        
        // Se não houver threadId, cria uma nova. A 'threadId' é a nossa memória de conversa.
        if (!threadId) {
            const thread = await openai.beta.threads.create();
            threadId = thread.id;
        }

        // Adiciona a mensagem do usuário à thread existente
        await openai.beta.threads.messages.create(threadId, {
            role: "user",
            content: question
        });

        // Executa o Assistente
        const run = await openai.beta.threads.runs.create(threadId, {
            assistant_id: ASSISTANT_ID
        });

        // Aguarda a conclusão da execução do assistente
        let runStatus = await openai.beta.threads.runs.retrieve(threadId, run.id);
        while (runStatus.status === "in_progress" || runStatus.status === 'queued' || runStatus.status === 'running') {
            await new Promise(resolve => setTimeout(resolve, 300)); // Espera
            runStatus = await openai.beta.threads.runs.retrieve(threadId, run.id);
        }
        
        if (runStatus.status !== "completed") {
            throw new Error(`A execução falhou com o status: ${runStatus.status}`);
        }

        // Pega as mensagens da thread, que agora incluem a resposta do bot
        const messages = await openai.beta.threads.messages.list(threadId);
        
        // A última mensagem é a do bot
        const botResponse = messages.data[0].content[0].text.value;
        
        // Retorna a resposta e a threadId para o frontend
        res.status(200).json({ answer: botResponse, threadId: threadId });

    } catch (error) {
        console.error("ERRO CRÍTICO NA ROTA /api/chat:", error);
        res.status(500).json({ error: "Ocorreu um erro interno ao se comunicar com a OpenAI." });
    }
});

app.listen(port, "0.0.0.0", () => {
    console.log(`Servidor do Manuel (bot) rodando na porta ${port}.`);
});