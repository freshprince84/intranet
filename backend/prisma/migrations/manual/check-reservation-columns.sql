-- Prüfe, welche Spalten in der Reservation-Tabelle fehlen
SELECT 
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_name = 'Reservation'
  AND table_schema = 'public'
ORDER BY column_name;

-- Prüfe speziell auf fehlende Spalten
SELECT 
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'Reservation' AND column_name = 'paymentDeadline') 
        THEN 'paymentDeadline EXISTS' 
        ELSE 'paymentDeadline MISSING' 
    END as paymentDeadline_status,
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'Reservation' AND column_name = 'autoCancelEnabled') 
        THEN 'autoCancelEnabled EXISTS' 
        ELSE 'autoCancelEnabled MISSING' 
    END as autoCancelEnabled_status,
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'Reservation' AND column_name = 'amount') 
        THEN 'amount EXISTS' 
        ELSE 'amount MISSING' 
    END as amount_status,
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'Reservation' AND column_name = 'currency') 
        THEN 'currency EXISTS' 
        ELSE 'currency MISSING' 
    END as currency_status;

