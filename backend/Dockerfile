FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production && npm cache clean --force
COPY . .

FROM node:20-alpine
RUN apk add --no-cache curl dumb-init
WORKDIR /app
COPY --from=builder /app /app
RUN mkdir -p uploads/lab-reports logs && \
    addgroup -g 1001 -S nodejs && \
    adduser -S hospital -u 1001 && \
    chown -R hospital:nodejs /app
USER hospital
EXPOSE 5000
HEALTHCHECK --interval=30s --timeout=10s --start-period=10s --retries=3 \
    CMD curl -f http://localhost:5000/api/health || exit 1
ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "src/server.js"]
