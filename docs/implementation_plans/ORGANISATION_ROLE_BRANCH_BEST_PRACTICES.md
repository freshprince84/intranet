# Best Practices: Organisation, Rollen, Branches & Berechtigungen

## Web-Recherche Ergebnisse

### Standard-Ansätze in ERP/CRM/PMS-Systemen

#### 1. **RBAC (Role-Based Access Control) - Basis-Modell**

**Konzept:**
- Benutzer → Rollen → Berechtigungen
- Rollen definieren funktionale Berechtigungen (z.B. "Admin", "Manager", "Mitarbeiter")

**Verknüpfung mit Standorten:**
- **Option A:** Rollen sind standort-agnostisch, Standorte werden separat zugewiesen
- **Option B:** Rollen sind standort-spezifisch (z.B. "Filialleiter München")
- **Option C:** Kombination - Rollen können standort-spezifisch ODER standort-übergreifend sein

#### 2. **ABAC (Attribute-Based Access Control) - Erweitertes Modell**

**Konzept:**
- Erweitert RBAC um Attribute wie:
  - Standort/Location
  - Abteilung/Department
  - Kostenstelle/Cost Center
  - Projekt/Project
  - Zeitraum/Time Period

**Vorteil:**
- Flexiblere Zugriffskontrolle
- Feinere Granularität
- Dynamische Berechtigungen basierend auf Kontext

### Gängige Implementierungsmuster

#### Pattern 1: **Direkte User-Branch-Zuweisung + Rollen**

```
User → UserRole → Role (mit Berechtigungen)
User → UsersBranches → Branch
```

**Vorteile:**
- Einfach zu verstehen
- Flexibel - User kann verschiedene Rollen in verschiedenen Branches haben
- Klare Trennung zwischen funktionalen Rollen und Standorten

**Nachteile:**
- Keine automatische Filterung (User sieht alle Rollen, auch wenn nicht für aktive Branch)
- Mehr Verwaltungsaufwand

**Verwendung:** Microsoft Dynamics 365, viele ERP-Systeme

#### Pattern 2: **Rollen mit Branch-Attribut**

```
User → UserRole → Role → RoleBranch → Branch
```

**Vorteile:**
- Rollen sind explizit mit Branches verknüpft
- Automatische Filterung möglich
- Klare Definition: "Diese Rolle gilt für diese Branches"

**Nachteile:**
- Komplexer
- Eine Rolle muss für jede Branch einzeln zugewiesen werden (außer "alle Branches")

**Verwendung:** SAP (teilweise), Salesforce (Territory-basiert)

#### Pattern 3: **Hybrid: Rollen mit "allBranches" Flag + spezifische Zuweisungen**

```
User → UserRole → Role
  - Role.allBranches = true → gilt für alle Branches
  - Role.allBranches = false → RoleBranch → Branch (spezifische Zuweisungen)
User → UsersBranches → Branch
```

**Vorteile:**
- Flexibel: Rollen können standort-übergreifend ODER standort-spezifisch sein
- Einfach für Admins: "Admin für alle" vs "Recepcion nur Manila"
- Rückwärtskompatibel

**Nachteile:**
- Zwei Konzepte zu verstehen
- Logik etwas komplexer

**Verwendung:** Moderne Systeme, empfohlen für flexible Anforderungen

### Konkrete System-Beispiele

#### Salesforce

**Struktur:**
- **Organization** (Top-Level)
- **Role Hierarchy** (funktionale Rollen, hierarchisch)
- **Territory** (geografische/vertriebsbezogene Einheiten)
- **User** kann mehrere Rollen haben (über Profile)
- **Territory Assignment** (User → Territory)

**Besonderheit:**
- Rollen sind hierarchisch (Manager sieht Daten von Untergebenen)
- Territories sind separat von Rollen
- User kann in mehreren Territories sein

#### Microsoft Dynamics 365

**Struktur:**
- **Organization** (Top-Level)
- **Business Unit** (Organisationseinheiten, hierarchisch)
- **Security Role** (funktionale Berechtigungen)
- **User** → Business Unit + Security Role

**Besonderheit:**
- Business Units sind hierarchisch
- Security Roles sind Business Unit-agnostisch
- User gehört zu einer Business Unit, hat Security Roles

#### SAP

**Struktur:**
- **Organization** (Company Code, Plant, etc.)
- **Role** (funktionale Berechtigungen)
- **Authorization Object** (feingranulare Berechtigungen)
- **User** → Role (mit Organization-Kontext)

**Besonderheit:**
- Rollen enthalten Organization-Kontext (z.B. Plant)
- Authorization Objects können Organization-spezifisch sein
- Komplex, aber sehr flexibel

## Empfehlung für unser System

### Empfohlenes Modell: **Hybrid-Ansatz (Pattern 3)**

**Begründung:**
1. **Flexibilität:** Unterstützt beide Anwendungsfälle:
   - "Admin für alle Branches" (allBranches = true)
   - "Recepcion nur Manila" (allBranches = false, RoleBranch → Manila)

2. **Einfachheit:** Admins können einfach entscheiden:
   - Soll diese Rolle für alle Branches gelten? → Checkbox "Alle Branches"
   - Oder nur für spezifische? → Branch-Auswahl

