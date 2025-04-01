const { Pool } = require('pg');

// Setup
const pool = new Pool({
  // Connection variables are passed via process.env
  // See https://node-postgres.com/apis/pool
  // See https://node-postgres.com/features/connecting
});

// Test the database connection
pool.query('SELECT NOW()', (err, res) => {
  if (err) {
    console.error('Database connection error:', err);
  } else {
    console.log('Database connected successfully at:', res.rows[0].now);
  }
});

// Get a client from the pool for transactions
const getClient = async () => {
  return await pool.connect();
};

// Abstract query function to enable consistent error handling
const query = async (text, params) => {
  try {
    console.log('Executing query:', text);
    if (params) console.log('Query params:', params);
    const result = await pool.query(text, params);
    console.log('Query result rows:', result.rows.length);
    return result;
  } catch (err) {
    console.error('Database query error:', err);
    throw err;
  }
};


// Customers (formerly Users)
const emailExists = async (email_address) => {
  const res = await query(
    'SELECT email_address FROM customers WHERE email_address=$1',
    [email_address]
  );
  return res.rowCount > 0;
};

const getCustomerByEmail = async (email_address, auth_method) => {
  const baseQuery = 'SELECT id, email_address, hashed_pw, auth_method, customer_name, customer_age, loyalty_pts FROM customers';
  const filter = ' WHERE email_address=$1 AND auth_method=$2';
  const res = await query(baseQuery + filter, [email_address, auth_method]);
  return res.rows[0];
};

const addLocalCustomer = async (email_address, hashed_pw, customer_name, customer_age) => {
  console.log('Adding local customer:', { email_address, customer_name, customer_age });
  
  if (!email_address || !hashed_pw || !customer_name) {
    console.error('Missing required fields:', { 
      email_address: !!email_address, 
      hashed_pw: !!hashed_pw, 
      customer_name: !!customer_name 
    });
    throw new Error('Missing required fields for customer registration');
  }
  
  try {
    const insertQuery = `
      INSERT INTO customers(
        email_address, 
        hashed_pw, 
        auth_method, 
        customer_name, 
        customer_age, 
        loyalty_pts
      ) 
      VALUES($1, $2, $3, $4, $5, 0) 
      RETURNING id, email_address, customer_name, customer_age, loyalty_pts
    `;
    
    const res = await query(
      insertQuery,
      [email_address, hashed_pw, 'local', customer_name, customer_age]
    );
    
    console.log('Customer added successfully:', res.rows[0]);
    return res.rows[0];
  } catch (err) {
    console.error('Error adding local customer to database:', err);
    console.error('Error details:', err.message);
    if (err.code) {
      console.error('PostgreSQL error code:', err.code);
    }
    throw err;
  }
};

const addGoogleCustomer = async (email_address, customer_name, customer_age) => {
  const res = await query(
    'INSERT INTO customers(email_address, auth_method, customer_name, customer_age) VALUES($1, $2, $3, $4) RETURNING id, email_address, customer_name, customer_age, loyalty_pts',
    [email_address, 'google', customer_name, customer_age]
  );
  return res.rows[0];
};

const updateCustomerPassword = async (id, hashed_pw) => {
  await query(
    'UPDATE customers SET hashed_pw = $1 WHERE id=$2',
    [hashed_pw, id]
  );
  return;
};


// Manufacturers
const getManufacturerByEmail = async (email_address) => {
  const res = await query(
    'SELECT id, email_address, hashed_pw, company_name, agent_name, no_of_products FROM manufacturers WHERE email_address=$1',
    [email_address]
  );
  return res.rows[0];
};

const addManufacturer = async (email_address, hashed_pw, company_name, agent_name) => {
  const res = await query(
    'INSERT INTO manufacturers(email_address, hashed_pw, company_name, agent_name) VALUES($1, $2, $3, $4) RETURNING id, company_name, agent_name',
    [email_address, hashed_pw, company_name, agent_name]
  );
  return res.rows[0];
};


// Loyalty Program
const getLoyaltyCoupon = async (coupon_code) => {
  const res = await query(
    'SELECT coupon_code, reqd_pts, discount_amt, last_date FROM loyalty_program WHERE coupon_code=$1 AND last_date >= CURRENT_DATE',
    [coupon_code]
  );
  return res.rows[0];
};

