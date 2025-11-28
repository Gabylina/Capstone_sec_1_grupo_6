# Dockerfile para Backend (Node.js/Express/TypeScript)
FROM node:20-alpine AS builder

# Establecer directorio de trabajo
WORKDIR /app

# Copiar archivos de dependencias
COPY package*.json ./
COPY tsconfig.json ./

# Instalar dependencias
RUN npm ci

# Copiar código fuente
COPY . .

# Compilar TypeScript
RUN npm run build

# Imagen de producción
FROM node:20-alpine

WORKDIR /app

# Copiar package.json y node_modules de producción
# Nota: tsconfig-paths debe estar en dependencies para producción
COPY package*.json ./
RUN npm ci --only=production

# Copiar código compilado desde builder
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/database ./database

# Crear directorio para uploads
RUN mkdir -p uploads logs

# Exponer puerto
EXPOSE 3001

# Comando para iniciar el servidor
CMD ["npm", "start"]


