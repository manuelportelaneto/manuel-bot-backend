// index.js (Versão Final da Vitória com OpenAI)
require('dotenv').config();
const express = require('express');
const OpenAI = require('openai'); // Usando a biblioteca da OpenAI
const cors = require('cors');

const app = express();
const port = process.env.PORT || 10000;
app.use(express.json());
app.use(cors());

// --- INICIALIZAÇÃO OpenAI ---
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const ASSISTANT_ID = process.env.ASSISTANT_ID;

app.post('/api/chat', async (req, res) => {
    // Validação de segurança para garantir que as chaves foram carregadas
    if (!ASSISTANT_ID || !process.env.OPENAI_API_KEY) {
        console.error("ERRO: Variáveis de ambiente da OpenAI não encontradas.");
        return res.status(500).json({ error: "Configuração do servidor do assistente incompleta." });
    }

    try {
        let { question, threadId } = req.body;
        
        // Se for a primeira mensagem, cria uma nova thread de conversa.
        if (!threadId) {
            const thread = await openai.beta.threads.create();
            threadId = thread.id;
        }

        // Adiciona a mensagem do usuário à thread.
        await openai.beta.threads.messages.create(threadId, {
            role: "user",
            content: question
        });

        // Executa o assistente na thread.
        const run = await openai.beta.threads.runs.create(threadId, {
            assistant_id: ASSISTANT_ID
        });

        // Aguarda a conclusão da execução.
        let runStatus = await openai.beta.threads.runs.retrieve(threadId, run.id);
        while (runStatus.status === "in_progress" || runStatus.status === 'queued') {
            await new Promise(resolve => setTimeout(resolve, 500)); // Polling a cada 0.5s
            runStatus = await openai.beta.threads.runs.retrieve(threadId, run.id);
        }
        
        if (runStatus.status !== "completed") {
            throw new Error(`A execução falhou com o status: ${runStatus.status}`);
        }

        // Pega a lista de mensagens da thread, que agora inclui a resposta.
        const messages = await openai.beta.threads.messages.list(threadId);
        
        // A primeira mensagem da lista (mais recente) é a do assistente.
        const botResponse = messages.data[0].content[0].text.value;
        
        // Retorna a resposta e o threadId para o frontend continuar a conversa.
        return res.status(200).json({ answer: botResponse, threadId: threadId });

    } catch (error) {
        console.error("ERRO CRÍTICO NA ROTA /api/chat:", error);
        return res.status(500).json({ error: "Ocorreu um erro interno ao se comunicar com a OpenAI." });
    }
});

app.listen(port, () => {
    console.log(`Servidor do 'Manuel (bot)' rodando na porta ${port}.`);
});