const updateCustomerLoyaltyPoints = async (customer_id, points) => {
  const res = await query(
    'UPDATE customers SET loyalty_pts = loyalty_pts + $1 WHERE id=$2 RETURNING loyalty_pts',
    [points, customer_id]
  );
  return res.rows[0].loyalty_pts;
};


// Phone Numbers
const addPhoneNumber = async (customer_id, phone_number) => {
  try {
    console.log('Adding phone number:', { customer_id, phone_number });
    
    if (!customer_id || !phone_number) {
      console.error('Missing required fields:', {
        customer_id: !!customer_id,
        phone_number: !!phone_number
      });
      throw new Error('Missing required phone number fields');
    }
    
    const res = await query(
      'INSERT INTO phone_numbers(customer_id, phone_number) VALUES($1, $2) RETURNING phone_number',
      [customer_id, phone_number]
    );
    
    console.log('Phone number added successfully:', res.rows[0]);
    return res.rows[0];
  } catch (err) {
    console.error('Error adding phone number:', err);
    // Check for duplicate key violation
    if (err.code === '23505') { // Postgres unique constraint violation
      throw new Error('This phone number is already registered');
    }
    throw err;
  }
};

const getCustomerPhoneNumbers = async (customer_id) => {
  try {
    console.log('Getting phone numbers for customer:', customer_id);
    
    const res = await query(
      'SELECT phone_number FROM phone_numbers WHERE customer_id=$1',
      [customer_id]
    );
    
    console.log(`Found ${res.rows.length} phone numbers for customer ${customer_id}`);
    return res.rows;
  } catch (err) {
    console.error('Error getting customer phone numbers:', err);
    throw err;
  }
};

const deletePhoneNumber = async (customer_id, phone_number) => {
  try {
    console.log('Deleting phone number:', { customer_id, phone_number });
    
    const res = await query(
      'DELETE FROM phone_numbers WHERE customer_id=$1 AND phone_number=$2',
      [customer_id, phone_number]
    );
    
    if (res.rowCount === 0) {
      console.warn('No phone number found to delete:', { customer_id, phone_number });
      return false;
    }
    
    console.log('Phone number deleted successfully');
    return true;
  } catch (err) {
    console.error('Error deleting phone number:', err);
    throw err;
  }
};


// Products
const getProducts = async (category_id=undefined, search_term=undefined, manufacturer_id=undefined) => {
  const baseQuery = 'SELECT p.id, p.name, p.price, p.available_stock_count, p.short_description, p.long_description, p.avg_rating, p.rating_count, p.image_path, m.company_name FROM products p LEFT JOIN manufacturers m ON p.manufacturer_id = m.id';
  let res;
  if (category_id) {
    res = await query(
      baseQuery + ' JOIN product_categories ON p.id=product_categories.product_id WHERE product_categories.category_id=$1',
      [category_id]
    );
  } else if (search_term) {
    res = await query(
      baseQuery + ' WHERE LOWER(p.name) LIKE $1',
      ['%' + search_term.toLowerCase() + '%']
    );
  } else if (manufacturer_id) {
    res = await query(
      baseQuery + ' WHERE p.manufacturer_id=$1',
      [manufacturer_id]
    );
  } else {
    res = await query(baseQuery);
  }
  return res.rows;
};

const getProductById = async (id) => {
  const baseQuery = 'SELECT id, name, price, available_stock_count, short_description, long_description, avg_rating, rating_count, image_path FROM products';
  const res = await query(baseQuery + ' WHERE id=$1', [id]);
  return res.rows[0];
};


// Categories
const getCategories = async () => {
  res = await query('SELECT id, name, description, url_slug FROM categories');
  return res.rows;
};


// Cart
const getCartItems = async (customer_id) => {
  const select = 'SELECT product_id, name AS product_name, price AS product_price, quantity AS product_quantity FROM cart_products';
  const join = 'JOIN products ON cart_products.product_id = products.id';
  res = await query(`${select} ${join} WHERE customer_id=$1`, [customer_id]);
  return res.rows;
};

const cartItemExists = async (customer_id, product_id) => {
  res = await query(
    'SELECT customer_id, product_id FROM cart_products WHERE customer_id=$1 AND product_id=$2',
    [customer_id, product_id]
  );
  return res.rowCount > 0;
};

