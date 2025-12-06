-- Fix AI enabled für Branch Manila (Branch ID 4)
-- Setzt ai.enabled auf true für Branch 4

UPDATE "Branch"
SET "whatsappSettings" = jsonb_set(
    COALESCE("whatsappSettings", '{}'::jsonb),
    '{ai,enabled}',
    'true'::jsonb
)
WHERE id = 4
AND "whatsappSettings"->'ai' IS NOT NULL;

-- Prüfe das Ergebnis
SELECT 
    id,
    name,
    "whatsappSettings"->'ai'->>'enabled' as ai_enabled,
    "whatsappSettings"->'ai' as ai_config
FROM "Branch"
WHERE id = 4;

