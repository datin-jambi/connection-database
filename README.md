# PostgreSQL Database Gateway

API Gateway service untuk mengakses PostgreSQL database melalui VPN tanpa perlu setup VPN di aplikasi client.

## 📝 Deskripsi

Service ini bertindak sebagai **gateway/proxy** antara aplikasi Anda dan database PostgreSQL yang berada di dalam jaringan VPN.

**Keuntungan:**
- ✅ Aplikasi client **TIDAK PERLU** install VPN
- ✅ Aplikasi client **TIDAK PERLU** VPN credentials  
- ✅ Cukup panggil REST API
- ✅ Centralized database access
- ✅ Security dengan CORS whitelist dan API keys

**Arsitektur:**
```
┌─────────────┐                                    ┌──────────┐
│  Chatbot    │ ──┐                            ┌──→│ Database │
└─────────────┘   │                            │   │PostgreSQL│
                  │   ┌──────────────────┐     │   └──────────┘
┌─────────────┐   ├──→│  Gateway Service │─VPN─┤   
│   App 2     │ ──┤   │  (This Service)  │     │   Via VPN
└─────────────┘   │   └──────────────────┘     │   192.168.0.3
                  │                            │   
┌─────────────┐   │                            └──→ Database
│   App 3     │ ──┘                                 Accessible
└─────────────┘
  NO VPN NEEDED        Handles VPN
```

## 🚀 Quick Start

### Prasyarat

- Docker & Docker Compose
- PPTP VPN credentials
- Node.js 20+ (untuk development)

### 1. Clone & Setup

```bash
git clone <repo-url> postgres-gateway
cd postgres-gateway

# Copy environment file
cp .env.example .env
```

### 2. Konfigurasi

Edit `.env`:

```env
# Server
PORT=3000
NODE_ENV=production

# VPN Configuration
VPN_SERVER=36.37.124.84
VPN_USERNAME=adminbakeuda12
VPN_PASSWORD=P4ssword12

# Database
DB_HOST=192.168.0.3
DB_PORT=5432
DB_NAME=pgsamsatoldb
DB_USER=viewer
DB_PASSWORD=\433Ra+L:h=1

# Security
ALLOWED_ORIGINS=http://localhost:3001,https://chatbot.example.com
API_KEYS=your-secret-key-1,your-secret-key-2

# Rate Limiting
RATE_LIMIT_WINDOW=15
RATE_LIMIT_MAX_REQUESTS=100
```

### 3. Setup VPN di Host

Karena VPN server belum support Docker, setup VPN di host:

```bash
# Install PPTP client
sudo apt install pptp-linux

# Create VPN configuration
sudo pptpsetup --create myvpn \
  --server 36.37.124.84 \
  --username adminbakeuda12 \
  --password P4ssword12 \
  --encrypt

# Connect VPN
sudo pon myvpn

# Verify connection
ip addr show ppp0

# Add route to database network
sudo ip route add 192.168.0.0/24 dev ppp0
```

### 4. Run Service

**Development Mode:**
```bash
npm install
npm run dev
```

**Production Mode:**
```bash
# Using Docker
docker compose up -d

# Check logs
docker logs postgres-gateway -f

# Test
curl http://localhost:3000/api/db/health
```

## 📡 API Endpoints

### Health Check
```bash
GET /api/db/health
```

Response:
```json
{
  "success": true,
  "status": "healthy",
  "database": "connected"
}
```

### List Tables
```bash
GET /api/db/tables
```

Response:
```json
{
  "success": true,
  "tables": [
    {"table_name": "users", "table_type": "BASE TABLE"}
  ],
  "count": 267
}
```

### Query Database (SELECT)
```bash
POST /api/db/query
Content-Type: application/json

{
  "query": "SELECT * FROM users WHERE id = $1",
  "params": [1]
}
```

Response:
```json
{
  "success": true,
  "data": [
    {"id": 1, "name": "John Doe"}
  ],
  "rowCount": 1
}
```

### Execute Query (INSERT/UPDATE/DELETE)
```bash
POST /api/db/execute
Content-Type: application/json

{
  "query": "UPDATE users SET name = $1 WHERE id = $2",
  "params": ["Jane Doe", 1]
}
```

### Get Table Data
```bash
GET /api/db/table/:tableName?limit=10&offset=0
```

### Get Table Schema
```bash
GET /api/db/schema/:tableName
```

## 💻 Development

### Project Structure
```
postgres-gateway/
├── src/
│   ├── server.ts              # Main app
│   ├── config/
│   │   ├── database.ts        # PostgreSQL connection
│   │   └── env.ts             # Environment config
│   ├── middleware/
│   │   ├── auth.ts            # CORS & API keys
│   │   └── errorHandler.ts
│   ├── routes/
│   │   └── database.ts        # API routes
│   └── utils/
│       └── logger.ts          # Winston logger
├── docker/
│   ├── vpn-connect-pon.sh     # VPN connection script
│   ├── start.sh               # Production startup
│   └── start-dev.sh           # Development startup
├── Dockerfile                 # Production image
├── docker-compose.yml         # Production compose
└── .env                       # Configuration
```

