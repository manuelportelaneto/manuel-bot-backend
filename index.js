// index.js (Versão Final com Gradio)
require('dotenv').config();
const express = require('express');
const fetch = require('node-fetch');
const cors = require('cors');

const app = express();
const port = process.env.PORT || 8080;
app.use(express.json());
app.use(cors());

const GRADIO_URL = process.env.GRADIO_API_URL;
const VERTEX_API_KEY = process.env.VERTEX_API_KEY; 

// === A ROTA CORRETA É '/' ou uma rota que você defina.
// Para simplificar, vamos usar uma rota explícita para evitar ambiguidades.
app.post('/predict', async (req, res) => { // A ROTA MUDOU DE /api/chat PARA /predict
    if (!GRADIO_URL || !VERTEX_API_KEY) {
        return res.status(500).json({ error: "Configuração do servidor incompleta." });
    }

    try {
        const { question, history = [] } = req.body;
        
        // Adapta o payload para a API do Gradio/Vertex
        const gradioPayload = {
            data: [
              question // A API Gradio espera a mensagem do usuário aqui
            ]
        };
        
        // Chamada correta para a API Gradio (o /run/predict é o endpoint da API do Gradio)
        const response = await fetch(`${GRADIO_URL}/run/predict`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${VERTEX_API_KEY}`
            },
            body: JSON.stringify(gradioPayload)
        });
        
        if (!response.ok) {
            throw new Error(`A API Gradio respondeu com erro ${response.status}`);
        }

        const result = await response.json();
        
        // Extrai a resposta do bot da estrutura de dados do Gradio
        const botResponse = result.data[0];
        
        const newHistory = [...history, { role: "user", parts: [{ text: question }] }, { role: "model", parts: [{ text: botResponse }] }];

        return res.status(200).json({ answer: botResponse, history: newHistory });

    } catch (error) {
        console.error("ERRO CRÍTICO NA ROTA:", error);
        return res.status(500).json({ error: "Ocorreu um erro interno ao se comunicar com o agente Gradio." });
    }
});

app.listen(port, "0.0.0.0", () => {
    console.log(`Servidor do Manuel (bot) rodando na porta ${port}.`);
});