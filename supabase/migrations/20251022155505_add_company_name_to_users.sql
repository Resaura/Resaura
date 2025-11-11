/*
  # Add company_name column to users table

  1. Changes
    - Add `company_name` column to users table
    - Set default value for existing records

  2. Notes
    - This column will be used on reservation receipts
    - Required field for new signups
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'company_name'
  ) THEN
    ALTER TABLE users ADD COLUMN company_name text NOT NULL DEFAULT '';
  END IF;
END $$;
