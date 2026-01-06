#!/bin/bash

# Script de diagnostic pour la connexion frontend-backend (version bash pour Linux/CI)

echo "=== DIAGNOSTIC FRONTEND-BACKEND ==="
echo ""

# Détecter si on est sur Render (déploiement)
if [ -n "$RENDER" ]; then
    IS_CI=true
else
    IS_CI=false
fi

# 1. Vérifier le backend
echo "1. Vérification du backend sur le port 5001..."
if curl -f -s --max-time 3 http://localhost:5001/api/health > /dev/null 2>&1; then
    echo "   ✓ Backend accessible"
    curl -s http://localhost:5001/api/health | head -c 100
    echo ""
else
    echo "   ✗ Backend NON ACCESSIBLE"
    echo ""
    
    if [ "$IS_CI" = true ]; then
        echo "   ⚠ Environnement Render détecté - Backend non requis pour le build"
        echo "   Le backend sera démarré par Render en production"
    else
        echo "   SOLUTION: Démarrer le backend avec:"
        echo "   cd backend"
        echo "   npm run dev"
        exit 1
    fi
fi

echo ""

# 2. Vérifier la configuration du frontend
echo "2. Vérification de la configuration du frontend..."
CONFIG_PATH="frontend-web/src/config.js"
if [ -f "$CONFIG_PATH" ]; then
    if grep -q "localhost:5001" "$CONFIG_PATH"; then
        echo "   ✓ Configuration correcte (port 5001)"
    elif grep -q "localhost:5000" "$CONFIG_PATH"; then
        echo "   ✗ Configuration INCORRECTE (port 5000)"
        echo "   SOLUTION: Modifier frontend-web/src/config.js"
    else
        echo "   ⚠ Configuration non trouvée"
    fi
else
    echo "   ✗ Fichier config.js non trouvé"
fi

echo ""

# 3. Vérifier les processus Node.js
echo "3. Vérification des processus Node.js..."
NODE_COUNT=$(pgrep -c node 2>/dev/null || echo "0")
if [ "$NODE_COUNT" -gt 0 ]; then
    echo "   Processus Node.js trouvés: $NODE_COUNT"
    ps aux | grep node | grep -v grep | head -5 | awk '{print "     PID: " $2 " - Mémoire: " $6/1024 " MB"}'
else
    echo "   Aucun processus Node.js trouvé"
fi

echo ""

# 4. Vérifier les ports
echo "4. Vérification des ports..."
if netstat -tuln 2>/dev/null | grep -q ":5001.*LISTEN" || ss -tuln 2>/dev/null | grep -q ":5001.*LISTEN"; then
    echo "   ✓ Port 5001 (backend) en écoute"
else
    echo "   ✗ Port 5001 (backend) NON en écoute"
fi

if netstat -tuln 2>/dev/null | grep -q ":3001.*LISTEN" || ss -tuln 2>/dev/null | grep -q ":3001.*LISTEN"; then
    echo "   ✓ Port 3001 (frontend) en écoute"
else
    echo "   ✗ Port 3001 (frontend) NON en écoute"
    if [ "$IS_CI" = false ]; then
        echo "   SOLUTION: Démarrer le frontend avec:"
        echo "   cd frontend-web"
        echo "   npm run dev"
    fi
fi

echo ""

# 5. Test de connexion depuis le frontend
echo "5. Test de connexion frontend->backend..."
echo "   Ouvrez la console du navigateur (F12) et vérifiez:"
echo "   - Les requêtes doivent aller vers http://localhost:5001/api/..."
echo "   - Il ne doit pas y avoir d'erreurs CORS"

echo ""
echo "=== SOLUTIONS ==="
echo ""
echo "Si le frontend ne se connecte pas au backend:"
echo ""
echo "1. Redémarrer le frontend (OBLIGATOIRE):"
echo "   - Arrêter avec Ctrl+C"
echo "   - Redémarrer: cd frontend-web && npm run dev"
echo ""
echo "2. Vider le cache du navigateur:"
echo "   - Appuyez sur Ctrl+Shift+R"
echo ""
echo "3. Vérifier la console du navigateur (F12):"
echo "   - Onglet Network: vérifier les URLs des requêtes"
echo "   - Onglet Console: vérifier les erreurs"
echo ""

