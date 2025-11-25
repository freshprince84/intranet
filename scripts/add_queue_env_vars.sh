#!/bin/bash
# Skript zum Hinzufügen der Queue-Einstellungen zur .env-Datei
# Führt automatisch eine Prüfung durch und fügt nur hinzu, was fehlt

ENV_FILE="/var/www/intranet/backend/.env"

echo "🔍 Prüfe Queue-Einstellungen in .env..."

# Prüfe, ob .env existiert
if [ ! -f "$ENV_FILE" ]; then
    echo "❌ Fehler: .env Datei nicht gefunden: $ENV_FILE"
    exit 1
fi

# Prüfe, ob Queue-Einstellungen bereits vorhanden sind
if grep -q "QUEUE_ENABLED" "$ENV_FILE"; then
    echo "⚠️  QUEUE_ENABLED ist bereits in .env vorhanden"
else
    echo "➕ Füge Queue-Einstellungen hinzu..."
    echo "" >> "$ENV_FILE"
    echo "# Redis Configuration (für Queue-System)" >> "$ENV_FILE"
    echo "REDIS_HOST=localhost" >> "$ENV_FILE"
    echo "REDIS_PORT=6379" >> "$ENV_FILE"
    echo "REDIS_PASSWORD=" >> "$ENV_FILE"
    echo "REDIS_DB=0" >> "$ENV_FILE"
    echo "" >> "$ENV_FILE"
    echo "# Queue Configuration" >> "$ENV_FILE"
    echo "QUEUE_ENABLED=true" >> "$ENV_FILE"
    echo "QUEUE_CONCURRENCY=5" >> "$ENV_FILE"
    echo "✅ Queue-Einstellungen hinzugefügt"
fi

# Prüfe einzelne Variablen und füge fehlende hinzu
if ! grep -q "^REDIS_HOST=" "$ENV_FILE"; then
    echo "➕ Füge REDIS_HOST hinzu..."
    echo "REDIS_HOST=localhost" >> "$ENV_FILE"
fi

if ! grep -q "^REDIS_PORT=" "$ENV_FILE"; then
    echo "➕ Füge REDIS_PORT hinzu..."
    echo "REDIS_PORT=6379" >> "$ENV_FILE"
fi

if ! grep -q "^REDIS_PASSWORD=" "$ENV_FILE"; then
    echo "➕ Füge REDIS_PASSWORD hinzu..."
    echo "REDIS_PASSWORD=" >> "$ENV_FILE"
fi

if ! grep -q "^REDIS_DB=" "$ENV_FILE"; then
    echo "➕ Füge REDIS_DB hinzu..."
    echo "REDIS_DB=0" >> "$ENV_FILE"
fi

if ! grep -q "^QUEUE_ENABLED=" "$ENV_FILE"; then
    echo "➕ Füge QUEUE_ENABLED hinzu..."
    echo "QUEUE_ENABLED=true" >> "$ENV_FILE"
fi

if ! grep -q "^QUEUE_CONCURRENCY=" "$ENV_FILE"; then
    echo "➕ Füge QUEUE_CONCURRENCY hinzu..."
    echo "QUEUE_CONCURRENCY=5" >> "$ENV_FILE"
fi

echo ""
echo "✅ Queue-Einstellungen-Prüfung abgeschlossen"
echo ""
echo "📋 Aktuelle Queue-Einstellungen:"
grep -E "^REDIS_|^QUEUE_" "$ENV_FILE" || echo "⚠️  Keine Queue-Einstellungen gefunden"

