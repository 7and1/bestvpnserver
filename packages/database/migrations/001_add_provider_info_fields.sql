-- Migration: Add provider information fields
-- This migration adds optional fields to the providers table for displaying
-- additional provider information on the provider detail page.

-- Add founded year field
ALTER TABLE "providers" ADD COLUMN IF NOT EXISTS "founded_year" smallint;

-- Add headquarters location field
ALTER TABLE "providers" ADD COLUMN IF NOT EXISTS "headquarters" varchar(100);

-- Add protocols field (stores JSON array or comma-separated list)
ALTER TABLE "providers" ADD COLUMN IF NOT EXISTS "protocols" text;

-- Add refund policy field
ALTER TABLE "providers" ADD COLUMN IF NOT EXISTS "refund_policy" varchar(100);

-- Add device limit field
ALTER TABLE "providers" ADD COLUMN IF NOT EXISTS "device_limit" varchar(50);

-- Add pricing tier field
ALTER TABLE "providers" ADD COLUMN IF NOT EXISTS "pricing_tier" varchar(50);
