#!/bin/bash

echo "=============================================="
echo "🧪 TESTING - Akses Database TANPA VPN"
echo "=============================================="
echo ""
echo "📍 Scenario:"
echo "   - VPN connection: Di laptop host (ppp0: 100.100.100.12)"
echo "   - Gateway Service: Docker container (port 3000)"
echo "   - Client Test: Script ini (TIDAK menggunakan VPN)"
echo ""
echo "💡 Yang akan dibuktikan:"
echo "   ✅ Script ini TIDAK perlu install VPN client"
echo "   ✅ Script ini TIDAK perlu VPN credentials"
echo "   ✅ Script ini HANYA perlu tahu: http://localhost:3000"
echo "   ✅ Database accessible melalui gateway"
echo ""
echo "=============================================="
echo ""

# Test 1: Service Info
echo "1️⃣  Test: Get Service Info"
echo "   curl http://localhost:3000/"
echo ""
curl -s http://localhost:3000/ 2>&1
echo ""
echo ""

# Test 2: Health Check
echo "2️⃣  Test: Database Health Check"
echo "   curl http://localhost:3000/api/db/health"
echo ""
curl -s http://localhost:3000/api/db/health 2>&1 | head -10
echo ""
echo ""

# Test 3: List Tables
echo "3️⃣  Test: List Database Tables"
echo "   curl http://localhost:3000/api/db/tables"
echo ""
curl -s http://localhost:3000/api/db/tables 2>&1 | head -15
echo ""
echo ""

# Test 4: Query Database
echo "4️⃣  Test: Query Database (SELECT)"
echo "   POST /api/db/query"
echo ""
curl -s -X POST http://localhost:3000/api/db/query \
  -H "Content-Type: application/json" \
  -d '{"query": "SELECT current_database(), current_user, version()"}' 2>&1 | head -10
echo ""
echo ""

echo "=============================================="
echo "✅ HASIL:"
echo "   Jika semua test di atas berhasil, maka:"
echo "   🎯 Service gateway WORKS!"
echo "   🎯 Aplikasi lain TIDAK PERLU VPN!"
echo "   🎯 Cukup panggil API gateway ini!"
echo "=============================================="
