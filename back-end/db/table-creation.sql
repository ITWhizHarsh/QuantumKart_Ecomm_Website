-- 1. Customers (formerly "users")
CREATE TABLE customers (
  id SERIAL PRIMARY KEY,
  email_address VARCHAR(100) UNIQUE NOT NULL,
  hashed_pw TEXT NOT NULL,
  auth_method VARCHAR(50) NOT NULL,
  customer_name VARCHAR(100) NOT NULL,   -- Friend's "C_name"
  customer_age INTEGER,                  -- Friend's "C_age"
  loyalty_pts INTEGER DEFAULT 0          -- Friend's "Loyalty_pts"
);

-- 2. Manufacturers
CREATE TABLE manufacturers (
  id SERIAL PRIMARY KEY,
  email_address VARCHAR(100) UNIQUE,  -- Optional; if needed for login/contact
  hashed_pw TEXT NOT NULL,
  company_name VARCHAR(100) NOT NULL,
  agent_name VARCHAR(100),
  no_of_products INTEGER DEFAULT 0
);

-- 3. Loyalty Program
CREATE TABLE loyalty_program (
  coupon_code VARCHAR(50) PRIMARY KEY,
  reqd_pts INTEGER NOT NULL,
  discount_amt MONEY NOT NULL,
  last_date DATE NOT NULL
);

-- 4. Addresses
CREATE TABLE addresses (
  id SERIAL PRIMARY KEY,
  customer_id INTEGER NOT NULL,
  address VARCHAR(300) NOT NULL,
  postcode VARCHAR(8) NOT NULL,
  UNIQUE (customer_id, address, postcode),
  FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE
);

-- 5. Phone Numbers
CREATE TABLE phone_numbers (
  customer_id INTEGER NOT NULL,
  phone_number VARCHAR(20) NOT NULL,
  PRIMARY KEY (customer_id, phone_number),
  FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE
);

-- 6. Categories
CREATE TABLE categories (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  url_slug VARCHAR(50)
);

-- 7. Products
CREATE TABLE products (
  id SERIAL PRIMARY KEY,
  manufacturer_id INTEGER,  -- Optional; if a product must come from a manufacturer
  name VARCHAR(100) NOT NULL,
  price MONEY NOT NULL,
  stock_count INTEGER NOT NULL,
  available_stock_count INTEGER NOT NULL,
  short_description VARCHAR(200),
  long_description TEXT,
  size VARCHAR(25),
  avg_rating DECIMAL(3,2),
  rating_count INTEGER,
  image_path VARCHAR(255),
  FOREIGN KEY (manufacturer_id) REFERENCES manufacturers(id) ON DELETE CASCADE
);

-- 8. Product-Categories (many-to-many)
CREATE TABLE product_categories (
  product_id INTEGER NOT NULL,
  category_id INTEGER NOT NULL,
  PRIMARY KEY (product_id, category_id),
  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
  FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE CASCADE
);

-- 9. Cart (cart_products)
CREATE TABLE cart_products (
  customer_id INTEGER NOT NULL,
  product_id INTEGER NOT NULL,
  quantity SMALLINT NOT NULL DEFAULT 1,
  PRIMARY KEY (customer_id, product_id),
  FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE,
  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
);

-- 10. Orders
CREATE TABLE orders (
  id SERIAL PRIMARY KEY,
  customer_id INTEGER NOT NULL,
  address_id INTEGER NOT NULL,
  order_placed_time TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  status VARCHAR(100) NOT NULL,
  total_cost MONEY NOT NULL,
  FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE,
  FOREIGN KEY (address_id) REFERENCES addresses(id) ON DELETE CASCADE
);

-- 11. Order Details (order_products)
CREATE TABLE order_products (
  order_id INTEGER NOT NULL,
  product_id INTEGER NOT NULL,
  product_quantity SMALLINT NOT NULL DEFAULT 1,
  PRIMARY KEY (order_id, product_id),
  FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
);

-- 12. Reviews
CREATE TABLE reviews (
  id SERIAL PRIMARY KEY,
  product_id INTEGER NOT NULL,
  customer_id INTEGER NOT NULL,
  rating INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
  review TEXT,
  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
  FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE
);

-- 13. Payments
CREATE TABLE payments (
  id SERIAL PRIMARY KEY,
  order_id INTEGER NOT NULL,
  coupon_code VARCHAR(50),
  amt_paid MONEY NOT NULL,
  FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
  FOREIGN KEY (coupon_code) REFERENCES loyalty_program(coupon_code) ON DELETE CASCADE
);












/* 
CREATE TABLE "customers" (
  "id" SERIAL PRIMARY KEY,
  "email_address" varchar(100) UNIQUE NOT NULL,
  "hashed_pw" text,
  "auth_method" varchar(50) NOT NULL,
  "customer_name" varchar(100),
  "customer_age" integer,
  "loyalty_pts" integer DEFAULT 0
);

CREATE TABLE "addresses" (
  "id" SERIAL PRIMARY KEY,
  "address" varchar(300) NOT NULL,
  "postcode" varchar(8) NOT NULL,
  UNIQUE ("address", "postcode")
);

CREATE TABLE "products" (
  "id" SERIAL PRIMARY KEY,
  "name" varchar(100) NOT NULL,
  "price" money NOT NULL,
  "stock_count" integer NOT NULL,
  "available_stock_count" integer NOT NULL,
  "short_description" varchar(200),
  "long_description" text,
  "size" varchar(25),
  "avg_rating" decimal(3, 2),
  "rating_count" integer
);

CREATE TABLE "cart_products" (
  "user_id" integer,
  "product_id" integer,
  "quantity" smallint NOT NULL DEFAULT 1,
  PRIMARY KEY ("user_id", "product_id")
);

CREATE TABLE "orders" (
  "id" SERIAL PRIMARY KEY,
  "user_id" integer,
  "address_id" integer,
  "order_placed_time" timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "status" varchar(100) NOT NULL,
  "total_cost" money NOT NULL
);

CREATE TABLE "order_products" (
  "order_id" integer,
  "product_id" integer,
  "product_quantity" smallint NOT NULL DEFAULT 1,
  PRIMARY KEY ("order_id", "product_id")
);

CREATE TABLE "categories" (
  "id" SERIAL PRIMARY KEY,
  "name" varchar(100) NOT NULL,
  "description" text,
  "url_slug" varchar(50)
);

CREATE TABLE "product_categories" (
  "product_id" integer,
  "category_id" integer,
  PRIMARY KEY ("product_id", "category_id")
);

ALTER TABLE "cart_products" ADD FOREIGN KEY ("user_id") REFERENCES "customers" ("id");

ALTER TABLE "cart_products" ADD FOREIGN KEY ("product_id") REFERENCES "products" ("id");

ALTER TABLE "orders" ADD FOREIGN KEY ("user_id") REFERENCES "customers" ("id");

ALTER TABLE "orders" ADD FOREIGN KEY ("address_id") REFERENCES "addresses" ("id");

ALTER TABLE "order_products" ADD FOREIGN KEY ("order_id") REFERENCES "orders" ("id");

ALTER TABLE "order_products" ADD FOREIGN KEY ("product_id") REFERENCES "products" ("id");

ALTER TABLE "product_categories" ADD FOREIGN KEY ("product_id") REFERENCES "products" ("id");

ALTER TABLE "product_categories" ADD FOREIGN KEY ("category_id") REFERENCES "categories" ("id");
 */