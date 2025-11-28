# Dockerfile para Frontend (Next.js)
FROM node:20-alpine AS base

# Instalar dependencias
FROM base AS deps
WORKDIR /app

COPY package*.json ./
RUN npm install

# Construir la aplicación
FROM base AS builder
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Variable de entorno para la API (se pasa como ARG en tiempo de build)
ARG NEXT_PUBLIC_API_URL=http://localhost:3001
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL

# Construir Next.js
RUN npm run build

# Imagen de producción
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production
# NEXT_PUBLIC_API_URL se pasa desde docker-compose.yml en tiempo de ejecución
# pero Next.js necesita la variable en tiempo de build, así que usamos un valor por defecto
ENV NEXT_PUBLIC_API_URL=http://localhost:3001
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# Copiar archivos necesarios
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public

EXPOSE 3000

# Iniciar Next.js
CMD ["npm", "start"]

