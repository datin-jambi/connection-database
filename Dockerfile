# Stage 1: Build TypeScript
FROM node:20-slim AS builder

WORKDIR /app

# Copy package files
COPY package*.json tsconfig.json ./

# Install dependencies
RUN npm ci

# Copy source code
COPY src ./src

# Build TypeScript
RUN npm run build

# Stage 2: Production image with PPTP VPN
FROM node:20-slim

# Install PPTP Client for VPN + netcat for testing
RUN apt-get update && apt-get install -y \
    pptp-linux \
    ppp \
    iptables \
    iproute2 \
    netcat-openbsd \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy package files and install production dependencies only
COPY package*.json ./
RUN npm ci --only=production

# Copy built application from builder
COPY --from=builder /app/dist ./dist

# Create logs directory
RUN mkdir -p logs

# Copy VPN connection scripts (using pptpsetup/pon method)
COPY docker/vpn-connect-pon.sh /usr/local/bin/vpn-connect.sh
RUN chmod +x /usr/local/bin/vpn-connect.sh

# Copy startup script
COPY docker/start.sh /usr/local/bin/start.sh
RUN chmod +x /usr/local/bin/start.sh

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/api/db/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Start script will connect VPN then start app
CMD ["/usr/local/bin/start.sh"]
