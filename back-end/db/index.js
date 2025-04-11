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
  const baseQuery = 'SELECT id, email_address, hashed_pw, auth_method, customer_name, customer_age FROM customers';
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
        customer_age
      ) 
      VALUES($1, $2, $3, $4, $5) 
      RETURNING id, email_address, customer_name, customer_age
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
  try {
    // Check if the customer already has an entry in the customer_loyalty table
    const checkRes = await query(
      'SELECT loyalty_points FROM customer_loyalty WHERE customer_id=$1',
      [customer_id]
    );
    
    let res;
    if (checkRes.rowCount === 0) {
      // Customer doesn't have an entry yet, create one
      res = await query(
        'INSERT INTO customer_loyalty(customer_id, loyalty_points) VALUES($1, $2) RETURNING loyalty_points',
        [customer_id, points]
      );
    } else {
      // Customer already has an entry, update it
      res = await query(
        'UPDATE customer_loyalty SET loyalty_points = loyalty_points + $1 WHERE customer_id=$2 RETURNING loyalty_points',
        [points, customer_id]
      );
    }
    
    return res.rows[0].loyalty_points;
  } catch (err) {
    console.error('Error updating loyalty points:', err);
    throw err;
  }
};

const getCustomerLoyaltyPoints = async (customer_id) => {
  try {
    const res = await query(
      'SELECT loyalty_points FROM customer_loyalty WHERE customer_id=$1',
      [customer_id]
    );
    
    if (res.rowCount === 0) {
      return 0; // Customer doesn't have any loyalty points yet
    }
    
    return res.rows[0].loyalty_points;
  } catch (err) {
    console.error('Error getting loyalty points:', err);
    throw err;
  }
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
  try {
    console.log(`Getting product by ID: ${id}`);
    const numericId = parseInt(id, 10);
    
    if (isNaN(numericId)) {
      console.error(`Invalid product ID: ${id} is not a number`);
      throw new Error('Invalid product ID');
    }
    
    const baseQuery = 'SELECT id, name, price, stock_count, available_stock_count, short_description, long_description, avg_rating, rating_count, image_path, manufacturer_id FROM products';
    const res = await query(baseQuery + ' WHERE id=$1', [numericId]);
    
    if (res.rows.length === 0) {
      console.log(`No product found with ID: ${numericId}`);
      return null;
    }
    
    console.log(`Found product: ${res.rows[0].name} (ID: ${res.rows[0].id})`);
    return res.rows[0];
  } catch (err) {
    console.error('Error getting product by ID:', err);
    throw err;
  }
};


// Categories
const getCategories = async () => {
  res = await query('SELECT id, name, description, url_slug FROM categories');
  return res.rows;
};


