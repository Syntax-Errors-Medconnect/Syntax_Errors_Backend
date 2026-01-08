# syntax=docker/dockerfile:1

# ---- Base (for reproducible node version) ----
FROM node:20-alpine AS base
WORKDIR /app
ENV NODE_ENV=production

# ---- Deps ----
FROM base AS deps
# Install openssl for npm ci on alpine and tini for signal handling
RUN apk add --no-cache libc6-compat
COPY package*.json ./
RUN npm ci --omit=dev

# ---- Final Runtime ----
FROM node:20-alpine AS runtime
# Add init and wget for healthcheck
RUN apk add --no-cache dumb-init wget
WORKDIR /app
ENV NODE_ENV=production
# Copy node_modules from deps stage
COPY --from=deps /app/node_modules ./node_modules
# Copy source
COPY package*.json ./
COPY src ./src

# Create non-root user for security
RUN addgroup -S nodegrp && adduser -S nodeuser -G nodegrp
USER nodeuser

EXPOSE 5000
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 CMD wget -qO- http://localhost:5000/health || exit 1

CMD ["dumb-init", "node", "src/app.js"]
