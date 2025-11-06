#!/usr/bin/env python3
"""
Vollständiges Skript zum Extrahieren aller Daten aus dem alten Intranet-System.
"""

import json
import re
from pathlib import Path
from typing import List, Dict, Any

# Pfade
BROWSER_LOGS_DIR = Path(r"C:\Users\patri\.cursor\browser-logs")
OUTPUT_DIR = Path("extracted_data")
OUTPUT_DIR.mkdir(exist_ok=True)

def extract_users_from_settings(snapshot_content: str) -> List[Dict[str, Any]]:
    """Extrahiert alle User aus der Settings-Seite."""
    users = []
    seen_usernames = set()
    
    # Pattern 1: User mit Last Day: "Name (username) | Last day: YYYY-MM-DD"
    pattern1 = r'name:\s*([^|]+)\s*\(([^)]+)\)\s*\|\s*Last\s+day:\s*(\d{4}-\d{2}-\d{2})'
    matches1 = re.findall(pattern1, snapshot_content, re.IGNORECASE)
    for full_name, username, last_day in matches1:
        full_name = full_name.strip().strip('"').strip()
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
    pattern2 = r'role:\s*option\s*\n\s*name:\s*([^(]+)\s*\(([^)]+)\)'
    matches2 = re.findall(pattern2, snapshot_content, re.MULTILINE)
    for full_name, username in matches2:
        full_name = full_name.strip().strip('"').strip()
        username = username.strip()
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

def extract_branches(snapshot_content: str) -> List[str]:
    """Extrahiert alle Branches (Standorte)."""
    branches = []
    seen = set()
    
    # Bekannte Branches
    branch_names = [
        'Alianza Paisa',
        'Alianza Pai a',  # Fehlerhafte Schreibweise
        'Manila',
        'Nowhere',
        'Parque Poblado'
    ]
    
    for branch in branch_names:
        if branch in snapshot_content and branch not in seen:
            # Normalisiere "Alianza Pai a" zu "Alianza Paisa"
            normalized = 'Alianza Paisa' if branch == 'Alianza Pai a' else branch
            if normalized not in seen:
                seen.add(normalized)
                branches.append(normalized)
    
    return branches

def extract_cerebro_articles(snapshot_content: str) -> List[Dict[str, Any]]:
    """Extrahiert alle Cerebro-Artikel."""
    articles = []
    seen = set()
    
    # Bekannte Cerebro-Artikel - suche direkt nach diesen Namen
    article_names = [
        'Online Check-in',
        'Online Check-out',
        'Emergencie',
        'Emergencies',
        'Recepcion: First day',
        'Recepcion: Fir t day',
        'Keepa',
        'KeePa',
        'Servicio de Desayuno',
        'Servicio de De ayuno'
    ]
    
    # Suche nach jedem Artikel-Namen im Snapshot
    for name in article_names:
        if name in snapshot_content:
            # Normalisiere Namen
            normalized = name
            if 'Emergencie' in normalized:
                normalized = 'Emergencies'
            elif 'Fir t day' in normalized:
                normalized = 'Recepcion: First day'
            elif 'De ayuno' in normalized:
                normalized = 'Servicio de Desayuno'
            elif normalized == 'KeePa':
                normalized = 'Keepa'
            
            if normalized not in seen:
                seen.add(normalized)
                articles.append({"title": normalized})
    
    return articles

def extract_requests(snapshot_content: str) -> List[Dict[str, Any]]:
    """Extrahiert alle Requests aus der Hauptseite."""
    requests = []
    
    # Suche nach Request-Zeilen: role: row mit Request-Daten
    # Format: name: "Request Titel User1 User2 Status Datum ..."
    pattern = r'role:\s*row\s*\n\s*name:\s*"([^"]+)"'
    matches = re.finditer(pattern, snapshot_content, re.MULTILINE)
    
    for match in matches:
        request_text = match.group(1)
        # Zerlege den Request-Text (mehrere Leerzeichen als Trenner)
        parts = [p.strip() for p in request_text.split('  ') if p.strip()]
        
        if len(parts) >= 4:
            request = {
                "title": parts[0] if parts[0] else "",
                "requested_by": parts[1] if len(parts) > 1 else "",
                "responsible": parts[2] if len(parts) > 2 else "",
                "status": parts[3] if len(parts) > 3 else "",
                "date": parts[4] if len(parts) > 4 else "",
                "raw_text": request_text
            }
            requests.append(request)
    
    return requests

