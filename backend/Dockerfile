FROM node:20-slim
RUN apt-get update && apt-get install -y \
    chromium libnss3 libatk-bridge2.0-0 libdrm2 libxcomposite1 \
    libxdamage1 libxrandr2 libgbm1 libasound2 libpangocairo-1.0-0 \
    libgtk-3-0 libxshmfence1 fonts-noto-color-emoji \
    && rm -rf /var/lib/apt/lists/*
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium
ENV PUPPETEER_SKIP_DOWNLOAD=true
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev
COPY . .
EXPOSE 3000
CMD ["node", "src/index.js"]