// Cart
const getCartItems = async (customer_id) => {
  const select = 'SELECT product_id, name AS product_name, price AS product_price, quantity AS product_quantity, image_path FROM cart_products';
  const join = 'JOIN products ON cart_products.product_id = products.id';
  res = await query(`${select} ${join} WHERE customer_id=$1`, [customer_id]);
  
  // Fix for Interstellar product ID issue (ID 13 in cart but image requires ID 11)
  const correctedRows = res.rows.map(row => {
    if (row.product_name === 'Interstellar' && row.product_id === 13) {
      console.log('Fixing Interstellar product ID in cart items (13 → 11)');
      // If image_path contains the incorrect ID, fix it
      if (row.image_path && row.image_path.includes('13-interstellar')) {
        row.image_path = row.image_path.replace('13-interstellar', '11-interstellar');
      }
    }
    return row;
  });
  
  return correctedRows;
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
const createPendingOrder = async (customer_id, address_id = null, redeemPoints = false) => {
  // Create a pending order for all current cart items ahead of successful payment
  console.log(`Creating pending order: customer_id=${customer_id}, address_id=${address_id}, redeemPoints=${redeemPoints}`);

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
      'INSERT INTO orders(customer_id, address_id, status, total_cost, redeem_loyalty_points) VALUES($1, $2, $3, $4, $5) RETURNING order_id' :
      'INSERT INTO orders(customer_id, status, total_cost, redeem_loyalty_points) VALUES($1, $2, $3, $4) RETURNING order_id';
    
    const orderParams = address_id ? 
      [customer_id, address_id, order_status, total_cost, redeemPoints] :
      [customer_id, order_status, total_cost, redeemPoints];
    
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

    // If redeeming loyalty points, get current points and apply discount
    let final_cost = total_cost;
    let points_redeemed = 0;
    
    if (redeemPoints) {
      // Get current loyalty points
      const loyaltyRes = await client.query(
        'SELECT loyalty_points FROM customer_loyalty WHERE customer_id=$1',
        [customer_id]
      );
      
      const loyalty_pts = loyaltyRes.rows.length > 0 ? loyaltyRes.rows[0].loyalty_points : 0;
      console.log(`Customer has ${loyalty_pts} loyalty points`);
      
      // Calculate points to redeem (1 point = $1 discount)
      points_redeemed = Math.min(loyalty_pts, total_cost);
      
      if (points_redeemed > 0) {
        // Apply discount
        final_cost = total_cost - points_redeemed;
        
        // Update the order with discount details
        await client.query(
          'UPDATE orders SET discounted_cost=$1, points_redeemed=$2 WHERE order_id=$3',
          [final_cost, points_redeemed, order_id]
        );
        
        console.log(`Applied ${points_redeemed} points discount. Final cost: ${final_cost}`);
      }
    }

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
      total_cost,
      final_cost: redeemPoints ? final_cost : total_cost,
      points_redeemed: redeemPoints ? points_redeemed : 0
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
  // Update order status and time; reduce product stock count; add loyalty points

  console.log(`Confirming order with ID: ${order_id}`);

  // https://node-postgres.com/features/transactions
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    // Update order status and order placed time
    const status = 'processing order';
    await client.query(
      'UPDATE orders SET order_placed_time=(SELECT LOCALTIMESTAMP), status=$1 WHERE order_id=$2',
      [status, order_id]
    );
    console.log(`Updated order status to ${status}`);

    // Get order details
    const orderRes = await client.query(
      'SELECT customer_id, total_cost, redeem_loyalty_points, points_redeemed FROM orders WHERE order_id=$1',
      [order_id]
    );
    
    if (orderRes.rows.length === 0) {
      throw new Error(`Order with ID ${order_id} not found`);
    }
    
    const { customer_id, total_cost, redeem_loyalty_points, points_redeemed } = orderRes.rows[0];
    console.log(`Retrieved order details: customer_id=${customer_id}, total_cost=${total_cost}, redeem_loyalty_points=${redeem_loyalty_points}, points_redeemed=${points_redeemed}`);
    
    // Get order items
    const orderItemsRes = await client.query(
      'SELECT op.product_id, op.product_quantity, p.name, p.price FROM order_products op JOIN products p ON op.product_id = p.id WHERE op.order_id=$1',
      [order_id]
    );
    
    const order_items = orderItemsRes.rows;
    console.log(`Found ${order_items.length} items in order`);

    // For each order item, reduce stock count
    for await (const product of order_items) {
      const { product_id, product_quantity } = product;
      console.log(`Processing product ID ${product_id}, quantity: ${product_quantity}`);

      // Reduce the product's stock count
      await client.query(
        'UPDATE products SET available_stock_count = (available_stock_count - $1) WHERE id=$2',
        [product_quantity, product_id]
      );
      console.log(`Updated stock for product ID ${product_id}`);
    };
    
    try {
      // Handle loyalty points
      if (redeem_loyalty_points && points_redeemed > 0) {
        console.log(`Customer ${customer_id} is redeeming ${points_redeemed} loyalty points`);
        
        // Check current loyalty points
        const currentPointsRes = await client.query(
          'SELECT loyalty_points FROM customer_loyalty WHERE customer_id=$1',
          [customer_id]
        );
        
        const currentPoints = currentPointsRes.rowCount > 0 ? currentPointsRes.rows[0].loyalty_points : 0;
        console.log(`Customer ${customer_id} current loyalty points: ${currentPoints}`);
        
        if (currentPointsRes.rowCount === 0) {
          console.log(`Customer ${customer_id} doesn't have a loyalty record yet, creating one`);
          // Customer doesn't have loyalty record yet, create one with 0 points
          await client.query(
            'INSERT INTO customer_loyalty(customer_id, loyalty_points) VALUES($1, $2)',
            [customer_id, 0]
          );
        } else if (currentPoints < points_redeemed) {
          console.log(`Warning: Customer ${customer_id} doesn't have enough points (${currentPoints}) to redeem ${points_redeemed} points`);
          // Adjust points_redeemed to current points
          points_redeemed = currentPoints;
        }
        
        if (points_redeemed > 0) {
          // Deduct redeemed points from customer
          await client.query(
            'UPDATE customer_loyalty SET loyalty_points = loyalty_points - $1 WHERE customer_id=$2 RETURNING loyalty_points',
            [points_redeemed, customer_id]
          );
          console.log(`Deducted ${points_redeemed} loyalty points from customer ${customer_id}`);
        }
      }
      
      // Add new loyalty points based on order total (10% of total)
      const new_loyalty_points = Math.floor(parseFloat(total_cost) * 0.1);
      console.log(`Calculated new loyalty points: ${new_loyalty_points} (10% of ${total_cost})`);
      
      if (new_loyalty_points > 0) {
        // Check if customer has a loyalty record
        const checkRes = await client.query(
          'SELECT loyalty_points FROM customer_loyalty WHERE customer_id=$1',
          [customer_id]
        );
        
        if (checkRes.rowCount === 0) {
          // Create new record
          const insertRes = await client.query(
            'INSERT INTO customer_loyalty(customer_id, loyalty_points) VALUES($1, $2) RETURNING loyalty_points',
            [customer_id, new_loyalty_points]
          );
          console.log(`Created new loyalty record for customer ${customer_id} with ${new_loyalty_points} points. New balance: ${insertRes.rows[0].loyalty_points}`);
        } else {
          // Update existing record
          const updateRes = await client.query(
            'UPDATE customer_loyalty SET loyalty_points = loyalty_points + $1 WHERE customer_id=$2 RETURNING loyalty_points',
            [new_loyalty_points, customer_id]
          );
          console.log(`Updated loyalty points for customer ${customer_id} by adding ${new_loyalty_points} points. New balance: ${updateRes.rows[0].loyalty_points}`);
        }
      }
    } catch (loyaltyErr) {
      console.error('Error processing loyalty points:', loyaltyErr);
      // Continue with order confirmation even if loyalty points fail
    }

    // Commit updates
    await client.query('COMMIT');
    console.log(`Transaction committed successfully for order ${order_id}`);
    
    // Return full order details for response
    const order = await getOrderById(order_id);
    return order;
    
  } catch(err) {
    await client.query('ROLLBACK');
    console.error('Error in transaction, rolling back:', err);
    throw err;
  } finally {
    client.release();
    console.log(`Database client released for order ${order_id}`);
  }
};


