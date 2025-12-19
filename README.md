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
VPN_SERVER=
VPN_USERNAME=
VPN_PASSWORD=

# Database
DB_HOST=
DB_PORT=5432
DB_NAME=
DB_USER=
DB_PASSWORD=

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

Service ini **read-only**, hanya untuk mengambil data dari database.

### 1. Health Check
```bash
GET /api/db/health
```

Response:
```json
{
  "success": true,
  "status": "healthy",
  "database": "connected",
  "timestamp": "2025-12-19T10:30:00.000Z"
}
```

### 2. List All Tables (with Pagination)
```bash
GET /api/db/tables?page=1&limit=50
```

Query Parameters:
- `page` (optional): Page number, default `1`
- `limit` (optional): Items per page, default `50`

Response:
```json
{
  "success": true,
  "data": [
    {"table_name": "users", "table_type": "BASE TABLE"},
    {"table_name": "orders", "table_type": "BASE TABLE"}
  ],
  "pagination": {
    "total": 267,
    "page": 1,
    "limit": 50,
    "totalPages": 6,
    "hasNext": true,
    "hasPrev": false
  }
}
```

### 3. Detail Table (Total Data + Field Info)
```bash
GET /api/db/table/:tableName/info
```

Example:
```bash
GET /api/db/table/users/info
```

Response:
```json
{
  "success": true,
  "table": "users",
  "totalRows": 15420,
  "fieldCount": 8,
  "fields": [
    {
      "column_name": "id",
      "data_type": "integer",
      "character_maximum_length": null,
      "is_nullable": "NO",
      "column_default": "nextval('users_id_seq'::regclass)"
    },
    {
      "column_name": "name",
      "data_type": "character varying",
      "character_maximum_length": 255,
      "is_nullable": "YES",
      "column_default": null
    }
  ]
}
```

### 4. Select All Data from Table (with Pagination)
```bash
GET /api/db/table/:tableName/data?page=1&limit=100
```

Query Parameters:
- `page` (optional): Page number, default `1`
- `limit` (optional): Items per page, default `100`

Example:
```bash
GET /api/db/table/users/data?page=2&limit=50
```

Response:
```json
{
  "success": true,
  "table": "users",
  "data": [
    {"id": 51, "name": "John Doe", "email": "john@example.com"},
    {"id": 52, "name": "Jane Doe", "email": "jane@example.com"}
  ],
  "pagination": {
    "total": 15420,
    "page": 2,
    "limit": 50,
    "totalPages": 309,
    "hasNext": true,
    "hasPrev": true
  }
}
```

### 5. Detail Data (Single Row)
```bash
GET /api/db/table/:tableName/row?id=<value>&field=<fieldName>
```

Query Parameters:
- `id` (required): Value to search
- `field` (optional): Field name to search, default `id`

Example:
```bash
# Search by ID (default)
GET /api/db/table/users/row?id=123

# Search by custom field
GET /api/db/table/users/row?id=john@example.com&field=email
```

Response:
```json
{
  "success": true,
  "table": "users",
  "data": {
    "id": 123,
    "name": "John Doe",
    "email": "john@example.com",
    "created_at": "2025-01-15T10:30:00.000Z"
  }
}
```

Error Response (Not Found):
```json
{
  "success": false,
  "error": "Data not found"
}
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

// 1. Health check
const health = await dbGateway.get('/health');
console.log(health.data.status);

// 2. List tables with pagination
const tables = await dbGateway.get('/tables?page=1&limit=50');
console.log(`Total tables: ${tables.data.pagination.total}`);

// 3. Get table info
const tableInfo = await dbGateway.get('/table/users/info');
console.log(`Total rows: ${tableInfo.data.totalRows}`);
console.log(`Fields:`, tableInfo.data.fields);

// 4. Get table data with pagination
const users = await dbGateway.get('/table/users/data?page=1&limit=100');
console.log(`Page ${users.data.pagination.page} of ${users.data.pagination.totalPages}`);
console.log(users.data.data);

// 5. Get single row detail
const user = await dbGateway.get('/table/users/row?id=123');
console.log(user.data.data);

// Search by custom field
const userByEmail = await dbGateway.get('/table/users/row?id=john@example.com&field=email');
console.log(userByEmail.data.data);
```

### Python
```python
import requests

base_url = 'http://gateway-server:3000/api/db'
headers = {'X-API-Key': 'your-api-key'}

# 1. Health check
response = requests.get(f'{base_url}/health', headers=headers)
print(response.json()['status'])

# 2. List tables
response = requests.get(f'{base_url}/tables?page=1&limit=50', headers=headers)
data = response.json()
print(f"Total tables: {data['pagination']['total']}")

# 3. Get table info
response = requests.get(f'{base_url}/table/users/info', headers=headers)
info = response.json()
print(f"Total rows: {info['totalRows']}")
print(f"Fields: {info['fields']}")

# 4. Get table data with pagination
response = requests.get(
    f'{base_url}/table/users/data?page=1&limit=100',
    headers=headers
)
data = response.json()
print(f"Page {data['pagination']['page']} of {data['pagination']['totalPages']}")
for row in data['data']:
    print(row)

# 5. Get single row detail
response = requests.get(
    f'{base_url}/table/users/row?id=123',
    headers=headers
)
user = response.json()['data']
print(user)
```

### cURL Examples
```bash
# 1. Health check
curl http://localhost:3000/api/db/health

# 2. List tables (page 1, 50 items)
curl "http://localhost:3000/api/db/tables?page=1&limit=50" \
  -H "X-API-Key: your-api-key"

# 3. Get table info
curl http://localhost:3000/api/db/table/users/info \
  -H "X-API-Key: your-api-key"

# 4. Get table data (page 2, 100 items)
curl "http://localhost:3000/api/db/table/users/data?page=2&limit=100" \
  -H "X-API-Key: your-api-key"

# 5. Get single row by ID
curl "http://localhost:3000/api/db/table/users/row?id=123" \
  -H "X-API-Key: your-api-key"

# Search by custom field
curl "http://localhost:3000/api/db/table/users/row?id=john@example.com&field=email" \
  -H "X-API-Key: your-api-key"
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