def extract_roles(snapshot_content: str) -> List[str]:
    """Extrahiert alle Rollen."""
    roles = []
    # Rollen müssen aus einer speziellen Seite extrahiert werden
    # Hier erstmal eine leere Liste, da wir die Rollen-Seite noch nicht haben
    return roles

def main():
    """Hauptfunktion zum Extrahieren aller Daten."""
    print("Starte Extraktion der Intranet-Daten...")
    
    all_users = []
    all_branches = []
    all_roles = []
    all_requests = []
    all_cerebro_articles = []
    
    # Settings-Datei für User
    settings_file = BROWSER_LOGS_DIR / "snapshot-2025-11-06T05-47-28-735Z.log"
    if settings_file.exists():
        print(f"Verarbeite Settings: {settings_file.name}")
        with open(settings_file, 'r', encoding='utf-8', errors='ignore') as f:
            content = f.read()
        users = extract_users_from_settings(content)
        all_users.extend(users)
        branches = extract_branches(content)
        all_branches.extend(branches)
    
    # Hauptseite für Requests
    main_file = BROWSER_LOGS_DIR / "snapshot-2025-11-06T05-48-43-131Z.log"
    if main_file.exists():
        print(f"Verarbeite Hauptseite: {main_file.name}")
        with open(main_file, 'r', encoding='utf-8', errors='ignore') as f:
            content = f.read()
        requests = extract_requests(content)
        all_requests.extend(requests)
        branches = extract_branches(content)
        all_branches.extend(branches)
    
    # Cerebro-Seite für Artikel - durchsuche alle Dateien
    cerebro_files = list(BROWSER_LOGS_DIR.glob("snapshot-*.log"))
    for cerebro_file in cerebro_files:
        try:
            with open(cerebro_file, 'r', encoding='utf-8', errors='ignore') as f:
                content = f.read()
            # Prüfe ob es eine Cerebro-Seite ist
            if 'Online Check-in' in content or 'Emergencie' in content or 'KeePa' in content:
                print(f"Verarbeite Cerebro-Seite: {cerebro_file.name}")
                articles = extract_cerebro_articles(content)
                all_cerebro_articles.extend(articles)
        except Exception as e:
            pass  # Überspringe Fehler
    
    # Entferne Duplikate
    unique_users = []
    seen_usernames = set()
    for user in all_users:
        if user['username'] not in seen_usernames:
            seen_usernames.add(user['username'])
            unique_users.append(user)
    
    unique_branches = list(set(all_branches))
    unique_roles = list(set(all_roles))
    unique_cerebro = []
    seen_titles = set()
    for article in all_cerebro_articles:
        if article['title'] not in seen_titles:
            seen_titles.add(article['title'])
            unique_cerebro.append(article)
    
    # Sortiere
    unique_users.sort(key=lambda x: x['username'].lower())
    
    # Speichere Ergebnisse
    with open(OUTPUT_DIR / "users.json", 'w', encoding='utf-8') as f:
        json.dump(unique_users, f, indent=2, ensure_ascii=False)
    
    with open(OUTPUT_DIR / "branches.json", 'w', encoding='utf-8') as f:
        json.dump(unique_branches, f, indent=2, ensure_ascii=False)
    
    with open(OUTPUT_DIR / "roles.json", 'w', encoding='utf-8') as f:
        json.dump(unique_roles, f, indent=2, ensure_ascii=False)
    
    with open(OUTPUT_DIR / "requests.json", 'w', encoding='utf-8') as f:
        json.dump(all_requests, f, indent=2, ensure_ascii=False)
    
    with open(OUTPUT_DIR / "cerebro_articles.json", 'w', encoding='utf-8') as f:
        json.dump(unique_cerebro, f, indent=2, ensure_ascii=False)
    
    print(f"\nExtrahierte Daten:")
    print(f"- User: {len(unique_users)}")
    print(f"- Branches: {len(unique_branches)}")
    print(f"- Rollen: {len(unique_roles)}")
    print(f"- Requests: {len(all_requests)}")
    print(f"- Cerebro Artikel: {len(unique_cerebro)}")
    print(f"\nDaten gespeichert in: {OUTPUT_DIR}")
    
    # Zeige Beispiele
    print("\nBeispiele:")
    print(f"\nErste 5 User:")
    for i, user in enumerate(unique_users[:5], 1):
        print(f"  {i}. {user['full_name']} ({user['username']})")
    
    print(f"\nBranches:")
    for branch in unique_branches:
        print(f"  - {branch}")
    
    print(f"\nCerebro Artikel:")
    for article in unique_cerebro:
        print(f"  - {article['title']}")

if __name__ == "__main__":
    main()

