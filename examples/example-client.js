#!/usr/bin/env node

/**
 * Example Client - Aplikasi Chatbot atau Server Lain
 * 
 * Script ini mendemonstrasikan bagaimana aplikasi lain
 * mengakses database TANPA PERLU VPN.
 * 
 * Aplikasi ini:
 * - ❌ TIDAK install VPN
 * - ❌ TIDAK connect ke VPN
 * - ✅ Cukup panggil API Gateway
 * - ✅ Langsung dapat data dari database
 */

const axios = require('axios');

// Gateway Service URL (ganti dengan IP server gateway Anda)
const GATEWAY_URL = process.env.GATEWAY_URL || 'http://localhost:3000';
const API_KEY = process.env.API_KEY || ''; // Optional

// Create axios instance
const gateway = axios.create({
  baseURL: `${GATEWAY_URL}/api/db`,
  headers: API_KEY ? { 'X-API-Key': API_KEY } : {},
  timeout: 10000
});

console.log('🤖 Example Client - Aplikasi Chatbot\n');
console.log('📍 Gateway URL:', GATEWAY_URL);
console.log('❌ VPN: TIDAK DIPERLUKAN!\n');
console.log('='.repeat(60));

async function main() {
  try {
    // 1. Health Check
    console.log('\n1️⃣  Health Check...');
    const health = await gateway.get('/health');
    console.log('   ✅', JSON.stringify(health.data, null, 2));

    // 2. List Tables
    console.log('\n2️⃣  List All Tables...');
    const tables = await gateway.get('/tables');
    console.log('   ✅ Found', tables.data.data.length, 'tables');
    console.log('   📋', tables.data.data.map(t => t.table_name).join(', '));

    // 3. Query Database
    console.log('\n3️⃣  Query Database (SELECT)...');
    const query = await gateway.post('/query', {
      query: 'SELECT * FROM information_schema.tables WHERE table_schema = $1 LIMIT 5',
      params: ['public']
    });
    console.log('   ✅ Query successful!');
    console.log('   📊 Rows:', query.data.data.length);

    // 4. Get Table Schema
    if (tables.data.data.length > 0) {
      const tableName = tables.data.data[0].table_name;
      console.log(`\n4️⃣  Get Schema for table: ${tableName}`);
      const schema = await gateway.get(`/schema/${tableName}`);
      console.log('   ✅', schema.data.data.length, 'columns');
      schema.data.data.forEach(col => {
        console.log(`   - ${col.column_name}: ${col.data_type}`);
      });
    }

    console.log('\n' + '='.repeat(60));
    console.log('✅ SUCCESS! Semua request berhasil!');
    console.log('\n💡 Catatan:');
    console.log('   - Aplikasi ini TIDAK menggunakan VPN');
    console.log('   - Aplikasi ini TIDAK connect langsung ke database');
    console.log('   - Aplikasi ini HANYA panggil API Gateway');
    console.log('   - Gateway yang handle VPN & database connection');
    console.log('\n🎯 Ini adalah konsep yang Anda inginkan!');
    console.log('='.repeat(60) + '\n');

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    
    if (error.code === 'ECONNREFUSED') {
      console.error('\n⚠️  Gateway service tidak berjalan!');
      console.error('   Jalankan: docker compose -f docker-compose.host.yml up -d');
    } else if (error.response) {
      console.error('   Status:', error.response.status);
      console.error('   Data:', error.response.data);
    }
    
    process.exit(1);
  }
}

// Run
main();
