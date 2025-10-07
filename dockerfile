# Dockerfile

# Passo 1: Use uma imagem base oficial do Python.
# Usamos a 3.11, que é moderna e estável.
FROM python:3.11-slim

# Passo 2: Define o diretório de trabalho dentro do contêiner.
WORKDIR /app

# Passo 3: Copia o arquivo de dependências para dentro do contêiner.
COPY requirements.txt .

# Passo 4: Instala as dependências.
# A flag --no-cache-dir reduz o tamanho final da imagem.
RUN pip install --no-cache-dir -r requirements.txt

# Passo 5: Copia o resto do seu código (o index.js, knowledge_base.txt, etc.) para o contêiner.
COPY . .

# Passo 6: Expõe a porta que nosso servidor Express vai usar (8080).
EXPOSE 8080

# Passo 7: O comando final para iniciar o servidor quando o contêiner for executado.
CMD ["node", "index.js"]