#!/bin/sh

# Startup script: Connect VPN then start Node.js application

set -e

echo "🚀 Starting PostgreSQL Gateway Service..."

# Connect to VPN if credentials are provided
if [ -n "$VPN_SERVER" ]; then
    /usr/local/bin/vpn-connect.sh
else
    echo "⚠️  No VPN configuration found. Running without VPN..."
fi

# Start Node.js application
echo "🌐 Starting Node.js server..."
exec node dist/server.js
