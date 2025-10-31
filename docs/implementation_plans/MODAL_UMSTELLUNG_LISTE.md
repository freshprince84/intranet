# Liste: Modals die auf Sidepane-Pattern umgestellt werden müssen

## Status: Zu korrigieren

Alle folgenden Komponenten müssen auf das Standard-Sidepane-Pattern umgestellt werden (wie CreateTaskModal/CreateRequestModal).

---

## 1. CreateClientModal.tsx
**Aktuell:** Modal (Dialog.Panel, zentriert)
**Soll:** Sidepane auf Desktop, Modal auf Mobile
**Datei:** `frontend/src/components/CreateClientModal.tsx`
**Zeilen:** 90-238
**Priorität:** Hoch

---

## 2. EditClientModal.tsx
**Aktuell:** Modal (Dialog.Panel, zentriert)
**Soll:** Sidepane auf Desktop, Modal auf Mobile
**Datei:** `frontend/src/components/EditClientModal.tsx`
**Zeilen:** 153-332
**Priorität:** Hoch

---

## 3. RoleManagementTab.tsx - Rollen erstellen/bearbeiten
**Aktuell:** Custom Modal (kein Dialog.Panel, zentriert, ohne HeadlessUI)
**Soll:** Sidepane auf Desktop, Modal auf Mobile (mit HeadlessUI Dialog)
**Datei:** `frontend/src/components/RoleManagementTab.tsx`
**Zeilen:** 1227-1447 (Modal-Bereich)
**Priorität:** Hoch
**Hinweis:** Hat bereits Scroll-Struktur, muss aber auf Standard-Pattern umgestellt werden

---

## 4. CreateOrganizationModal.tsx
**Aktuell:** Altes Modal-Pattern (kein HeadlessUI, altes CSS)
**Soll:** Sidepane auf Desktop, Modal auf Mobile (mit HeadlessUI Dialog)
**Datei:** `frontend/src/components/organization/CreateOrganizationModal.tsx`
**Zeilen:** 39-84
**Priorität:** Mittel

---

## 5. JoinOrganizationModal.tsx
**Aktuell:** Altes Modal-Pattern (kein HeadlessUI, altes CSS)
**Soll:** Sidepane auf Desktop, Modal auf Mobile (mit HeadlessUI Dialog)
**Datei:** `frontend/src/components/organization/JoinOrganizationModal.tsx`
**Zeilen:** 38-73
**Priorität:** Mittel

---

## ✅ Bereits korrekt (Referenzen):
- CreateTaskModal.tsx - Standard-Sidepane
- CreateRequestModal.tsx - Standard-Sidepane
- EditTaskModal.tsx - Standard-Sidepane
- EditRequestModal.tsx - Standard-Sidepane

---

## Implementierungsreihenfolge (Empfehlung):

1. **CreateClientModal.tsx** (einfach, gute Referenz)
2. **EditClientModal.tsx** (ähnlich wie CreateClientModal)
3. **RoleManagementTab.tsx** (komplexer wegen vielen Berechtigungen, aber wichtig)
4. **CreateOrganizationModal.tsx** (einfach, aber niedrigere Priorität)
5. **JoinOrganizationModal.tsx** (einfach, aber niedrigere Priorität)

---

## Standard-Pattern (zu verwenden):

Siehe `docs/core/DESIGN_STANDARDS.md` Abschnitt "Sidepanes" für das vollständige Pattern.

**Kurzform:**
- Mobile (<640px): Modal mit Dialog.Panel
- Desktop (≥640px): Sidepane mit `transform transition-transform`, Backdrop `bg-black/10`, Panel `max-w-sm`

**Referenz-Implementierungen:**
- CreateTaskModal.tsx (Zeilen 475-605)
- CreateRequestModal.tsx (Zeilen 437-781)