### Development Commands

```bash
# Install dependencies
npm install

# Run in development mode (with hot reload)
npm run dev

# Build TypeScript
npm run build

# Run production build
npm start
```

### Docker Commands

```bash
# Development mode (hot reload)
docker compose -f docker-compose.dev.yml up

# Production mode
docker compose up -d

# View logs
docker logs postgres-gateway -f

# Rebuild
docker compose build --no-cache

# Stop
docker compose down
```

## 🔒 Security

### API Keys

Enable API key authentication di `.env`:
```env
API_KEYS=key1,key2,key3
```

Request dengan API key:
```bash
curl http://localhost:3000/api/db/health \
  -H "X-API-Key: key1"
```

### CORS Whitelist

Batasi akses dari origin tertentu:
```env
ALLOWED_ORIGINS=http://app1.com,http://app2.com
```

### Rate Limiting

Default: 100 requests per 15 minutes per IP
```env
RATE_LIMIT_WINDOW=15          # minutes
RATE_LIMIT_MAX_REQUESTS=100   # max requests
```

## 📱 Client Integration

### JavaScript/Node.js
```javascript
const axios = require('axios');

const dbGateway = axios.create({
  baseURL: 'http://gateway-server:3000/api/db',
  headers: { 'X-API-Key': 'your-api-key' }
});

// Query
const users = await dbGateway.post('/query', {
  query: 'SELECT * FROM users LIMIT 10'
});

console.log(users.data.data);
```

### Python
```python
import requests

base_url = 'http://gateway-server:3000/api/db'
headers = {'X-API-Key': 'your-api-key'}

response = requests.post(
    f'{base_url}/query',
    json={'query': 'SELECT * FROM users LIMIT 10'},
    headers=headers
)

data = response.json()['data']
```

### cURL
```bash
curl -X POST http://gateway-server:3000/api/db/query \
  -H "Content-Type: application/json" \
  -H "X-API-Key: your-api-key" \
  -d '{"query": "SELECT * FROM users LIMIT 10"}'
```

## 🔄 Production Deployment

### 1. Setup VPN di Server
```bash
# Install PPTP
sudo apt install pptp-linux

# Setup VPN
sudo pptpsetup --create prodvpn \
  --server 36.37.124.84 \
  --username adminbakeuda12 \
  --password P4ssword12 \
  --encrypt

# Connect
sudo pon prodvpn

# Verify
ip addr show ppp0
sudo ip route add 192.168.0.0/24 dev ppp0
```

### 2. Deploy Service
```bash
# Clone repo
git clone <repo-url> /opt/postgres-gateway
cd /opt/postgres-gateway

# Configure
cp .env.example .env
nano .env  # Edit credentials

# Build & run
docker compose up -d

# Check
docker logs postgres-gateway
curl http://localhost:3000/api/db/health
```

### 3. Auto-Start VPN (Optional)

Create `/etc/systemd/system/pptp-vpn.service`:
```ini
[Unit]
Description=PPTP VPN Connection
After=network.target

[Service]
Type=simple
ExecStart=/usr/bin/pon prodvpn
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
```

Enable:
```bash
sudo systemctl enable pptp-vpn
sudo systemctl start pptp-vpn
```

## 🧪 Testing

Test client tanpa VPN:
```bash
./test-client-no-vpn.sh
```

Example clients:
```bash
node example-client.js
python3 example-client.py
```

## 📊 Monitoring

```bash
# Container logs
docker logs postgres-gateway -f

# Application logs
tail -f logs/combined.log
tail -f logs/error.log

# Health check
curl http://localhost:3000/api/db/health
```

## ⚙️ Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | Server port | `3000` |
| `NODE_ENV` | Environment | `development` |
| `VPN_SERVER` | VPN server address | - |
| `VPN_USERNAME` | VPN username | - |
| `VPN_PASSWORD` | VPN password | - |
| `DB_HOST` | Database host | - |
| `DB_PORT` | Database port | `5432` |
| `DB_NAME` | Database name | - |
| `DB_USER` | Database user | - |
| `DB_PASSWORD` | Database password | - |
| `ALLOWED_ORIGINS` | CORS whitelist | - |
| `API_KEYS` | API keys | - |
| `RATE_LIMIT_WINDOW` | Rate limit window (min) | `15` |
| `RATE_LIMIT_MAX_REQUESTS` | Max requests | `100` |

## 🐛 Troubleshooting

### VPN tidak connect
```bash
# Reconnect
sudo poff myvpn && sudo pon myvpn

# Check
ip addr show ppp0
ip route | grep 192.168.0.0
```

### Database tidak accessible
```bash
# Test connectivity
nc -zv 192.168.0.3 5432

# Add route
sudo ip route add 192.168.0.0/24 dev ppp0
```

### Port already in use
```bash
# Find process
sudo lsof -i :3000

# Kill
sudo kill -9 <PID>
```

