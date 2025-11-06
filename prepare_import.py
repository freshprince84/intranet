#!/usr/bin/env python3
"""
Import-Skript für die alte Intranet-Datenbank in die neue Prisma-Datenbank.
Transformiert die Daten aus dem JSON-Export und importiert sie über Prisma.
"""

import json
import re
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Any, Optional

# Pfade
JSON_FILE = Path("lafamili_sopl771.json")
OUTPUT_DIR = Path("import_data")
OUTPUT_DIR.mkdir(exist_ok=True)

def fix_encoding(text: str) -> str:
    """
    Repariert falsch kodierte UTF-8 Zeichen.
    
    Problem: UTF-8 Bytes wurden als Latin-1 interpretiert und dann als UTF-8 gespeichert.
    Lösung: Konvertiere zurück: UTF-8 String -> Latin-1 Bytes -> UTF-8 String
    
    Beispiel: 'TÃ©' -> 'Té', 'JosÃ©' -> 'José'
    
    Die Funktion versucht, den gesamten String zu konvertieren. Falls das fehlschlägt,
    wird versucht, den String in Teile zu zerlegen und nur die problematischen Teile zu korrigieren.
    """
    if not isinstance(text, str):
        return text
    
    # Versuche zuerst, den gesamten String zu konvertieren
    try:
        return text.encode('latin-1').decode('utf-8')
    except (UnicodeEncodeError, UnicodeDecodeError):
        # Falls die Konvertierung fehlschlägt, versuche eine teilweise Korrektur
        # Dies kann bei gemischten Strings (z.B. mit bereits korrekten Emojis) nötig sein
        try:
            # Versuche, den String Zeichen für Zeichen zu korrigieren
            result = []
            i = 0
            while i < len(text):
                # Versuche, ab Position i einen Teilstring zu korrigieren
                found_match = False
                for j in range(i + 1, min(i + 10, len(text) + 1)):
                    try:
                        substring = text[i:j]
                        corrected = substring.encode('latin-1').decode('utf-8')
                        result.append(corrected)
                        i = j
                        found_match = True
                        break
                    except (UnicodeEncodeError, UnicodeDecodeError):
                        continue
                
                if not found_match:
                    # Wenn keine Korrektur möglich ist, füge das Zeichen unverändert hinzu
                    result.append(text[i])
                    i += 1
            
            return ''.join(result)
        except:
            # Falls alles fehlschlägt, gebe den originalen Text zurück
            return text

def fix_encoding_recursive(obj: Any) -> Any:
    """
    Repariert falsch kodierte UTF-8 Zeichen rekursiv in allen Strings eines Objekts.
    """
    if isinstance(obj, str):
        return fix_encoding(obj)
    elif isinstance(obj, dict):
        return {key: fix_encoding_recursive(value) for key, value in obj.items()}
    elif isinstance(obj, list):
        return [fix_encoding_recursive(item) for item in obj]
    else:
        return obj

def parse_json_export(file_path: Path) -> Dict[str, List[Dict]]:
    """Parst den phpMyAdmin JSON Export in ein Dictionary mit Tabellennamen als Keys."""
    tables = {}
    
    with open(file_path, 'r', encoding='utf-8') as f:
        data = json.load(f)
    
    # Die Datei ist ein Array von Objekten
    # Jedes Objekt mit type="table" enthält eine Tabelle
    for item in data:
        if item.get('type') == 'table':
            table_name = item.get('name')
            table_data = item.get('data', [])
            if table_name:
                # Repariere falsch kodierte Zeichen in den Tabellendaten
                fixed_data = fix_encoding_recursive(table_data)
                tables[table_name] = fixed_data
                print(f"Gefunden: {table_name} - {len(fixed_data)} Einträge")
    
    return tables

