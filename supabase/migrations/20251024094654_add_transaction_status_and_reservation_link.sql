/*
  # Add transaction status and reservation link

  1. Changes
    - Add `status` column to transactions table (draft/completed)
    - Add `transaction_id` column to reservations table to link to draft transactions
    - Set default status to 'completed' for existing transactions
  
  2. Security
    - No RLS changes needed, existing policies apply
*/

-- Add status column to transactions if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'transactions' AND column_name = 'status'
  ) THEN
    ALTER TABLE transactions ADD COLUMN status text DEFAULT 'completed';
  END IF;
END $$;

-- Add transaction_id column to reservations if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'reservations' AND column_name = 'transaction_id'
  ) THEN
    ALTER TABLE reservations ADD COLUMN transaction_id uuid REFERENCES transactions(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_reservations_transaction_id ON reservations(transaction_id);
CREATE INDEX IF NOT EXISTS idx_transactions_status ON transactions(status);