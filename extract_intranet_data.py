#!/usr/bin/env python3
"""
Skript zum Extrahieren aller Daten aus dem alten Intranet-System
für den Import in das neue System.
"""

import json
import re
import os
from pathlib import Path
from typing import Dict, List, Any, Set

# Pfade
BROWSER_LOGS_DIR = Path(r"C:\Users\patri\.cursor\browser-logs")
OUTPUT_DIR = Path("extracted_data")

def extract_requests_from_snapshot(snapshot_content: str) -> List[Dict[str, Any]]:
    """Extrahiert alle Requests aus einem Snapshot."""
    requests = []
    
    # Suche nach Request-Zeilen im Snapshot
    # Pattern: role: row mit Request-Daten
    lines = snapshot_content.split('\n')
    
    # Finde alle Request-Zeilen die wie folgt aussehen:
    # name: "Request Titel User1 User2 Status Datum ..."
    pattern = r'name:\s*"([^"]+)"'
    
    for i, line in enumerate(lines):
        if 'role: row' in line and 'name:' in line:
            # Versuche Request-Daten zu extrahieren
            match = re.search(pattern, line)
            if match:
                request_text = match.group(1)
                # Zerlege den Request-Text
                parts = request_text.split('  ')
                if len(parts) >= 4:
                    # Typisches Format: "Titel User1 User2 Status Datum"
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

def extract_users_from_snapshot(snapshot_content: str) -> List[Dict[str, Any]]:
    """Extrahiert alle User aus einem Snapshot."""
    users = []
    seen_users: Set[str] = set()
    
    # Verwende findall statt finditer für bessere Performance bei großen Dateien
    # Pattern 1: User mit vollständigem Namen: "Name (username)"
    pattern1 = r'name:\s*([^(]+)\s*\(([^)]+)\)'
    matches1 = re.findall(pattern1, snapshot_content)
    for full_name, username in matches1:
        full_name = full_name.strip()
        username = username.strip()
        if username and username not in seen_users:
            seen_users.add(username)
            users.append({
                "username": username,
                "full_name": full_name,
                "last_day": None
            })
    
    # Pattern 2: User mit Last Day: "Name (username) | Last day: YYYY-MM-DD"
    pattern2 = r'name:\s*([^|]+)\s*\(([^)]+)\)\s*\|\s*Last\s+day:\s*(\d{4}-\d{2}-\d{2})'
    matches2 = re.findall(pattern2, snapshot_content, re.IGNORECASE)
    for full_name, username, last_day in matches2:
        full_name = full_name.strip()
        username = username.strip()
        last_day = last_day.strip()
        if username and username not in seen_users:
            seen_users.add(username)
            users.append({
                "username": username,
                "full_name": full_name,
                "last_day": last_day
            })
    
    # Pattern 3: Einfache Usernamen in option-Elementen (nur wenn Datei klein genug)
    if len(snapshot_content) < 500000:  # Nur bei kleineren Dateien
        pattern3 = r'role:\s*option\s*\n\s*name:\s*([A-Za-z0-9_][A-Za-z0-9_\s]*[A-Za-z0-9_])'
        invalid_names = {
            'Select', 'Choose', 'Select User', 'Public', 'Private', 'Approval', 'Approved',
            'Branch', 'Role', 'Setting', 'Logout', 'Dashboard', 'Worktracker',
            'Who\'s working?', 'Work Report', 'Cerebro', 'Toggle navigation',
            'Logo', 'Save', 'Edit request', 'Request Description', 'Request:',
            'Description:', 'Requested by:', 'Responsible:', 'Due Date:',
            'Create To Do:', 'on', 'off', 'Alianza Paisa', 'Alianza Pai a',
            'Manila', 'Nowhere', 'Parque Poblado'
        }
        
        matches3 = re.findall(pattern3, snapshot_content, re.MULTILINE)
        for username in matches3:
            username = username.strip()
            if username and len(username) > 1 and username not in invalid_names:
                if username not in seen_users:
                    seen_users.add(username)
                    users.append({
                        "username": username,
                        "full_name": None,
                        "last_day": None
                    })
    
    return users