def transform_users(old_users: List[Dict], old_branches: Dict[str, Dict], old_roles: Dict[str, Dict], 
                    banks_lookup: Dict[str, Dict], bats_lookup: Dict[str, Dict], 
                    contract_types_lookup: Dict[str, Dict]) -> List[Dict]:
    """Transformiert User-Daten von alter zu neuer Struktur."""
    new_users = []
    
    # Erstelle Mapping für Branch-IDs
    branch_id_map = {}  # old_id -> new_branch_name
    for branch in old_branches.values():
        branch_id_map[branch['branch_id']] = branch['branch_name']
    
    # Erstelle Mapping für Role-IDs
    role_id_map = {}  # old_id -> new_role_name
    for role in old_roles.values():
        role_id_map[role['role_id']] = role['role_desc']
    
    for old_user in old_users:
        # Geburtstag konvertieren
        birthday = None
        if old_user.get('birthday') and old_user['birthday'] != '0000-00-00':
            try:
                birthday = datetime.strptime(old_user['birthday'], '%Y-%m-%d').isoformat()
            except:
                pass
        
        # Email generieren (username@lafamilia.local als Fallback)
        email = f"{old_user['username']}@lafamilia.local"
        
        # Bank-Details zusammenfassen (mit Lookup-Tabellen)
        bank_details = None
        bank_id = old_user.get('bank')
        bank_account = old_user.get('ban', '')
        bat_id = old_user.get('bat', '')
        
        if bank_id and bank_id != '0' and bank_account:
            # Bank-Name aus Lookup-Tabelle
            bank_name = banks_lookup.get(bank_id, {}).get('bank_name', '')
            # Bank Account Type aus Lookup-Tabelle
            bat_desc = bats_lookup.get(bat_id, {}).get('bat_desc', '')
            
            if bank_name or bank_account:
                parts = []
                if bank_name:
                    parts.append(bank_name)
                if bank_account:
                    parts.append(bank_account)
                if bat_desc:
                    parts.append(f"({bat_desc})")
                bank_details = " - ".join(parts)
        
        # Contract-Type aus Lookup-Tabelle
        contract_type = None
        contract_type_id = old_user.get('contract_type')
        if contract_type_id and contract_type_id != '0':
            contract_type = contract_types_lookup.get(contract_type_id, {}).get('contract_type_desc', '')
        
        # Active-From/To konvertieren
        active_from = None
        active_to = None
        if old_user.get('active_from') and old_user['active_from'] != '0000-00-00':
            try:
                active_from = datetime.strptime(old_user['active_from'], '%Y-%m-%d').isoformat()
            except:
                pass
        
        if old_user.get('active_to') and old_user['active_to'] != '0000-00-00':
            try:
                active_to = datetime.strptime(old_user['active_to'], '%Y-%m-%d').isoformat()
            except:
                pass
        
        new_user = {
            "old_id": old_user['id'],
            "username": old_user['username'],
            "email": email,
            "password": old_user.get('password', ''),  # Bcrypt-Hash bleibt erhalten
            "firstName": old_user.get('firstname', '') or None,
            "lastName": old_user.get('lastname', '') or None,
            "birthday": birthday,
            "bankDetails": bank_details,
            "contract": contract_type,
            "salary": float(old_user['salary']) if old_user.get('salary') and old_user['salary'] != '0' else None,
            "identificationNumber": old_user.get('idnr') or None,
            "contractType": contract_type,
            "activeFrom": active_from,
            "activeTo": active_to,
            # Mapping-Daten für später
            "old_branch_id": old_user.get('branch'),
            "old_role_id": old_user.get('role'),
        }
        
        new_users.append(new_user)
    
    return new_users

def transform_branches(old_branches: List[Dict]) -> List[Dict]:
    """Transformiert Branch-Daten."""
    new_branches = []
    
    for old_branch in old_branches:
        new_branch = {
            "old_id": old_branch['branch_id'],
            "name": old_branch['branch_name'],
            "address": old_branch.get('branch_direction') or None,
        }
        new_branches.append(new_branch)
    
    return new_branches

def transform_roles(old_roles: List[Dict]) -> List[Dict]:
    """Transformiert Role-Daten."""
    new_roles = []
    
    for old_role in old_roles:
        new_role = {
            "old_id": old_role['role_id'],
            "name": old_role['role_desc'],
            "description": None,
        }
        new_roles.append(new_role)
    
    return new_roles

def transform_requests(old_requests: List[Dict], user_id_map: Dict[str, int], branch_id_map: Dict[str, int], status_map: Dict[str, str]) -> List[Dict]:
    """Transformiert Request-Daten."""
    new_requests = []
    
    for old_request in old_requests:
        # Status mapping
        old_status = old_request.get('status', '2')  # Default: Approval
        new_status = status_map.get(old_status, 'approval')
        
        # Datum konvertieren
        due_date = None
        if old_request.get('due_date') and old_request['due_date'] != '0000-00-00 00:00:00':
            try:
                due_date = datetime.strptime(old_request['due_date'], '%Y-%m-%d %H:%M:%S').isoformat()
            except:
                try:
                    due_date = datetime.strptime(old_request['due_date'], '%Y-%m-%d').isoformat()
                except:
                    pass
        
        new_request = {
            "old_id": old_request['request_id'],
            "title": old_request.get('request', ''),
            "description": old_request.get('request_desc') or None,
            "status": new_status,
            "old_requester_id": old_request.get('requested_by'),
            "old_responsible_id": old_request.get('responsible'),
            "old_branch_id": old_request.get('branch_id'),
            "dueDate": due_date,
            "createTodo": old_request.get('task_id') == '0' or False,
        }
        new_requests.append(new_request)
    
    return new_requests

