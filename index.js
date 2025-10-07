require('dotenv').config();
const express = require('express');
const fetch = require('node-fetch');
const cors = require('cors');

const app = express();
const port = process.env.PORT || 8080;
app.use(express.json());
app.use(cors()); // CORS aberto para máxima compatibilidade

// --- URL E CHAVE DO SEU AGENTE ---
// Estas virão das variáveis de ambiente no Cloud Run
const GRADIO_URL = process.env.GRADIO_API_URL;
const VERTEX_API_KEY = process.env.VERTEX_API_KEY; 
// ------------------------------------

app.post('/api/chat', async (req, res) => {
    // Validação de segurança básica
    if (!GRADIO_URL || !VERTEX_API_KEY) {
        console.error("ERRO CRÍTICO: URLs ou chaves do Gradio/Vertex não configuradas.");
        return res.status(500).json({ error: "Configuração do servidor incompleta." });
    }

    try {
        const { question, history = [] } = req.body; // history pode não ser usado pelo Gradio, mas recebemos.
        
        // --- PREPARA A CHAMADA PARA A API GRADIO ---
        // A API Gradio tem um formato específico de 'payload'.
        // Geralmente é uma estrutura de dados aninhada. Vamos usar um formato simples
        // que seu agente Gradio, treinado com seu prompt, deve entender.
        const gradioPayload = {
            data: [
                { text: question } // Enviamos a pergunta dentro de uma estrutura
            ]
        };
        
        const response = await fetch(`${GRADIO_URL}/run/predict`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${VERTEX_API_KEY}` // Autenticação
            },
            body: JSON.stringify(gradioPayload)
        });
        
        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`A API Gradio respondeu com erro ${response.status}: ${errorText}`);
        }

        const result = await response.json();

        // O formato da resposta do Gradio é { data: [ [ { text: "resposta do bot" } ] ] }
        const botResponse = result.data[0].text;
        // ---------------------------------------
        
        // A lógica do newHistory permanece no nosso backend
        const newHistory = [...history, { role: "user", parts: [{ text: question }] }, { role: "model", parts: [{ text: botResponse }] }];

        return res.status(200).json({ answer: botResponse, history: newHistory });

    } catch (error) {
        console.error("ERRO CRÍTICO NA ROTA /api/chat:", error);
        return res.status(500).json({ error: "Ocorreu um erro interno ao se comunicar com o agente Gradio." });
    }
});

app.listen(port, "0.0.0.0", () => {
    console.log(`Servidor do Manuel (bot) rodando na porta ${port}.`);
});