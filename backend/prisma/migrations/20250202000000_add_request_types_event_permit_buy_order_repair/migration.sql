-- AlterEnum
-- Füge neue Werte zum RequestType Enum hinzu
-- WICHTIG: ALTER TYPE ADD VALUE fügt Werte am Ende hinzu, bestehende Werte bleiben erhalten
-- Hinweis: Jeder ALTER TYPE ADD VALUE Befehl muss in einer separaten Transaktion ausgeführt werden
-- Prisma führt diese Migration automatisch korrekt aus
ALTER TYPE "RequestType" ADD VALUE 'event';
ALTER TYPE "RequestType" ADD VALUE 'permit';
ALTER TYPE "RequestType" ADD VALUE 'buy_order';
ALTER TYPE "RequestType" ADD VALUE 'repair';