def transform_cerebro(old_cerebro: List[Dict], users_by_name: Dict[str, Dict]) -> List[Dict]:
    """Transformiert Cerebro-Artikel."""
    new_cerebro = []
    
    for old_article in old_cerebro:
        # Slug generieren aus Titel
        title = old_article.get('cerebro_title', '')
        slug = re.sub(r'[^a-z0-9]+', '-', title.lower()).strip('-')
        
        # Datum konvertieren
        created_at = None
        if old_article.get('cerebro_created_at'):
            try:
                created_at = datetime.strptime(old_article['cerebro_created_at'], '%Y-%m-%d %H:%M:%S').isoformat()
            except:
                pass
        
        # Autor finden: Name -> User-ID
        author_name = old_article.get('cerebro_author', '')
        old_author_id = None
        if author_name:
            # Suche nach User mit diesem Namen (firstname + lastname)
            for user_id, user_data in users_by_name.items():
                firstname = (user_data.get('firstname') or '').strip()
                lastname = (user_data.get('lastname') or '').strip()
                full_name = f"{firstname} {lastname}".strip()
                if full_name == author_name or firstname == author_name:
                    old_author_id = user_id
                    break
        
        new_article = {
            "old_id": old_article['id'],
            "title": title,
            "content": old_article.get('cerebro_content', ''),
            "slug": slug,
            "old_author_id": old_author_id,  # User-ID aus der alten DB
            "author_name": author_name,  # Name als Fallback
            "createdAt": created_at,
        }
        new_cerebro.append(new_article)
    
    return new_cerebro

def transform_tasks(old_tasks: List[Dict], task_status_map: Dict[str, str]) -> List[Dict]:
    """Transformiert Task-Daten."""
    new_tasks = []
    
    for old_task in old_tasks:
        # Status mapping
        old_status = old_task.get('status', '1')  # Default: open
        new_status = task_status_map.get(old_status, 'open')
        
        # Datum konvertieren
        due_date = None
        if old_task.get('due_date') and old_task['due_date'] != '0000-00-00 00:00:00':
            try:
                due_date = datetime.strptime(old_task['due_date'], '%Y-%m-%d %H:%M:%S').isoformat()
            except:
                try:
                    due_date = datetime.strptime(old_task['due_date'], '%Y-%m-%d').isoformat()
                except:
                    pass
        
        created_at = None
        if old_task.get('started_at') and old_task['started_at'] != '0000-00-00 00:00:00':
            try:
                created_at = datetime.strptime(old_task['started_at'], '%Y-%m-%d %H:%M:%S').isoformat()
            except:
                pass
        
        # Beschreibung kombinieren
        description = old_task.get('task_desc', '') or ''
        task_desc_ext = old_task.get('task_desc_ext', '') or ''
        if task_desc_ext:
            if description:
                description = f"{description}\n\n{task_desc_ext}"
            else:
                description = task_desc_ext
        
        new_task = {
            "old_id": old_task['task_id'],
            "title": old_task.get('task', ''),
            "description": description or None,
            "status": new_status,
            "old_responsible_id": old_task.get('user_id'),  # Kann null sein
            "old_quality_control_id": old_task.get('qc_id'),  # Kann null sein
            "old_branch_id": old_task.get('branch_id'),  # Kann "0" oder null sein
            "old_role_id": old_task.get('role'),  # Kann null sein
            "dueDate": due_date,
            "createdAt": created_at,
            "old_request_id": old_task.get('request_id'),  # Für Referenz
        }
        new_tasks.append(new_task)
    
    return new_tasks

