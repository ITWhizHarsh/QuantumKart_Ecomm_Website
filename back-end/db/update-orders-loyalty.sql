-- Add loyalty-related columns to the orders table
ALTER TABLE orders 
  ADD COLUMN IF NOT EXISTS redeem_loyalty_points BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS points_redeemed INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS discounted_cost NUMERIC(10, 2);

-- Drop the constraint first
ALTER TABLE payments DROP CONSTRAINT IF EXISTS payments_coupon_code_fkey;

-- Remove the loyalty_program table since we're not using it anymore
DROP TABLE IF EXISTS loyalty_program;

-- Re-add indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_orders_customer_id ON orders(customer_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status); 