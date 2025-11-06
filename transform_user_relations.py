#!/usr/bin/env python3
"""
Transformiert User-Branches und User-Roles mit lastUsed-Flag.
"""

import json
from pathlib import Path

# Pfade
OUTPUT_DIR = Path("import_data")

def transform_user_branches(old_user_branches: list, users_active_branches: dict) -> list:
    """
    Transformiert User-Branches mit lastUsed-Flag.
    users_active_branches: {user_id: branch_id} - aktiver Branch aus User-Eintrag
    """
    transformed = []
    
    for ub in old_user_branches:
        user_id = ub.get('user_id')
        branch_id = ub.get('branch_id')
        
        # Prüfe ob dies der aktive Branch ist
        is_active = users_active_branches.get(user_id) == branch_id
        
        transformed.append({
            "old_user_id": user_id,
            "old_branch_id": branch_id,
            "lastUsed": is_active
        })
    
    return transformed

def transform_user_roles(old_user_roles: list, users_active_roles: dict) -> list:
    """
    Transformiert User-Roles mit lastUsed-Flag.
    users_active_roles: {user_id: role_id} - aktive Role aus User-Eintrag
    """
    transformed = []
    
    for ur in old_user_roles:
        user_id = ur.get('user_id')
        role_id = ur.get('role_id')
        
        # Prüfe ob dies die aktive Role ist
        is_active = users_active_roles.get(user_id) == role_id
        
        transformed.append({
            "old_user_id": user_id,
            "old_role_id": role_id,
            "lastUsed": is_active
        })
    
    return transformed

def main():
    """Hauptfunktion."""
    print("Transformiere User-Branches und User-Roles...")
    
    # Lade Daten
    with open(OUTPUT_DIR / "users.json", 'r', encoding='utf-8') as f:
        users = json.load(f)
    
    with open(OUTPUT_DIR / "user_branches.json", 'r', encoding='utf-8') as f:
        old_user_branches = json.load(f)
    
    with open(OUTPUT_DIR / "user_roles.json", 'r', encoding='utf-8') as f:
        old_user_roles = json.load(f)
    
    # Erstelle Mapping: {user_id: active_branch_id} aus User-Einträgen
    users_active_branches = {}
    users_active_roles = {}
    
    for user in users:
        old_id = user.get('old_id')
        active_branch = user.get('old_branch_id')
        active_role = user.get('old_role_id')
        
        if old_id and active_branch:
            users_active_branches[old_id] = active_branch
        if old_id and active_role:
            users_active_roles[old_id] = active_role
    
    print(f"Aktive Branches: {len(users_active_branches)}")
    print(f"Aktive Roles: {len(users_active_roles)}")
    
    # Transformiere
    new_user_branches = transform_user_branches(old_user_branches, users_active_branches)
    new_user_roles = transform_user_roles(old_user_roles, users_active_roles)
    
    print(f"User-Branches: {len(old_user_branches)} -> {len(new_user_branches)}")
    print(f"User-Roles: {len(old_user_roles)} -> {len(new_user_roles)}")
    
    # Zeige Statistiken
    active_branches = sum(1 for ub in new_user_branches if ub['lastUsed'])
    active_roles = sum(1 for ur in new_user_roles if ur['lastUsed'])
    print(f"Aktive Branches: {active_branches}")
    print(f"Aktive Roles: {active_roles}")
    
    # Speichere
    with open(OUTPUT_DIR / "user_branches.json", 'w', encoding='utf-8') as f:
        json.dump(new_user_branches, f, indent=2, ensure_ascii=False)
    
    with open(OUTPUT_DIR / "user_roles.json", 'w', encoding='utf-8') as f:
        json.dump(new_user_roles, f, indent=2, ensure_ascii=False)
    
    print(f"\n✓ Daten gespeichert in: {OUTPUT_DIR}")

if __name__ == "__main__":
    main()

