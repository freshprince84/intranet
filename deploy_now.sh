#!/bin/bash
# Deployment-Script das MCP-Konfiguration verwendet
# Die Konfiguration kommt aus mcp.json (Cursor verwaltet das)

echo "🚀 Starte Deployment über MCP-System..."
echo "Die Konfiguration wird aus mcp.json geladen (Cursor verwaltet das automatisch)"

# Das MCP-System sollte die Konfiguration bereitstellen
# Falls nicht, verwende Standard-Werte
cd /workspace/mcp-servers/deployment

# Versuche das MCP Tool direkt aufzurufen
node deploy_direct.js
