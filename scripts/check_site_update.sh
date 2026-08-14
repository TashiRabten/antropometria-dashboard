#!/bin/bash

echo "🔍 Verificando se o código InBody foi atualizado no site..."
echo ""

# URL do GitHub Pages
SITE_URL="https://tashirabten.github.io/antropometria-dashboard"

# Verificar se o parser InBody existe no labs-parser.js do site
echo "1️⃣ Verificando labs-parser.js no site..."
curl -s "${SITE_URL}/labs-parser.js" | grep -o "function parseInBody" | head -1

if curl -s "${SITE_URL}/labs-parser.js" | grep -q "function parseInBody"; then
    echo "✅ Função parseInBody ENCONTRADA no site!"
else
    echo "❌ Função parseInBody NÃO ENCONTRADA no site!"
fi

echo ""
echo "2️⃣ Verificando identificação de formato InBody..."
curl -s "${SITE_URL}/labs-parser.js" | grep -o "return 'inbody'" | head -1

if curl -s "${SITE_URL}/labs-parser.js" | grep -q "return 'inbody'"; then
    echo "✅ Identificador 'inbody' ENCONTRADO no site!"
else
    echo "❌ Identificador 'inbody' NÃO ENCONTRADO no site!"
fi

echo ""
echo "3️⃣ Última modificação do labs-parser.js local:"
ls -lh labs-parser.js | awk '{print $6, $7, $8, $9}'

echo ""
echo "4️⃣ Status do Git:"
git status labs-parser.js

echo ""
echo "5️⃣ Verificar se há commits pendentes:"
if git diff --name-only | grep -q "labs-parser.js"; then
    echo "⚠️ Há modificações NÃO COMMITADAS no labs-parser.js"
elif git diff --cached --name-only | grep -q "labs-parser.js"; then
    echo "⚠️ Há modificações em STAGE no labs-parser.js"
else
    echo "✅ labs-parser.js está commitado"
fi

echo ""
echo "6️⃣ Último commit do labs-parser.js:"
git log -1 --format="%h - %s (%ar)" -- labs-parser.js

echo ""
echo "7️⃣ Verificar se o commit foi enviado ao GitHub:"
LOCAL_HASH=$(git rev-parse HEAD)
REMOTE_HASH=$(git rev-parse origin/main 2>/dev/null || git rev-parse origin/master 2>/dev/null)

if [ "$LOCAL_HASH" = "$REMOTE_HASH" ]; then
    echo "✅ Branch local está sincronizada com o remoto"
else
    echo "⚠️ Branch local DIFERENTE do remoto - faça git push!"
fi

echo ""
echo "📌 URL do site: ${SITE_URL}/labs.html"