const addCartItem = async (customer_id, product_id, product_quantity=1) => {
  const insert = 'INSERT INTO cart_products(customer_id, product_id, quantity) VALUES($1, $2, $3)';
  const update = 'UPDATE products SET available_stock_count = (available_stock_count - $3) WHERE id=$2 RETURNING name, price';
  const res = await query(
    `WITH product AS (${insert}) ${update}`,
    [customer_id, product_id, product_quantity]
  );
  const product_name = res.rows[0].name;
  const product_price = res.rows[0].price;
  return { product_id, product_name, product_price, product_quantity };
};

const deleteCartItem = async (customer_id, product_id) => {
  const deleteRes = await query(
    'DELETE FROM cart_products WHERE customer_id=$1 AND product_id=$2 RETURNING quantity',
    [customer_id, product_id]
  );
  try {
    // TypeError if cart item didn't exist (quantity undefined)
    const quantity = deleteRes.rows[0].quantity;
    await query(
      'UPDATE products SET available_stock_count = (available_stock_count + $1) WHERE id=$2',
      [quantity, product_id]
    );
  } catch(err) {
    console.log(err);
  }
  return;
};


// Addresses
const addAddress = async (customer_id, house_no, locality, city, country, postcode) => {
  try {
    console.log('Adding address for customer:', { 
      customer_id, house_no, locality, city, country, postcode 
    });
    
    // Check if all required fields are present
    if (!customer_id || !house_no || !locality || !city || !country || !postcode) {
      console.error('Missing address fields:', JSON.stringify({
        customer_id: !!customer_id, 
        house_no: !!house_no, 
        locality: !!locality, 
        city: !!city, 
        country: !!country, 
        postcode: !!postcode
      }));
      throw new Error('Missing required address fields');
    }
    
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      
      // First insert or find the address
      const addressRes = await client.query(
        `INSERT INTO addresses(house_no, locality, city, country, postcode) 
         VALUES($1, $2, $3, $4, $5) 
         RETURNING address_id`,
        [house_no, locality, city, country, postcode]
      );
      
      const address_id = addressRes.rows[0].address_id;
      
      // Then link it to the customer
      await client.query(
        `INSERT INTO customer_addresses(customer_id, address_id) 
         VALUES($1, $2) 
         ON CONFLICT (customer_id, address_id) DO NOTHING`,
        [customer_id, address_id]
      );
      
      await client.query('COMMIT');
      
      console.log('Address added successfully with ID:', address_id);
      
      return {
        address_id,
        customer_id,
        house_no,
        locality,
        city,
        country,
        postcode
      };
    } catch (err) {
      await client.query('ROLLBACK');
      console.error('Error in transaction:', err);
      throw err;
    } finally {
      client.release();
    }
  } catch (err) {
    console.error('Error adding address:', err);
    console.error('Error details:', JSON.stringify({
      message: err.message,
      code: err.code,
      constraint: err.constraint
    }));
    throw err;
  }
};

const getUserAddresses = async (customer_id) => {
  try {
    console.log('Getting addresses for customer:', customer_id);
    
    const res = await query(
      `SELECT a.address_id, a.house_no, a.locality, a.city, a.country, a.postcode 
       FROM addresses a
       JOIN customer_addresses ca ON a.address_id = ca.address_id
       WHERE ca.customer_id = $1`,
      [customer_id]
    );
    
    console.log(`Found ${res.rows.length} addresses for customer ${customer_id}`);
    return res.rows;
  } catch (err) {
    console.error('Error getting user addresses:', err);
    throw err;
  }
};

const deleteAddress = async (customer_id, address_id) => {
  try {
    console.log('Deleting address link:', { customer_id, address_id });
    
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      
      // Remove the link from customer_addresses
      await client.query(
        'DELETE FROM customer_addresses WHERE customer_id=$1 AND address_id=$2',
        [customer_id, address_id]
      );
      
      // Check if this address is still linked to any customers
      const linkRes = await client.query(
        'SELECT COUNT(*) FROM customer_addresses WHERE address_id=$1',
        [address_id]
      );
      
      // If not linked to any customers, consider removing the address
      if (parseInt(linkRes.rows[0].count) === 0) {
        // But first check if it's used in any orders
        const orderRes = await client.query(
          'SELECT COUNT(*) FROM orders WHERE address_id=$1',
          [address_id]
        );
        
        // Only delete if not used in orders
        if (parseInt(orderRes.rows[0].count) === 0) {
          await client.query(
            'DELETE FROM addresses WHERE address_id=$1',
            [address_id]
          );
          console.log(`Address ${address_id} fully deleted as it was not in use`);
        } else {
          console.log(`Address ${address_id} kept for order history`);
        }
      } else {
        console.log(`Address ${address_id} still linked to other customers`);
      }
      
      await client.query('COMMIT');
      return true;
    } catch (err) {
      await client.query('ROLLBACK');
      console.error('Error in transaction:', err);
      throw err;
    } finally {
      client.release();
    }
  } catch (err) {
    console.error('Error deleting address:', err);
    throw err;
  }
};