3. **Rückwärtskompatibilität:** Bestehende Rollen können auf `allBranches = true` gesetzt werden

4. **Skalierbarkeit:** Funktioniert für kleine und große Organisationen

### Datenmodell

```prisma
model Organization {
  id        Int      @id @default(autoincrement())
  name      String   @unique
  // ... weitere Felder
  roles     Role[]
  branches  Branch[]
}

model Role {
  id             Int          @id @default(autoincrement())
  name           String
  description    String?
  organizationId Int?
  allBranches    Boolean      @default(false)  // NEU: Gilt für alle Branches?
  organization   Organization? @relation(fields: [organizationId], references: [id])
  permissions    Permission[]
  users          UserRole[]
  branches       RoleBranch[] // NEU: Spezifische Branch-Zuweisungen
  
  @@unique([name, organizationId])
}

model Branch {
  id             Int          @id @default(autoincrement())
  name           String       @unique
  organizationId Int?
  organization   Organization? @relation(fields: [organizationId], references: [id])
  users          UsersBranches[]
  roles          RoleBranch[] // NEU: Rollen, die für diese Branch gelten
  
  // ... weitere Felder
}

model RoleBranch {
  id        Int      @id @default(autoincrement())
  roleId    Int
  branchId  Int
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  role      Role     @relation(fields: [roleId], references: [id])
  branch    Branch   @relation(fields: [branchId], references: [id])

  @@unique([roleId, branchId])
}

model UserRole {
  id        Int      @id @default(autoincrement())
  userId    Int
  roleId    Int
  lastUsed  Boolean  @default(false)
  role      Role     @relation(fields: [roleId], references: [id])
  user      User     @relation(fields: [userId], references: [id])

  @@unique([userId, roleId])
}

model UsersBranches {
  id        Int      @id @default(autoincrement())
  userId    Int
  branchId  Int
  lastUsed  Boolean  @default(false)
  branch    Branch   @relation(fields: [branchId], references: [id])
  user      User     @relation(fields: [userId], references: [id])

  @@unique([userId, branchId])
}
```

### Logik für Rollen-Verfügbarkeit

**Eine Rolle ist für eine Branch verfügbar, wenn:**
1. `Role.allBranches = true` ODER
2. Es existiert ein `RoleBranch` Eintrag für diese Branch

**Beim Role-Switch:**
- Zeige nur Rollen, die für aktive Branch verfügbar sind
- Wenn keine Rolle verfügbar, Warnung anzeigen

**Beim Branch-Switch:**
- Zeige nur Branches, für die aktive Rolle verfügbar ist
- Wenn keine Branch verfügbar, Warnung anzeigen

### UI/UX-Empfehlungen

#### Rollenverwaltung:
1. **Checkbox:** "Für alle Branches gültig"
2. **Multi-Select:** "Spezifische Branches" (nur wenn Checkbox nicht aktiv)
3. **Anzeige:** "Gilt für: Alle Branches" oder "Gilt für: Manila, Poblado"

#### User-Verwaltung:
1. **Rollen-Tab:** Zeige an, für welche Branches jede Rolle verfügbar ist
2. **Branches-Tab:** Zeige an, welche Rollen für jede Branch verfügbar sind
3. **Warnung:** Wenn User eine Rolle hat, die nicht für alle zugewiesenen Branches verfügbar ist

#### Header (Switch):
1. **Rollenauswahl:** Nur Rollen für aktive Branch anzeigen
2. **Branch-Auswahl:** Nur Branches für aktive Rolle anzeigen
3. **Automatische Korrektur:** Wenn nach Switch keine Rolle/Branch verfügbar, automatisch erste verfügbare aktivieren

## Vergleich der Ansätze

| Ansatz | Flexibilität | Komplexität | Verwaltungsaufwand | Empfohlen für |
|--------|--------------|-------------|-------------------|---------------|
| **Direkte Zuweisung** | ⭐⭐⭐ | ⭐ | ⭐⭐⭐ | Kleine Organisationen |
| **Rollen mit Branch-Attribut** | ⭐⭐ | ⭐⭐⭐ | ⭐⭐ | Sehr strukturierte Organisationen |
| **Hybrid (allBranches + RoleBranch)** | ⭐⭐⭐ | ⭐⭐ | ⭐⭐ | **Flexible Anforderungen** ✅ |

## Fazit

**Empfehlung: Hybrid-Ansatz (Pattern 3)**

Dieser Ansatz bietet:
- ✅ Maximale Flexibilität
- ✅ Einfache Verwaltung für Admins
- ✅ Unterstützt beide Anwendungsfälle ("alle Branches" und "spezifische Branches")
- ✅ Rückwärtskompatibel
- ✅ Entspricht modernen Best Practices (ABAC-Konzept)

**Nächste Schritte:**
1. Datenbank-Schema mit `Role.allBranches` und `RoleBranch` implementieren
2. Backend-Logik für Filterung nach Branch/Role implementieren
3. Frontend-UI für Rollenverwaltung mit Branch-Auswahl implementieren
4. Header-Switch-Logik anpassen

