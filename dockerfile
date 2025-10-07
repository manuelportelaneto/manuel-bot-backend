# Dockerfile para uma aplicação Node.js (Express)

# Passo 1: Use uma imagem base oficial do Node.js.
# Usamos a 18-slim, que é leve e compatível com o código que escrevemos.
FROM node:18-slim

# Passo 2: Define o diretório de trabalho dentro do contêiner.
WORKDIR /app

# Passo 3: Copia os arquivos que definem as dependências.
# O asterisco em package*.json copia tanto o package.json quanto o package-lock.json.
# Isso é uma otimização para aproveitar o cache do Docker.
COPY package*.json ./

# Passo 4: Instala as dependências de produção.
RUN npm install --only=production

# Passo 5: Copia o resto do seu código-fonte (index.js, knowledge_base.txt, etc.).
COPY . .

# Passo 6: Expõe a porta que nosso servidor Express vai usar (definida no index.js como 8080).
EXPOSE 8080

# Passo 7: O comando final para iniciar o servidor quando o contêiner for executado.
CMD ["node", "index.js"]