// Checkout
const createPendingOrder = async (customer_id, address_id = null) => {
  // Create a pending order for all current cart items ahead of successful payment
  console.log(`Creating pending order: customer_id=${customer_id}, address_id=${address_id}`);

  // Get cart items
  const cartItems = await getCartItems(customer_id);

  // https://node-postgres.com/features/transactions
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Create pending order record
    let total_cost = 0;
    const order_status = 'payment pending';
    
    // Create the order with address_id
    const orderQuery = address_id ? 
      'INSERT INTO orders(customer_id, address_id, status, total_cost) VALUES($1, $2, $3, $4) RETURNING order_id' :
      'INSERT INTO orders(customer_id, status, total_cost) VALUES($1, $2, $3) RETURNING order_id';
    
    const orderParams = address_id ? 
      [customer_id, address_id, order_status, total_cost] :
      [customer_id, order_status, total_cost];
    
    const orderCreationRes = await client.query(orderQuery, orderParams);
    const order_id = orderCreationRes.rows[0].order_id;
    console.log(`Created order with ID: ${order_id}`);

    // Update order_products table and calculate total order cost
    for await (const p of cartItems) {
      const { product_id, product_quantity, product_price } = p;

      // Add product to order_products table
      await client.query(
        'INSERT INTO order_products(order_id, product_id, product_quantity) VALUES($1, $2, $3)',
        [order_id, product_id, product_quantity]
      );

      // Increment total order cost
      total_cost += Number(product_price.substring(1)) * product_quantity;
    };

    // Update order total_cost
    const orderSummaryRes = await client.query(
      'UPDATE orders SET total_cost=$1 WHERE order_id=$2 RETURNING order_placed_time, total_cost',
      [total_cost, order_id]
    );
    const order_placed_time = orderSummaryRes.rows[0].order_placed_time;
    total_cost = orderSummaryRes.rows[0].total_cost;

    // Commit updates and return order details
    await client.query('COMMIT');
    
    console.log(`Order ${order_id} created successfully with total cost: ${total_cost}`);
    
    return {
      order_id,
      customer_id: Number(customer_id),
      address_id: address_id ? Number(address_id) : null,
      order_items: cartItems,
      order_placed_time,
      order_status,
      total_cost
    };

  } catch(err) {
    await client.query('ROLLBACK');
    console.error('Error in transaction:', err);
    throw err;

  } finally {
    client.release();
  }
};


const confirmPaidOrder = async (order_id) => {
  // Confirm an order after successful payment
  // Update order status and time; reduce product stock count; clear cart

  // Update order status and order placed time
  const status = 'processing order';
  await query(
    'UPDATE orders SET order_placed_time=(SELECT LOCALTIMESTAMP), status=$1 WHERE id=$2',
    [status, order_id]
  );  

  const order = await getOrderById(order_id);

  // https://node-postgres.com/features/transactions
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // For each order item, reduce stock count and delete cart item
    for await (const product of order.order_items) {
      const { product_id, product_quantity } = product;

      // Reduce the product's stock count
      await client.query(
        'UPDATE products SET stock_count = (stock_count - $1) WHERE id=$2',
        [product_quantity, product_id]
      );

      // Delete the product from the user's cart
      await client.query(
        'DELETE FROM cart_products WHERE customer_id=$1 AND product_id=$2',
        [order.customer_id, product_id]
      );
    };

    // Commit updates and return order details
    await client.query('COMMIT');

  } catch(err) {
    await client.query('ROLLBACK');
    throw err;

  } finally {
    client.release();
  }
};


// Orders
const getOrdersSummary = async (customer_id) => {
  const select = 'SELECT id AS order_id, order_placed_time, status AS order_status, total_cost';
  res = await query(
    `${select} FROM orders WHERE customer_id=$1 ORDER BY order_id DESC`,
    [customer_id]
  );
  return res.rows;
};

const getOrderCustomerId = async (id) => {
  const res = await query('SELECT customer_id FROM orders WHERE id=$1', [id]);
  return res.rows[0] ? res.rows[0].customer_id : undefined;
};

