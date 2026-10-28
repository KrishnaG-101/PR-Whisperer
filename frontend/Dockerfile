# Stage 1: Build the production bundle
FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .

# Set default API URL for build-time embedding
ARG VITE_API_URL=http://localhost:8000
ENV VITE_API_URL=$VITE_API_URL

RUN npm run build

# Stage 2: Production preview server
FROM node:20-alpine AS runner

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY --from=builder /app/dist ./dist
COPY vite.config.js ./
COPY postcss.config.js ./
COPY tailwind.config.js ./

EXPOSE 5173

# Expose preview server on 0.0.0.0:5173 for Docker networking
CMD ["npm", "run", "preview", "--", "--host", "0.0.0.0", "--port", "5173"]
