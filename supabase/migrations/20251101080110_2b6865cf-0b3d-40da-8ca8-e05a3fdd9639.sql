-- Add payment_mode column to bills table
ALTER TABLE bills ADD COLUMN payment_mode TEXT;

-- Add a comment to describe the column
COMMENT ON COLUMN bills.payment_mode IS 'Payment method used (e.g., cash, card, upi)';