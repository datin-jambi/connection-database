#!/usr/bin/env python3

"""
Example Client - Aplikasi Chatbot atau Server Lain (Python)

Script ini mendemonstrasikan bagaimana aplikasi Python
mengakses database TANPA PERLU VPN.

Aplikasi ini:
- ❌ TIDAK install VPN
- ❌ TIDAK connect ke VPN  
- ✅ Cukup panggil API Gateway
- ✅ Langsung dapat data dari database
"""

import os
import sys
import requests
from typing import Dict, List, Any

# Gateway Service URL
GATEWAY_URL = os.getenv('GATEWAY_URL', 'http://localhost:3000')
API_KEY = os.getenv('API_KEY', '')

# Create session
session = requests.Session()
session.headers.update({
    'Content-Type': 'application/json'
})
if API_KEY:
    session.headers.update({'X-API-Key': API_KEY})

BASE_URL = f"{GATEWAY_URL}/api/db"

print('🤖 Example Client - Aplikasi Chatbot (Python)\n')
print(f'📍 Gateway URL: {GATEWAY_URL}')
print('❌ VPN: TIDAK DIPERLUKAN!\n')
print('=' * 60)

def health_check() -> Dict:
    """Check gateway health"""
    response = session.get(f'{BASE_URL}/health', timeout=10)
    response.raise_for_status()
    return response.json()

def list_tables() -> List[Dict]:
    """List all tables"""
    response = session.get(f'{BASE_URL}/tables', timeout=10)
    response.raise_for_status()
    return response.json()['data']

def query_database(sql: str, params: List[Any] = None) -> List[Dict]:
    """Execute SELECT query"""
    response = session.post(
        f'{BASE_URL}/query',
        json={'query': sql, 'params': params or []},
        timeout=10
    )
    response.raise_for_status()
    return response.json()['data']

def get_schema(table_name: str) -> List[Dict]:
    """Get table schema"""
    response = session.get(f'{BASE_URL}/schema/{table_name}', timeout=10)
    response.raise_for_status()
    return response.json()['data']

def main():
    try:
        # 1. Health Check
        print('\n1️⃣  Health Check...')
        health = health_check()
        print(f'   ✅ Status: {health["status"]}')
        print(f'   ✅ Database: {health["database"]}')

        # 2. List Tables
        print('\n2️⃣  List All Tables...')
        tables = list_tables()
        print(f'   ✅ Found {len(tables)} tables')
        table_names = [t['table_name'] for t in tables]
        print(f'   📋 {", ".join(table_names[:10])}...')

        # 3. Query Database
        print('\n3️⃣  Query Database (SELECT)...')
        results = query_database(
            'SELECT table_name, table_type FROM information_schema.tables WHERE table_schema = $1 LIMIT 5',
            ['public']
        )
        print(f'   ✅ Query successful!')
        print(f'   📊 Rows: {len(results)}')
        for row in results:
            print(f'   - {row}')

        # 4. Get Table Schema
        if tables:
            table_name = tables[0]['table_name']
            print(f'\n4️⃣  Get Schema for table: {table_name}')
            schema = get_schema(table_name)
            print(f'   ✅ {len(schema)} columns')
            for col in schema:
                print(f'   - {col["column_name"]}: {col["data_type"]}')

        print('\n' + '=' * 60)
        print('✅ SUCCESS! Semua request berhasil!')
        print('\n💡 Catatan:')
        print('   - Aplikasi ini TIDAK menggunakan VPN')
        print('   - Aplikasi ini TIDAK connect langsung ke database')
        print('   - Aplikasi ini HANYA panggil API Gateway')
        print('   - Gateway yang handle VPN & database connection')
        print('\n🎯 Ini adalah konsep yang Anda inginkan!')
        print('=' * 60 + '\n')

    except requests.exceptions.ConnectionError:
        print('\n❌ Error: Tidak bisa connect ke gateway!')
        print('⚠️  Gateway service tidak berjalan!')
        print('   Jalankan: docker compose -f docker-compose.host.yml up -d')
        sys.exit(1)
    except requests.exceptions.HTTPError as e:
        print(f'\n❌ HTTP Error: {e}')
        print(f'   Status: {e.response.status_code}')
        print(f'   Response: {e.response.text}')
        sys.exit(1)
    except Exception as e:
        print(f'\n❌ Error: {e}')
        sys.exit(1)

if __name__ == '__main__':
    main()
