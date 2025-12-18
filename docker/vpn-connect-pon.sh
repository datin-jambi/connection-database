#!/bin/bash

# Ultra-simplified VPN - using pon/poff like Ubuntu

set -e

echo "🔐 Connecting to PPTP VPN using pon..."

if [ -z "$VPN_SERVER" ] || [ -z "$VPN_USERNAME" ] || [ -z "$VPN_PASSWORD" ]; then
    echo "⚠️  VPN credentials not provided. Skipping VPN connection."
    exit 0
fi

# Load PPP module
modprobe ppp_generic 2>/dev/null || true

# Create /dev/ppp if needed
if [ ! -c /dev/ppp ]; then
    mknod /dev/ppp c 108 0 2>/dev/null || true
fi

if [ ! -c /dev/ppp ]; then
    echo "❌ /dev/ppp not available"
    exit 1
fi

mkdir -p /etc/ppp/peers /var/log

# Create secrets
cat > /etc/ppp/chap-secrets << EOF
$VPN_USERNAME * $VPN_PASSWORD *
EOF
chmod 600 /etc/ppp/chap-secrets

# Use pptpsetup to create configuration (Ubuntu way)
echo "📝 Creating VPN configuration..."
pptpsetup --create bpkpd --server $VPN_SERVER --username $VPN_USERNAME --password $VPN_PASSWORD --encrypt

# Modify the peer file to add route
cat >> /etc/ppp/peers/bpkpd << EOF
nodefaultroute
debug
logfile /var/log/ppp.log
EOF

echo "📡 Connecting to VPN..."
pon bpkpd

# Wait for connection
echo "⏳ Waiting for VPN interface..."
for i in {1..60}; do
    if ip link show ppp0 > /dev/null 2>&1; then
        echo "✅ ppp0 interface created!"
        sleep 5
        
        # Check interface
        echo "📡 Interface status:"
        ip addr show ppp0
        
        # Get IP
        PPP_IP=$(ip addr show ppp0 2>/dev/null | grep 'inet ' | awk '{print $2}' | cut -d'/' -f1 || echo "")
        
        if [ -n "$PPP_IP" ]; then
            echo "✅ VPN connected! IP: $PPP_IP"
        else
            echo "⚠️  Interface up but no IP assigned"
        fi
        
        # Add route
        echo "🔀 Adding route to database network..."
        ip route add 192.168.0.0/24 dev ppp0 2>/dev/null || \
        ip route replace 192.168.0.0/24 dev ppp0 2>/dev/null || \
        echo "⚠️  Route already exists"
        
        echo ""
        echo "📡 Routes:"
        ip route
        echo ""
        
        # Test database
        if [ -n "$DB_HOST" ]; then
            echo "🧪 Testing database at $DB_HOST:${DB_PORT:-5432}..."
            if timeout 10 nc -zv $DB_HOST ${DB_PORT:-5432} 2>&1; then
                echo "✅ Database is reachable!"
            else
                echo "⚠️  Database not reachable (may need more time)"
            fi
        fi
        
        echo "✅ VPN setup completed!"
        
        # Monitor connection
        while true; do
            if ! ip link show ppp0 > /dev/null 2>&1; then
                echo "❌ VPN connection lost!"
                tail -30 /var/log/ppp.log
                exit 1
            fi
            sleep 10
        done
    fi
    echo -n "."
    sleep 1
done

echo ""
echo "❌ VPN connection timeout!"
echo "PPP log:"
tail -50 /var/log/ppp.log 2>/dev/null || echo "No logs"
echo ""
echo "Checking processes:"
ps aux | grep ppp
exit 1
