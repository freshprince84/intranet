-- Migration: Lösche verschlüsselte Bold Payment Settings, die mit altem Schlüssel verschlüsselt wurden
-- Diese können nicht mehr entschlüsselt werden und müssen neu eingegeben werden

-- Lösche verschlüsselte apiKey und merchantId Werte (Format: "iv:authTag:encrypted")
-- Behalte environment-Wert, da dieser nicht verschlüsselt ist

UPDATE "Branch"
SET "boldPaymentSettings" = jsonb_set(
    COALESCE("boldPaymentSettings", '{}'::jsonb),
    '{apiKey}',
    '""'::jsonb
)
WHERE "boldPaymentSettings"->>'apiKey' IS NOT NULL
  AND "boldPaymentSettings"->>'apiKey' LIKE '%:%:%'
  AND "boldPaymentSettings"->>'apiKey' != '';

UPDATE "Branch"
SET "boldPaymentSettings" = jsonb_set(
    COALESCE("boldPaymentSettings", '{}'::jsonb),
    '{merchantId}',
    '""'::jsonb
)
WHERE "boldPaymentSettings"->>'merchantId' IS NOT NULL
  AND "boldPaymentSettings"->>'merchantId' LIKE '%:%:%'
  AND "boldPaymentSettings"->>'merchantId' != '';

-- Zeige betroffene Branches
SELECT id, name, "boldPaymentSettings"
FROM "Branch"
WHERE "boldPaymentSettings" IS NOT NULL
  AND (
    ("boldPaymentSettings"->>'apiKey' IS NOT NULL AND "boldPaymentSettings"->>'apiKey' LIKE '%:%:%')
    OR ("boldPaymentSettings"->>'merchantId' IS NOT NULL AND "boldPaymentSettings"->>'merchantId' LIKE '%:%:%')
  );
