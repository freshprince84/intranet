-- Setze alle bestehenden Rollen auf allBranches = true für Rückwärtskompatibilität
-- Dies stellt sicher, dass bestehende Rollen weiterhin für alle Branches verfügbar sind
UPDATE "Role" SET "allBranches" = true WHERE "allBranches" = false;

