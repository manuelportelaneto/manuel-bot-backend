// index.js
require('dotenv').config();
const express = require('express');
const OpenAI = require('openai');
const cors = require('cors');

const app = express();
const port = process.env.PORT || 8080;
app.use(express.json());
app.use(cors());

// --- INICIALIZAÇÃO E CONFIGURAÇÃO ---
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const ASSISTANT_ID = process.env.ASSISTANT_ID; // O ID do "Manuel (robô)"

// --- A ROTA PRINCIPAL DA API ---
app.post('/api/chat', async (req, res) => {
    try {
        const { question, threadId } = req.body; // Recebemos a pergunta e o ID do chat
        
        // Se não houver threadId, significa que é a primeira mensagem de uma nova conversa.
        // O OpenAI gerencia o histórico dentro do "Thread".
        const currentThreadId = threadId || (await openai.beta.threads.create()).id;
        
        // 1. Adiciona a mensagem do usuário ao Thread
        await openai.beta.threads.messages.create(currentThreadId, {
            role: "user",
            content: question
        });

        // 2. Executa o Assistente no Thread
        const run = await openai.beta.threads.runs.create(currentThreadId, {
            assistant_id: ASSISTANT_ID
        });

        // 3. Aguarda a conclusão da execução
        let runStatus;
        do {
            await new Promise(resolve => setTimeout(resolve, 500)); // Espera 0.5s
            runStatus = await openai.beta.threads.runs.retrieve(currentThreadId, run.id);
        } while (runStatus.status === "running" || runStatus.status === "in_progress");

        if (runStatus.status !== "completed") {
            throw new Error(`A execução do assistente falhou com o status: ${runStatus.status}`);
        }

        // 4. Pega a última mensagem (a resposta do bot) do Thread
        const messages = await openai.beta.threads.messages.list(currentThreadId);
        const botResponse = messages.data[0].content[0].text.value;
        
        // O frontend agora só precisa da resposta e do threadId para continuar a conversa
        res.status(200).json({ answer: botResponse, threadId: currentThreadId });

    } catch (error) {
        console.error("ERRO CRÍTICO NA ROTA /api/chat:", error);
        res.status(500).json({ error: "Ocorreu um erro interno ao se comunicar com a OpenAI." });
    }
});

app.listen(port, "0.0.0.0", () => {
    console.log(`Servidor do Manuel (bot) rodando na porta ${port}.`);
});