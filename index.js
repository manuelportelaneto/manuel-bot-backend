
require('dotenv').config();
const express = require('express');
const OpenAI = require('openai');
const cors = require('cors');

const app = express();
const port = process.env.PORT || 10000;
app.use(express.json());
app.use(cors());

// Verificamos se TODAS as variáveis de ambiente necessárias agora existem
if (!process.env.OPENAI_API_KEY || !process.env.ASSISTANT_ID || !process.env.KNOWLEDGE_BASE) {
    console.error("ERRO CRÍTICO: Uma ou mais variáveis de ambiente (OPENAI_API_KEY, ASSISTANT_ID, KNOWLEDGE_BASE) não foram encontradas.");
}

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const ASSISTANT_ID = process.env.ASSISTANT_ID;
// O conhecimento agora vem de uma variável de ambiente, não de um arquivo.
const knowledgeBaseContent = process.env.KNOWLEDGE_BASE;
// -----------------------------

app.post('/api/chat', async (req, res) => {
    // A validação foi movida para o início para falhar rápido se a configuração estiver errada.
    if (!ASSISTANT_ID || !process.env.OPENAI_API_KEY || !knowledgeBaseContent) {
        return res.status(500).json({ error: "Configuração do servidor do assistente está incompleta." });
    }

    try {
        let { question, threadId } = req.body;
        
        // A cada chamada, nós atualizamos o assistente com o nosso "knowledge base"
        // que está seguro na variável de ambiente.
        await openai.beta.assistants.update(ASSISTANT_ID, {
            instructions: knowledgeBaseContent
        });
        // ------------------------------

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
            const botResponse = messages.data.find(msg => msg.role === 'assistant').content[0].text.value;
            
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