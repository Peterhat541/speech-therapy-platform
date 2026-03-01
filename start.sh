#!/bin/bash
# Script de inicio para TerapiaVoz Platform

set -e

echo "=================================="
echo "  TerapiaVoz - Inicio del Sistema"
echo "=================================="

# Install backend dependencies
echo ""
echo "📦 Instalando dependencias del backend..."
cd backend
if [ ! -d "node_modules" ]; then
  npm install
fi

# Initialize database and seed data
echo ""
echo "🗄️  Inicializando base de datos con datos de prueba..."
mkdir -p data
node src/seed.js 2>/dev/null || true

# Start backend in background
echo ""
echo "🚀 Iniciando servidor backend (puerto 3001)..."
npm start &
BACKEND_PID=$!

# Install frontend dependencies
echo ""
echo "📦 Instalando dependencias del frontend..."
cd ../frontend
if [ ! -d "node_modules" ]; then
  npm install
fi

# Start frontend
echo ""
echo "🌐 Iniciando frontend React (puerto 3000)..."
echo ""
echo "=================================="
echo "  Acceso: http://localhost:3000"
echo "  Email:   admin@terapia.com"
echo "  Pass:    admin123"
echo "=================================="
echo ""

npm start

# Cleanup on exit
trap "kill $BACKEND_PID 2>/dev/null" EXIT
