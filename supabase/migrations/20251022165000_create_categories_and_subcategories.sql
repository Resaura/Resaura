/*
  # Create categories and subcategories tables

  1. New Tables
    - `transaction_categories`
      - `id` (uuid, primary key)
      - `user_id` (uuid, foreign key to users)
      - `name` (text)
      - `type` (text) - 'income' or 'expense'
      - `created_at` (timestamptz)
    
    - `transaction_subcategories`
      - `id` (uuid, primary key)
      - `category_id` (uuid, foreign key to transaction_categories)
      - `name` (text)
      - `created_at` (timestamptz)

  2. Security
    - Enable RLS on both tables
    - Add policies for authenticated users to manage their own categories
*/

CREATE TABLE IF NOT EXISTS transaction_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id) NOT NULL,
  name text NOT NULL,
  type text NOT NULL DEFAULT 'expense',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE transaction_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own categories"
  ON transaction_categories
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own categories"
  ON transaction_categories
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own categories"
  ON transaction_categories
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own categories"
  ON transaction_categories
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS transaction_subcategories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id uuid REFERENCES transaction_categories(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE transaction_subcategories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view subcategories of own categories"
  ON transaction_subcategories
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM transaction_categories
      WHERE transaction_categories.id = transaction_subcategories.category_id
      AND transaction_categories.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert subcategories for own categories"
  ON transaction_subcategories
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM transaction_categories
      WHERE transaction_categories.id = category_id
      AND transaction_categories.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update subcategories of own categories"
  ON transaction_subcategories
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM transaction_categories
      WHERE transaction_categories.id = transaction_subcategories.category_id
      AND transaction_categories.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM transaction_categories
      WHERE transaction_categories.id = category_id
      AND transaction_categories.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete subcategories of own categories"
  ON transaction_subcategories
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM transaction_categories
      WHERE transaction_categories.id = transaction_subcategories.category_id
      AND transaction_categories.user_id = auth.uid()
    )
  );
