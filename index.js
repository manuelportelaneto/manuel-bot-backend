require('dotenv').config();
const express = require('express');
const OpenAI = require('openai');
const cors = require('cors');
// ADIÇÃO 1: Importa o cliente da Supabase
const { createClient } = require('@supabase/supabase-js');

const app = express();
const port = process.env.PORT || 10000;
app.use(express.json());
app.use(cors());

// ADIÇÃO 2: Inicializa os clientes da OpenAI e da Supabase
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const ASSISTANT_ID = process.env.ASSISTANT_ID;
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);
//------------------------------------------------------------

app.post('/api/chat', async (req, res) => {
    // A validação de variáveis de ambiente foi ajustada
    if (!ASSISTANT_ID || !process.env.OPENAI_API_KEY || !process.env.SUPABASE_URL || !process.env.SUPABASE_ANON_KEY) {
        console.error("ERRO CRÍTICO: Uma ou mais variáveis de ambiente (OpenAI, Supabase) não foram encontradas.");
        return res.status(500).json({ error: "Configuração do servidor do assistente incompleta." });
    }

    try {
        // ADIÇÃO 3: Agora esperamos a sessionId vinda do frontend
        let { question, threadId, sessionId } = req.body;
        //-----------------------------------------------------

        if (!sessionId) {
            return res.status(400).json({ error: "sessionId é obrigatório para o log da conversa." });
        }
        
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

            // ADIÇÃO 4: A LÓGICA DE SALVAMENTO NO BANCO DE DADOS
            // Formata o histórico completo da OpenAI para salvar
            const fullHistoryFromAI = messages.data.map(msg => ({
                role: msg.role,
                content: msg.content[0].text.value
            })).reverse(); // Inverte para ter a ordem cronológica correta

            // A operação de salvar não bloqueia o envio da resposta para o usuário
            supabase
                .from('chat_logs')
                .upsert({ session_id: sessionId, conversation: fullHistoryFromAI, updated_at: new Date() })
                .then(({ error }) => {
                    if (error) console.error("Erro ao salvar log no Supabase:", error);
                });
            // --------------------------------------------------------

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