const getOrderStatus = async (id) => {
  const res = await query('SELECT status FROM orders WHERE id=$1', [id]);
  return res.rows[0] ? res.rows[0].status : undefined;
};

const getOrderById = async (id) => {
  const orderSelect = 'SELECT orders.id, customer_id, order_placed_time, status, total_cost';
  const orderRes = await query(
    `${orderSelect} FROM orders WHERE orders.id=$1`,
    [id]
  );

  const orderItemsSelect = 'SELECT product_id, name AS product_name, price AS product_price, product_quantity';
  const productsJoin = 'JOIN products ON order_products.product_id = products.id'
  const orderItemsRes = await query(
    `${orderItemsSelect} FROM order_products ${productsJoin} WHERE order_id=$1`,
    [id]
  );

  // Get the address information
  const addressSelect = 'SELECT house_no, locality, city, country, postcode';
  const addressRes = await query(
    `${addressSelect} FROM addresses WHERE customer_id=$1 LIMIT 1`,
    [orderRes.rows[0].customer_id]
  );

  const address = addressRes.rows.length > 0 ? 
    `${addressRes.rows[0].house_no}, ${addressRes.rows[0].locality}, ${addressRes.rows[0].city}, ${addressRes.rows[0].country}` : 
    'Address not found';
  
  const postcode = addressRes.rows.length > 0 ? addressRes.rows[0].postcode : '';

  return {
    order_id: orderRes.rows[0].id,
    customer_id: orderRes.rows[0].customer_id,
    order_items: orderItemsRes.rows,
    order_placed_time: orderRes.rows[0].order_placed_time,
    order_status: orderRes.rows[0].status,
    total_cost: orderRes.rows[0].total_cost,
    address: address,
    postcode: postcode
  };
};

const updateOrderStatus = async (id, status) => {
  await query(
    'UPDATE orders SET status=$1 WHERE id=$2',
    [status, id]
  );
  return;
};


// Reviews
const addReview = async (product_id, customer_id, rating, review) => {
  const res = await query(
    'INSERT INTO reviews(product_id, customer_id, rating, review) VALUES($1, $2, $3, $4) RETURNING id',
    [product_id, customer_id, rating, review]
  );
  
  // Update product rating
  await query(
    `UPDATE products 
     SET avg_rating = (
       SELECT AVG(rating)::decimal(3,2) 
       FROM reviews 
       WHERE product_id = $1
     ),
     rating_count = (
       SELECT COUNT(*) 
       FROM reviews 
       WHERE product_id = $1
     )
     WHERE id = $1`,
    [product_id]
  );
  
  return res.rows[0];
};

const getProductReviews = async (product_id) => {
  const res = await query(
    'SELECT r.*, c.customer_name FROM reviews r JOIN customers c ON r.customer_id = c.id WHERE r.product_id = $1 ORDER BY r.id DESC',
    [product_id]
  );
  return res.rows;
};


// Payments
const addPayment = async (order_id, coupon_code, amt_paid) => {
  const res = await query(
    'INSERT INTO payments(order_id, coupon_code, amt_paid) VALUES($1, $2, $3) RETURNING id',
    [order_id, coupon_code, amt_paid]
  );
  return res.rows[0];
};

const getOrderPayments = async (order_id) => {
  const res = await query(
    'SELECT p.*, lp.discount_amt FROM payments p LEFT JOIN loyalty_program lp ON p.coupon_code = lp.coupon_code WHERE p.order_id = $1',
    [order_id]
  );
  return res.rows;
};


// Exports
module.exports = {
  query,
  getClient,
  emailExists,
  getCustomerByEmail,
  addLocalCustomer,
  addGoogleCustomer,
  updateCustomerPassword,
  getManufacturerByEmail,
  addManufacturer,
  getLoyaltyCoupon,
  updateCustomerLoyaltyPoints,
  addPhoneNumber,
  getCustomerPhoneNumbers,
  deletePhoneNumber,
  getProducts,
  getProductById,
  getCategories,
  getCartItems,
  cartItemExists,
  addCartItem,
  deleteCartItem,
  addAddress,
  getUserAddresses,
  deleteAddress,
  createPendingOrder,
  confirmPaidOrder,
  getOrdersSummary,
  getOrderCustomerId,
  getOrderStatus,
  getOrderById,
  updateOrderStatus,
  addReview,
  getProductReviews,
  addPayment,
  getOrderPayments
};