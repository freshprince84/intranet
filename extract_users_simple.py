#!/usr/bin/env python3
"""
Einfaches Skript zum Extrahieren der User-Daten aus der Settings-Snapshot-Datei.
"""

import json
import re
from pathlib import Path

# Pfade
BROWSER_LOGS_DIR = Path(r"C:\Users\patri\.cursor\browser-logs")
OUTPUT_DIR = Path("extracted_data")
OUTPUT_DIR.mkdir(exist_ok=True)

def extract_users_from_settings(snapshot_content: str):
    """Extrahiert alle User aus der Settings-Seite."""
    users = []
    seen_usernames = set()
    
    # Pattern 1: User mit Last Day: "Name (username) | Last day: YYYY-MM-DD"
    # Suche nach Zeilen mit diesem genauen Format
    pattern1 = r'name:\s*([^|]+)\s*\(([^)]+)\)\s*\|\s*Last\s+day:\s*(\d{4}-\d{2}-\d{2})'
    matches1 = re.findall(pattern1, snapshot_content, re.IGNORECASE)
    for full_name, username, last_day in matches1:
        full_name = full_name.strip()
        username = username.strip()
        last_day = last_day.strip()
        if username and username not in seen_usernames:
            seen_usernames.add(username)
            users.append({
                "username": username,
                "full_name": full_name,
                "last_day": last_day
            })
    
    # Pattern 2: User ohne Last Day: "Name (username)" - nur in option-Elementen
    # Das sind die Dropdown-Einträge mit dem exakten Format
    pattern2 = r'role:\s*option\s*\n\s*name:\s*([^(]+)\s*\(([^)]+)\)'
    matches2 = re.findall(pattern2, snapshot_content, re.MULTILINE)
    for full_name, username in matches2:
        full_name = full_name.strip()
        username = username.strip()
        # Filtere nur gültige User (nicht "Select User" oder andere UI-Elemente)
        if (username and len(username) > 1 and len(username) < 50 and 
            username not in seen_usernames and 
            username != "Select User" and
            not username.startswith('ref-') and 
            'ref:' not in username and
            'ref:' not in full_name):
            seen_usernames.add(username)
            users.append({
                "username": username,
                "full_name": full_name,
                "last_day": None
            })
    
    return users

# Finde die Settings-Snapshot-Datei
settings_file = BROWSER_LOGS_DIR / "snapshot-2025-11-06T05-47-28-735Z.log"

if settings_file.exists():
    print(f"Verarbeite: {settings_file.name}")
    with open(settings_file, 'r', encoding='utf-8', errors='ignore') as f:
        content = f.read()
    
    users = extract_users_from_settings(content)
    
    # Nach Username sortieren
    users.sort(key=lambda x: x['username'].lower())
    
    # Speichere Ergebnisse
    with open(OUTPUT_DIR / "users.json", 'w', encoding='utf-8') as f:
        json.dump(users, f, indent=2, ensure_ascii=False)
    
    print(f"Extrahierte User: {len(users)}")
    print(f"Daten gespeichert in: {OUTPUT_DIR / 'users.json'}")
    
    # Zeige erste 20 User
    print("\nErste 20 User:")
    for i, user in enumerate(users[:20], 1):
        last_day_str = user['last_day'] if user['last_day'] else "N/A"
        print(f"{i:2d}. {user['full_name']} ({user['username']}) - Last day: {last_day_str}")
    
    if len(users) > 20:
        print(f"\n... und {len(users) - 20} weitere User")
else:
    print(f"Datei nicht gefunden: {settings_file}")