// Orders
const getOrdersSummary = async (customer_id) => {
  try {
    console.log(`Fetching orders summary for customer ID: ${customer_id}`);
    
    // Get all orders for this customer
    const baseSelect = `
      SELECT 
        o.order_id, 
        o.order_placed_time, 
        o.status AS order_status, 
        o.total_cost
      FROM orders o
      WHERE o.customer_id = $1
      ORDER BY o.order_placed_time DESC
    `;
    
    const orderRes = await query(baseSelect, [customer_id]);
    console.log(`Found ${orderRes.rows.length} orders for customer ${customer_id}`);
    
    // Process each order to ensure correct totals
    const formattedOrders = await Promise.all(orderRes.rows.map(async (order) => {
      let orderTotal = parseFloat(order.total_cost);
      if (isNaN(orderTotal) || orderTotal < 1) {
        console.log(`Order ${order.order_id} has invalid total: ${order.total_cost}. Recalculating...`);
        
        // Get the order items to calculate the total
        const itemsQuery = `
          SELECT op.product_quantity, p.price AS product_price
          FROM order_products op
          JOIN products p ON op.product_id = p.id
          WHERE op.order_id = $1
        `;
        
        try {
          const itemsRes = await query(itemsQuery, [order.order_id]);
          
          // Calculate total from items
          orderTotal = itemsRes.rows.reduce((sum, item) => {
            const price = parseFloat(String(item.product_price).replace(/[^0-9.-]+/g, ''));
            const quantity = parseInt(item.product_quantity);
            
            if (!isNaN(price) && !isNaN(quantity)) {
              return sum + (price * quantity);
            }
            return sum;
          }, 0);
          
          console.log(`Recalculated total for order ${order.order_id}: ${orderTotal}`);
          
          // Update the order in the database
          try {
            await query(
              'UPDATE orders SET total_cost = $1 WHERE order_id = $2',
              [orderTotal, order.order_id]
            );
            console.log(`Updated order ${order.order_id} with correct total: ${orderTotal}`);
          } catch (updateErr) {
            console.error(`Error updating order total:`, updateErr);
          }
        } catch (itemsErr) {
          console.error(`Error fetching order items:`, itemsErr);
        }
      }
      
      return {
        order_id: parseInt(order.order_id),
        order_placed_time: order.order_placed_time,
        order_status: order.order_status,
        total_cost: orderTotal.toFixed(2)
      };
    }));
    
    console.log('Final formatted orders:', formattedOrders);
    return formattedOrders;
  } catch (err) {
    console.error('Error retrieving orders summary:', err);
    throw err;
  }
};