def main():
    """Hauptfunktion."""
    print("Starte Import-Vorbereitung...")
    
    # Parse JSON
    print(f"\nLese JSON-Datei: {JSON_FILE}")
    tables = parse_json_export(JSON_FILE)
    
    print(f"\nGefundene Tabellen: {list(tables.keys())}")
    
    # Lade Lookup-Tabellen
    old_branches_list = tables.get('intra_branches', [])
    old_roles_list = tables.get('intra_roles', [])
    old_status_list = tables.get('intra_status', [])
    old_contract_types = tables.get('intra_contract_type', [])
    old_id_types = tables.get('intra_id_type', [])
    old_banks = tables.get('intra_banks', [])
    old_bats = tables.get('intra_bats', [])
    
    # Erstelle Lookup-Dictionaries
    branches_dict = {b['branch_id']: b for b in old_branches_list}
    roles_dict = {r['role_id']: r for r in old_roles_list}
    banks_dict = {b['bank_id']: b for b in tables.get('intra_banks', [])}
    bats_dict = {b['bat_id']: b for b in tables.get('intra_bats', [])}
    contract_types_dict = {c['contract_type_id']: c for c in tables.get('intra_contract_type', [])}
    
    # User-Dictionary für Cerebro-Autoren-Suche
    old_users_list = tables.get('intra_users', [])
    users_by_name = {u['id']: u for u in old_users_list}
    
    # Status-Mapping: alte Status-IDs zu neuen Status-Namen (für Requests)
    status_map = {
        '1': 'approval',  # Open -> approval
        '2': 'approval',  # Approval
        '3': 'approved',  # Approved
        '4': 'approval',  # In progress -> approval
        '5': 'approval',  # Quality control -> approval
        '6': 'approved',  # Done -> approved
        '7': 'denied',    # Rejected -> denied
        '8': 'to_improve',  # To improve
        '999': 'denied',  # Missed -> denied
    }
    
    # Task-Status-Mapping: alte Status-IDs zu neuen TaskStatus-Enum-Werten
    task_status_map = {
        '1': 'open',              # Offen
        '2': 'in_progress',       # In Bearbeitung
        '3': 'improval',          # Verbesserung notwendig
        '4': 'quality_control',   # In Qualitätskontrolle
        '5': 'done',              # Abgeschlossen
        '6': 'done',              # Abgeschlossen (alternative)
    }
    
    # Transformiere Daten
    print("\nTransformiere Daten...")
    
    # User
    old_users = tables.get('intra_users', [])
    new_users = transform_users(old_users, branches_dict, roles_dict, banks_dict, bats_dict, contract_types_dict)
    print(f"User: {len(old_users)} -> {len(new_users)}")
    
    # Branches
    new_branches = transform_branches(old_branches_list)
    print(f"Branches: {len(old_branches_list)} -> {len(new_branches)}")
    
    # Roles
    new_roles = transform_roles(old_roles_list)
    print(f"Roles: {len(old_roles_list)} -> {len(new_roles)}")
    
    # Requests
    old_requests = tables.get('intra_requests', [])
    new_requests = transform_requests(old_requests, {}, {}, status_map)  # ID-Mappings kommen später
    print(f"Requests: {len(old_requests)} -> {len(new_requests)}")
    
    # Cerebro
    old_cerebro = tables.get('intra_cerebro', [])
    new_cerebro = transform_cerebro(old_cerebro, users_by_name)
    print(f"Cerebro: {len(old_cerebro)} -> {len(new_cerebro)}")
    
    # Tasks
    old_tasks = tables.get('intra_tasks', [])
    new_tasks = transform_tasks(old_tasks, task_status_map)
    print(f"Tasks: {len(old_tasks)} -> {len(new_tasks)}")
    
    # User-Branches
    old_user_branches = tables.get('intra_users_branches', [])
    print(f"User-Branches: {len(old_user_branches)} Zuordnungen")
    
    # User-Roles
    old_user_roles = tables.get('intra_users_roles', [])
    print(f"User-Roles: {len(old_user_roles)} Zuordnungen")
    
    # Speichere transformierte Daten
    print("\nSpeichere transformierte Daten...")
    
    with open(OUTPUT_DIR / "users.json", 'w', encoding='utf-8') as f:
        json.dump(new_users, f, indent=2, ensure_ascii=False)
    
    with open(OUTPUT_DIR / "branches.json", 'w', encoding='utf-8') as f:
        json.dump(new_branches, f, indent=2, ensure_ascii=False)
    
    with open(OUTPUT_DIR / "roles.json", 'w', encoding='utf-8') as f:
        json.dump(new_roles, f, indent=2, ensure_ascii=False)
    
    with open(OUTPUT_DIR / "requests.json", 'w', encoding='utf-8') as f:
        json.dump(new_requests, f, indent=2, ensure_ascii=False)
    
    with open(OUTPUT_DIR / "cerebro.json", 'w', encoding='utf-8') as f:
        json.dump(new_cerebro, f, indent=2, ensure_ascii=False)
    
    with open(OUTPUT_DIR / "tasks.json", 'w', encoding='utf-8') as f:
        json.dump(new_tasks, f, indent=2, ensure_ascii=False)
    
    with open(OUTPUT_DIR / "user_branches.json", 'w', encoding='utf-8') as f:
        json.dump(old_user_branches, f, indent=2, ensure_ascii=False)
    
    with open(OUTPUT_DIR / "user_roles.json", 'w', encoding='utf-8') as f:
        json.dump(old_user_roles, f, indent=2, ensure_ascii=False)
    
    print(f"\n[OK] Daten gespeichert in: {OUTPUT_DIR}")
    print("\nNächste Schritte:")
    print("1. Prüfe die transformierten Daten in import_data/")
    print("2. Erstelle Import-Skript mit Prisma Client")
    print("3. Importiere die Daten in die Datenbank")

if __name__ == "__main__":
    main()

