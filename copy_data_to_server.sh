#!/bin/bash
# Skript zum Kopieren der exportierten Daten auf den Server
# Passphrase wird interaktiv abgefragt

echo "Kopiere export_data auf den Server..."
scp -i ~/.ssh/intranet_rsa -r backend/export_data root@65.109.228.106:/var/www/intranet/backend/export_data
echo "✅ Daten kopiert!"

