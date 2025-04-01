-- Rename the primary key column from 'id' to 'order_id'
ALTER TABLE orders RENAME COLUMN id TO order_id;

-- Drop any existing constraints
ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_address_id_fkey;
ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_customer_id_fkey;

-- Drop any embedded address columns and add address_id
ALTER TABLE orders 
  DROP COLUMN IF EXISTS user_address_id,
  DROP COLUMN IF EXISTS house_no,
  DROP COLUMN IF EXISTS locality,
  DROP COLUMN IF EXISTS city,
  DROP COLUMN IF EXISTS country,
  DROP COLUMN IF EXISTS temp_address_id,
  DROP COLUMN IF EXISTS postcode;

-- Make sure address_id exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'orders' AND column_name = 'address_id'
  ) THEN
    ALTER TABLE orders ADD COLUMN address_id INTEGER;
  END IF;
END $$;

-- Update order_products to use order_id
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'order_products_order_id_fkey'
  ) THEN
    ALTER TABLE order_products DROP CONSTRAINT order_products_order_id_fkey;
  END IF;
END $$;

-- Re-add the constraints
ALTER TABLE order_products
  ADD CONSTRAINT order_products_order_id_fkey
  FOREIGN KEY (order_id) REFERENCES orders(order_id) ON DELETE CASCADE;

ALTER TABLE orders
  ADD CONSTRAINT orders_customer_id_fkey
  FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE;

ALTER TABLE orders
  ADD CONSTRAINT orders_address_id_fkey
  FOREIGN KEY (address_id) REFERENCES addresses(address_id) ON DELETE SET NULL; 