const getOrderCustomerId = async (id) => {
  const res = await query('SELECT customer_id FROM orders WHERE order_id=$1', [id]);
  return res.rows[0] ? res.rows[0].customer_id : undefined;
};

const getOrderStatus = async (id) => {
  const res = await query('SELECT status FROM orders WHERE order_id=$1', [id]);
  return res.rows[0] ? res.rows[0].status : undefined;
};

const getOrderById = async (id) => {
  const orderSelect = 'SELECT orders.order_id, customer_id, order_placed_time, status, total_cost, address_id, redeem_loyalty_points, points_redeemed, discounted_cost';
  const orderRes = await query(
    `${orderSelect} FROM orders WHERE orders.order_id=$1`,
    [id]
  );

  if (!orderRes.rows.length) {
    throw new Error(`Order with ID ${id} not found`);
  }

  const orderItemsSelect = 'SELECT product_id, name AS product_name, price AS product_price, product_quantity, image_path';
  const productsJoin = 'JOIN products ON order_products.product_id = products.id'
  const orderItemsRes = await query(
    `${orderItemsSelect} FROM order_products ${productsJoin} WHERE order_id=$1`,
    [id]
  );
  
  // Fix for Interstellar product ID issue (ID 13 in orders but image requires ID 11)
  const correctedOrderItems = orderItemsRes.rows.map(row => {
    if (row.product_name === 'Interstellar' && row.product_id === 13) {
      console.log('Fixing Interstellar product ID in order items (13 → 11)');
      // If image_path contains the incorrect ID, fix it
      if (row.image_path && row.image_path.includes('13-interstellar')) {
        row.image_path = row.image_path.replace('13-interstellar', '11-interstellar');
      }
    }
    return row;
  });

  // Get the address information - use address_id from orders if available
  const address_id = orderRes.rows[0].address_id;
  let address = 'Address not found';
  let postcode = '';
  
  if (address_id) {
    const addressSelect = 'SELECT house_no, locality, city, country, postcode';
    const addressRes = await query(
      `${addressSelect} FROM addresses WHERE address_id=$1`,
      [address_id]
    );
    
    if (addressRes.rows.length > 0) {
      address = `${addressRes.rows[0].house_no}, ${addressRes.rows[0].locality}, ${addressRes.rows[0].city}, ${addressRes.rows[0].country}`;
      postcode = addressRes.rows[0].postcode;
    }
  }
  
  // Get the database total cost
  let totalCost = 0;
  try {
    totalCost = parseFloat(orderRes.rows[0].total_cost);
    if (isNaN(totalCost)) totalCost = 0;
  } catch (e) {
    console.error(`Error parsing total_cost for order ${id}:`, e);
  }
  
  // If the total cost is 0 or very small, recalculate it from items
  if (totalCost < 1) {
    console.log(`Recalculating total cost for order ${id} as stored value is ${totalCost}`);
    
    // Calculate the total from the order items
    totalCost = correctedOrderItems.reduce((sum, item) => {
      // Extract numeric price from string (remove currency symbols)
      const itemPrice = parseFloat(String(item.product_price).replace(/[^0-9.-]+/g, ''));
      const quantity = parseInt(item.product_quantity);
      
      if (!isNaN(itemPrice) && !isNaN(quantity)) {
        return sum + (itemPrice * quantity);
      }
      return sum;
    }, 0);
    
    console.log(`Recalculated total for order ${id}: ${totalCost}`);
    
    // Update the order in the database with the corrected total
    try {
      await query(
        'UPDATE orders SET total_cost = $1 WHERE order_id = $2',
        [totalCost, id]
      );
      console.log(`Updated order ${id} with corrected total cost ${totalCost}`);
    } catch (err) {
      console.error(`Failed to update order total cost:`, err);
    }
  }

  return {
    order_id: orderRes.rows[0].order_id,
    customer_id: orderRes.rows[0].customer_id,
    order_items: correctedOrderItems,
    order_placed_time: orderRes.rows[0].order_placed_time,
    order_status: orderRes.rows[0].status,
    total_cost: totalCost.toFixed(2),
    address: address,
    postcode: postcode,
    redeem_loyalty_points: orderRes.rows[0].redeem_loyalty_points,
    points_redeemed: orderRes.rows[0].points_redeemed,
    discounted_cost: orderRes.rows[0].discounted_cost
  };
};