def extract_branches_from_snapshot(snapshot_content: str) -> List[str]:
    """Extrahiert alle Branches (Standorte) aus einem Snapshot."""
    branches = []
    seen_branches: Set[str] = set()
    
    # Bekannte Branches
    known_branches = [
        'Alianza Paisa',
        'Alianza Pai a',  # Fehlerhafte Schreibweise von "Alianza Paisa"
        'Manila',
        'Nowhere',
        'Parque Poblado'
    ]
    
    for branch in known_branches:
        if branch in snapshot_content:
            # Normalisiere "Alianza Pai a" zu "Alianza Paisa"
            normalized = 'Alianza Paisa' if branch == 'Alianza Pai a' else branch
            if normalized not in seen_branches:
                seen_branches.add(normalized)
                branches.append(normalized)
    
    return branches

def extract_roles_from_snapshot(snapshot_content: str) -> List[str]:
    """Extrahiert alle Rollen aus einem Snapshot."""
    roles = []
    # Rollen müssen aus den Dropdowns oder einer speziellen Seite extrahiert werden
    # Typische Rollen könnten sein: Admin, Manager, Staff, etc.
    # Suche nach Role-Optionen
    
    # Bekannte Rollen-Patterns (müssen angepasst werden basierend auf den tatsächlichen Daten)
    role_patterns = [
        r'role:\s*option\s*\n\s*name:\s*(Admin|Manager|Staff|Employee|Supervisor)',
    ]
    
    for pattern in role_patterns:
        matches = re.finditer(pattern, snapshot_content, re.MULTILINE | re.IGNORECASE)
        for match in matches:
            role = match.group(1)
            if role and role not in roles:
                roles.append(role)
    
    return roles

def extract_cerebro_articles_from_snapshot(snapshot_content: str) -> List[Dict[str, Any]]:
    """Extrahiert alle Cerebro-Artikel aus einem Snapshot."""
    articles = []
    
    # Suche nach Navigations-Elementen mit Artikel-Namen
    # Pattern: name: [Artikel-Name]
    article_patterns = [
        r'name:\s*(Online Check-in)',
        r'name:\s*(Online Check-out)',
        r'name:\s*(Emergencie[s]?)',
        r'name:\s*(Recepcion:?\s*First\s+day)',
        r'name:\s*(KeePa|Keepa)',
        r'name:\s*(Servicio\s+de\s+Desayuno)',
    ]
    
    seen_titles: Set[str] = set()
    
    for pattern in article_patterns:
        matches = re.finditer(pattern, snapshot_content, re.IGNORECASE)
        for match in matches:
            title = match.group(1).strip()
            if title and title not in seen_titles:
                seen_titles.add(title)
                articles.append({"title": title})
    
    return articles

def main():
    """Hauptfunktion zum Extrahieren aller Daten."""
    print("Starte Extraktion der Intranet-Daten...")
    
    OUTPUT_DIR.mkdir(exist_ok=True)
    
    all_users = []
    all_branches = []
    all_roles = []
    all_requests = []
    all_cerebro_articles = []
    
    # Finde alle Snapshot-Dateien
    snapshot_files = list(BROWSER_LOGS_DIR.glob("snapshot-*.log"))
    print(f"Gefundene Snapshot-Dateien: {len(snapshot_files)}")
    
    # Sortiere nach Dateigröße, verarbeite kleinere zuerst
    snapshot_files_sorted = sorted(snapshot_files, key=lambda p: p.stat().st_size)
    
    for snapshot_file in snapshot_files_sorted:
        file_size = snapshot_file.stat().st_size
        print(f"Verarbeite: {snapshot_file.name} ({file_size / 1024:.1f} KB)")
        
        # Überspringe sehr große Dateien zunächst (nur bei Bedarf)
        if file_size > 1000000:  # > 1MB
            print(f"  Überspringe sehr große Datei vorerst...")
            continue
            
        try:
            with open(snapshot_file, 'r', encoding='utf-8', errors='ignore') as f:
                content = f.read()
            
            # Extrahiere Daten
            users = extract_users_from_snapshot(content)
            all_users.extend(users)
            print(f"  Gefunden: {len(users)} User")
            
            branches = extract_branches_from_snapshot(content)
            all_branches.extend(branches)
            
            roles = extract_roles_from_snapshot(content)
            all_roles.extend(roles)
            
            requests = extract_requests_from_snapshot(content)
            all_requests.extend(requests)
            print(f"  Gefunden: {len(requests)} Requests")
            
            cerebro = extract_cerebro_articles_from_snapshot(content)
            all_cerebro_articles.extend(cerebro)
            
        except Exception as e:
            print(f"Fehler beim Verarbeiten von {snapshot_file.name}: {e}")
            import traceback
            traceback.print_exc()
    
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

if __name__ == "__main__":
    main()