const updateOrderStatus = async (id, status) => {
  await query(
    'UPDATE orders SET status=$1 WHERE order_id=$2',
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

// Add the new clearCart function here
const clearCart = async (customer_id) => {
  console.log(`Clearing cart for customer_id: ${customer_id}`);
  await query(
    'DELETE FROM cart_products WHERE customer_id = $1',
    [customer_id]
  );
  console.log(`Cart cleared for customer_id: ${customer_id}`);
};

// Import manufacturer functions
const manufacturerDb = require('./manufacturer');

// Export all database functions
module.exports = {
  // Core functionality
  getClient,
  query,
  
  // Auth and user management
  emailExists,
  getCustomerByEmail,
  addLocalCustomer,
  addGoogleCustomer,
  updateCustomerPassword,
  getManufacturerByEmail,
  addManufacturer,
  
  // Products and categories
  getProducts,
  getProductById,
  getCategories,
  
  // Cart functions
  getCartItems,
  cartItemExists,
  addCartItem,
  deleteCartItem,
  clearCart,
  
  // Address management
  addAddress,
  getUserAddresses,
  deleteAddress,
  
  // Order management
  createPendingOrder,
  confirmPaidOrder,
  getOrdersSummary,
  getOrderCustomerId,
  getOrderStatus,
  getOrderById,
  updateOrderStatus,
  
  // Reviews
  addReview,
  getProductReviews,
  
  // Payments
  addPayment,
  getOrderPayments,
  
  // Loyalty program
  getLoyaltyCoupon,
  updateCustomerLoyaltyPoints,
  getCustomerLoyaltyPoints,
  
  // Phone numbers
  addPhoneNumber,
  getCustomerPhoneNumbers,
  deletePhoneNumber,
  
  // Include all manufacturer functions
  ...manufacturerDb
};

const deleteProduct = async (productId) => {
  try {
    console.log(`Starting deleteProduct transaction for product ID: ${productId}`);
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');
      console.log('Transaction BEGIN');
      
      // Get manufacturer_id for updating product count
      const productRes = await client.query(
        'SELECT manufacturer_id FROM products WHERE id = $1',
        [productId]
      );
      
      if (productRes.rows.length === 0) {
        throw new Error(`Product with ID ${productId} not found`);
      }
      
      const manufacturerId = productRes.rows[0].manufacturer_id;
      console.log(`Found product with manufacturer ID: ${manufacturerId}`);
      
      // Remove product categories
      console.log(`Removing product categories for product ID: ${productId}`);
      const catResult = await client.query(
        'DELETE FROM product_categories WHERE product_id = $1 RETURNING product_id',
        [productId]
      );
      console.log(`Removed ${catResult.rowCount} category associations`);
      
      // Remove product reviews
      console.log(`Removing product reviews for product ID: ${productId}`);
      const reviewResult = await client.query(
        'DELETE FROM reviews WHERE product_id = $1 RETURNING id',
        [productId]
      );
      console.log(`Removed ${reviewResult.rowCount} reviews`);
      
      // Check for order items with this product and handle appropriately
      const orderItemsCheck = await client.query(
        'SELECT COUNT(*) FROM order_items WHERE product_id = $1',
        [productId]
      );
      
      if (parseInt(orderItemsCheck.rows[0].count) > 0) {
        console.log(`Product ${productId} is used in orders, marking as inactive instead of deleting`);
        // Instead of deleting, just mark the product as inactive or archived
        await client.query(
          'UPDATE products SET active = false WHERE id = $1',
          [productId]
        );
      } else {
        // Delete the product if not used in any orders
        console.log(`Deleting product ID: ${productId}`);
        const deleteResult = await client.query(
          'DELETE FROM products WHERE id = $1 RETURNING id',
          [productId]
        );
        console.log(`Product deletion result: ${deleteResult.rowCount} rows affected`);
      }
      
      // Decrement manufacturer's product count
      console.log(`Updating product count for manufacturer ID: ${manufacturerId}`);
      await client.query(
        'UPDATE manufacturers SET no_of_products = GREATEST(no_of_products - 1, 0) WHERE id = $1',
        [manufacturerId]
      );
      
      await client.query('COMMIT');
      console.log('Transaction COMMIT successful');
      
      return true;
    } catch (err) {
      await client.query('ROLLBACK');
      console.error('Error in transaction, ROLLBACK executed:', err);
      throw err;
    } finally {
      client.release();
      console.log('Client released');
    }
  } catch (err) {
    console.error('Error deleting product:', err);
    throw err;
  }
};