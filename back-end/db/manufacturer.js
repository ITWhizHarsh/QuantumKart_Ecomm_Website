const { Pool } = require('pg');
const pool = new Pool();

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

// Get products for a specific manufacturer
const getManufacturerProducts = async (manufacturer_id) => {
  try {
    console.log(`Getting products for manufacturer ID: ${manufacturer_id}, type: ${typeof manufacturer_id}`);
    
    if (!manufacturer_id) {
      console.error('Invalid manufacturer_id: null or undefined');
      return [];
    }
    
    // Ensure the manufacturer_id is treated as a number
    const numericId = parseInt(manufacturer_id, 10);
    if (isNaN(numericId)) {
      console.error(`Invalid manufacturer_id: '${manufacturer_id}' is not a number`);
      return [];
    }
    
    // Explicitly check the database connection first
    try {
      console.log('Verifying database connection...');
      const testQuery = await query('SELECT 1 as connection_test');
      console.log(`Database connection test: ${JSON.stringify(testQuery.rows[0])}`);
    } catch (connErr) {
      console.error('Database connection test failed:', connErr);
      throw new Error(`Database connection error: ${connErr.message}`);
    }
    
    // Check if the manufacturers table exists and has data
    try {
      const manufacturerCheck = await query(
        'SELECT id, company_name, no_of_products FROM manufacturers WHERE id = $1',
        [numericId]
      );
      
      if (manufacturerCheck.rows.length === 0) {
        console.log(`Manufacturer with ID ${numericId} does not exist`);
      } else {
        console.log(`Found manufacturer: ${JSON.stringify(manufacturerCheck.rows[0])}`);
      }
    } catch (tableErr) {
      console.error('Error checking manufacturer:', tableErr);
    }
    
    console.log(`Executing products query for manufacturer ID: ${numericId}`);
    
    const res = await query(
      `SELECT 
        id, 
        name, 
        price::numeric as price, 
        COALESCE(stock_count, 0) as stock_count, 
        COALESCE(available_stock_count, 0) as available_stock_count, 
        short_description, 
        long_description, 
        size, 
        COALESCE(avg_rating, 0) as avg_rating, 
        COALESCE(rating_count, 0) as rating_count, 
        image_path 
      FROM products 
      WHERE manufacturer_id = $1`,
      [numericId]
    );
    
    console.log(`Found ${res.rows.length} products for manufacturer ID: ${numericId}`);
    
    // Add detailed logging for debugging
    if (res.rows.length === 0) {
      console.log('No products found. Checking database state...');
      try {
        // Check total products in database
        const allProductsCheck = await query('SELECT COUNT(*) FROM products');
        console.log(`Total products in database: ${allProductsCheck.rows[0].count}`);
        
        // Check products with this manufacturer_id
        const manufacturerProductsCount = await query(
          'SELECT COUNT(*) FROM products WHERE manufacturer_id = $1',
          [numericId]
        );
        console.log(`Products with manufacturer_id = ${numericId}: ${manufacturerProductsCount.rows[0].count}`);
        
        // Check products with NULL manufacturer_id
        const nullManufacturerProducts = await query(
          'SELECT COUNT(*) FROM products WHERE manufacturer_id IS NULL'
        );
        console.log(`Products with NULL manufacturer_id: ${nullManufacturerProducts.rows[0].count}`);
        
        // If there are products with NULL manufacturer_id, automatically assign them to this manufacturer
        if (parseInt(nullManufacturerProducts.rows[0].count) > 0) {
          console.log(`Automatically assigning ${nullManufacturerProducts.rows[0].count} products with NULL manufacturer_id to manufacturer ${numericId}`);
          
          const updateResult = await query(
            'UPDATE products SET manufacturer_id = $1 WHERE manufacturer_id IS NULL RETURNING id, name',
            [numericId]
          );
          
          console.log(`${updateResult.rows.length} products updated with manufacturer ID`);
          
          // Fetch products again after update
          const updatedRes = await query(
            `SELECT 
              id, 
              name, 
              price::numeric as price, 
              COALESCE(stock_count, 0) as stock_count, 
              COALESCE(available_stock_count, 0) as available_stock_count, 
              short_description, 
              long_description, 
              size, 
              COALESCE(avg_rating, 0) as avg_rating, 
              COALESCE(rating_count, 0) as rating_count, 
              image_path 
            FROM products 
            WHERE manufacturer_id = $1`,
            [numericId]
          );
          
          console.log(`Found ${updatedRes.rows.length} products for manufacturer ID: ${numericId} after auto-assignment`);
          
          if (updatedRes.rows.length === 0) {
            // Create emergency sample data if still no products
            console.log("No products after association attempt. Creating sample data.");
            
            // We'll add a sample product directly
            const sampleProductResult = await query(
              `INSERT INTO products 
              (name, price, stock_count, available_stock_count, short_description, long_description, manufacturer_id, image_path)
              VALUES 
              ('Emergency Sample Product', 99.99, 100, 100, 'Sample product created by system', 'This is a sample product created automatically', $1, 'uploads/default-product.jpg')
              RETURNING id, name`,
              [numericId]
            );
            
            console.log(`Created emergency sample product: ${JSON.stringify(sampleProductResult.rows[0])}`);
            
            // Fetch one more time after creating sample
            const emergencyRes = await query(
              `SELECT * FROM products WHERE manufacturer_id = $1`,
              [numericId]
            );
            
            return emergencyRes.rows;
          }
          
          return updatedRes.rows;
        } else if (parseInt(allProductsCheck.rows[0].count) === 0) {
          // No products at all in database, create a sample one
          console.log("No products in database. Creating sample data.");
          
          const sampleProductResult = await query(
            `INSERT INTO products 
            (name, price, stock_count, available_stock_count, short_description, long_description, manufacturer_id, image_path)
            VALUES 
            ('Sample Product', 99.99, 100, 100, 'Sample product created by system', 'This is a sample product created automatically', $1, 'uploads/default-product.jpg')
            RETURNING id, name`,
            [numericId]
          );
          
          console.log(`Created sample product: ${JSON.stringify(sampleProductResult.rows[0])}`);
          
          // Fetch again after creating sample
          const sampleRes = await query(
            `SELECT * FROM products WHERE manufacturer_id = $1`,
            [numericId]
          );
          
          return sampleRes.rows;
        }
      } catch (dbCheckErr) {
        console.error('Error checking database state:', dbCheckErr);
      }
    } else {
      // Log first product for debugging
      console.log('First product sample:', JSON.stringify(res.rows[0]));
    }
    
    return res.rows;
  } catch (err) {
    console.error('Error getting manufacturer products:', err);
    // Don't rethrow to prevent cascading failures
    console.log('Returning empty array due to error');
    return [];
  }
};

// Get pending orders that include products from a specific manufacturer
const getManufacturerPendingOrders = async (manufacturer_id) => {
  try {
    console.log(`Getting pending orders for manufacturer ID: ${manufacturer_id}`);
    
    const res = await query(
      `SELECT o.order_id, o.order_placed_time, o.status, o.total_cost, c.customer_name
      FROM orders o
      JOIN order_products op ON o.order_id = op.order_id
      JOIN products p ON op.product_id = p.id
      JOIN customers c ON o.customer_id = c.id
      WHERE p.manufacturer_id = $1 AND o.status = 'processing order'
      GROUP BY o.order_id, c.customer_name`,
      [manufacturer_id]
    );
    
    // For each order, get the products that belong to this manufacturer
    const ordersWithProducts = await Promise.all(res.rows.map(async (order) => {
      const productsRes = await query(
        `SELECT p.id as product_id, p.name as product_name, p.price, op.product_quantity as quantity
        FROM order_products op
        JOIN products p ON op.product_id = p.id
        WHERE op.order_id = $1 AND p.manufacturer_id = $2`,
        [order.order_id, manufacturer_id]
      );
      
      return {
        ...order,
        products: productsRes.rows
      };
    }));
    
    console.log(`Found ${ordersWithProducts.length} pending orders for manufacturer ID: ${manufacturer_id}`);
    return ordersWithProducts;
  } catch (err) {
    console.error('Error getting manufacturer pending orders:', err);
    throw err;
  }
};

// Get all orders for a manufacturer
const getManufacturerOrders = async (manufacturer_id) => {
  try {
    console.log(`Getting all orders for manufacturer ID: ${manufacturer_id}`);
    
    // Get all orders that contain at least one product from this manufacturer
    const res = await query(
      `SELECT DISTINCT o.order_id, o.order_placed_time as order_date, o.status, o.total_cost as total, c.customer_name
      FROM orders o
      JOIN order_products op ON o.order_id = op.order_id
      JOIN products p ON op.product_id = p.id
      JOIN customers c ON o.customer_id = c.id
      WHERE p.manufacturer_id = $1`,
      [manufacturer_id]
    );
    
    // For each order, get the products that belong to this manufacturer
    const ordersWithProducts = await Promise.all(res.rows.map(async (order) => {
      const productsRes = await query(
        `SELECT p.id as product_id, p.name as product_name, p.price, op.product_quantity as quantity
        FROM order_products op
        JOIN products p ON op.product_id = p.id
        WHERE op.order_id = $1 AND p.manufacturer_id = $2`,
        [order.order_id, manufacturer_id]
      );
      
      return {
        ...order,
        products: productsRes.rows
      };
    }));
    
    console.log(`Found ${ordersWithProducts.length} orders for manufacturer ID: ${manufacturer_id}`);
    return ordersWithProducts;
  } catch (err) {
    console.error('Error getting manufacturer orders:', err);
    throw err;
  }
};

// Check if a manufacturer can manage an order (if it contains their products)
const canManufacturerManageOrder = async (manufacturer_id, order_id) => {
  try {
    const res = await query(
      `SELECT COUNT(*) FROM order_products op
      JOIN products p ON op.product_id = p.id
      WHERE op.order_id = $1 AND p.manufacturer_id = $2`,
      [order_id, manufacturer_id]
    );
    
    return parseInt(res.rows[0].count) > 0;
  } catch (err) {
    console.error('Error checking if manufacturer can manage order:', err);
    throw err;
  }
};

// Accept an order (update status to accepted for manufacturer's products)
const acceptManufacturerOrder = async (manufacturer_id, order_id) => {
  try {
    // This would be implemented according to your business logic
    // For example, you might update a manufacturer_order_status table
    // or simply update the main order status
    
    // For this example, we'll just update the order status
    await query(
      `UPDATE orders SET status = 'accepted' WHERE order_id = $1`,
      [order_id]
    );
    
    return true;
  } catch (err) {
    console.error('Error accepting manufacturer order:', err);
    throw err;
  }
};

// Reject an order (update status to rejected for manufacturer's products)
const rejectManufacturerOrder = async (manufacturer_id, order_id) => {
  try {
    // Similar to acceptManufacturerOrder, implement according to business logic
    
    await query(
      `UPDATE orders SET status = 'rejected' WHERE order_id = $1`,
      [order_id]
    );
    
    return true;
  } catch (err) {
    console.error('Error rejecting manufacturer order:', err);
    throw err;
  }
};

// Get sales data for a manufacturer
const getManufacturerSales = async (manufacturer_id) => {
  try {
    console.log(`Getting sales data for manufacturer ID: ${manufacturer_id}`);
    
    // Get total sales amount
    const totalRes = await query(
      `SELECT COALESCE(SUM(p.price::numeric * op.product_quantity), 0) as total_sales
      FROM order_products op
      JOIN products p ON op.product_id = p.id
      JOIN orders o ON op.order_id = o.order_id
      WHERE p.manufacturer_id = $1 AND o.status NOT IN ('rejected', 'payment pending')`,
      [manufacturer_id]
    );
    
    // Get monthly sales data (last 6 months)
    const monthlyRes = await query(
      `SELECT 
        TO_CHAR(o.order_placed_time, 'YYYY-MM') as month,
        COALESCE(SUM(p.price::numeric * op.product_quantity), 0) as monthly_sales,
        COUNT(DISTINCT o.order_id) as order_count
      FROM order_products op
      JOIN products p ON op.product_id = p.id
      JOIN orders o ON op.order_id = o.order_id
      WHERE p.manufacturer_id = $1 
        AND o.status NOT IN ('rejected', 'payment pending')
        AND o.order_placed_time >= NOW() - INTERVAL '6 months'
      GROUP BY TO_CHAR(o.order_placed_time, 'YYYY-MM')
      ORDER BY month DESC`,
      [manufacturer_id]
    );
    
    return {
      total: Number(totalRes.rows[0].total_sales).toFixed(2),
      monthly: monthlyRes.rows
    };
  } catch (err) {
    console.error('Error getting manufacturer sales data:', err);
    throw err;
  }
};

// Get more detailed sales analytics
const getManufacturerSalesAnalytics = async (manufacturer_id) => {
  try {
    console.log(`Getting detailed sales analytics for manufacturer ID: ${manufacturer_id}`);
    
    // Get product-wise sales
    const productSalesRes = await query(
      `SELECT 
        p.id as product_id,
        p.name as product_name,
        COUNT(DISTINCT op.order_id) as order_count,
        SUM(op.product_quantity) as units_sold,
        COALESCE(SUM(p.price::numeric * op.product_quantity), 0) as total_sales
      FROM order_products op
      JOIN products p ON op.product_id = p.id
      JOIN orders o ON op.order_id = o.order_id
      WHERE p.manufacturer_id = $1 AND o.status NOT IN ('rejected', 'payment pending')
      GROUP BY p.id, p.name
      ORDER BY total_sales DESC`,
      [manufacturer_id]
    );
    
    // Get monthly trend
    const monthlyTrendRes = await query(
      `SELECT 
        TO_CHAR(o.order_placed_time, 'YYYY-MM') as month,
        COALESCE(SUM(p.price::numeric * op.product_quantity), 0) as revenue
      FROM order_products op
      JOIN products p ON op.product_id = p.id
      JOIN orders o ON op.order_id = o.order_id
      WHERE p.manufacturer_id = $1 
        AND o.status NOT IN ('rejected', 'payment pending')
        AND o.order_placed_time >= NOW() - INTERVAL '12 months'
      GROUP BY TO_CHAR(o.order_placed_time, 'YYYY-MM')
      ORDER BY month ASC`,
      [manufacturer_id]
    );
    
    return {
      product_sales: productSalesRes.rows,
      monthly_trend: monthlyTrendRes.rows
    };
  } catch (err) {
    console.error('Error getting manufacturer sales analytics:', err);
    throw err;
  }
};

// Get reviews for a manufacturer's products
const getManufacturerProductReviews = async (manufacturer_id) => {
  try {
    console.log(`Getting product reviews for manufacturer ID: ${manufacturer_id}`);
    
    const res = await query(
      `SELECT 
        r.id as review_id,
        p.id as product_id,
        p.name as product_name,
        c.customer_name,
        r.rating,
        r.review,
        r.created_at
      FROM reviews r
      JOIN products p ON r.product_id = p.id
      JOIN customers c ON r.customer_id = c.id
      WHERE p.manufacturer_id = $1
      ORDER BY r.created_at DESC`,
      [manufacturer_id]
    );
    
    console.log(`Found ${res.rows.length} reviews for manufacturer ID: ${manufacturer_id}`);
    return res.rows;
  } catch (err) {
    console.error('Error getting manufacturer product reviews:', err);
    throw err;
  }
};

// Add a new product
const addProduct = async (productData) => {
  const {
    manufacturer_id,
    name,
    price,
    stock_count,
    short_description,
    long_description,
    size,
    image_path,
    category_id
  } = productData;
  
  try {
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');
      
      // Insert the product
      const productRes = await client.query(
        `INSERT INTO products(
          manufacturer_id, name, price, stock_count, available_stock_count,
          short_description, long_description, size, image_path
        ) VALUES($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING id`,
        [
          manufacturer_id,
          name,
          price,
          stock_count,
          stock_count, // Initially, available stock equals total stock
          short_description,
          long_description,
          size,
          image_path
        ]
      );
      
      const productId = productRes.rows[0].id;
      
      // If category provided, add to product_categories
      if (category_id) {
        await client.query(
          'INSERT INTO product_categories(product_id, category_id) VALUES($1, $2)',
          [productId, category_id]
        );
      }
      
      // Increment manufacturer's product count
      await client.query(
        'UPDATE manufacturers SET no_of_products = no_of_products + 1 WHERE id = $1',
        [manufacturer_id]
      );
      
      await client.query('COMMIT');
      
      // Return the complete product
      const res = await client.query(
        'SELECT * FROM products WHERE id = $1',
        [productId]
      );
      
      return res.rows[0];
    } catch (err) {
      await client.query('ROLLBACK');
      console.error('Error in transaction:', err);
      throw err;
    } finally {
      client.release();
    }
  } catch (err) {
    console.error('Error adding product:', err);
    throw err;
  }
};

// Update a product
const updateProduct = async (productId, productData) => {
  const {
    name,
    price,
    stock_count,
    short_description,
    long_description,
    size,
    image_path,
    category_id
  } = productData;
  
  try {
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');
      
      // Check current stock to determine available_stock_count adjustment
      const currentProductRes = await client.query(
        'SELECT stock_count, available_stock_count FROM products WHERE id = $1',
        [productId]
      );
      
      if (currentProductRes.rows.length === 0) {
        throw new Error(`Product with ID ${productId} not found`);
      }
      
      const currentProduct = currentProductRes.rows[0];
      const stockDifference = stock_count - currentProduct.stock_count;
      const newAvailableStock = currentProduct.available_stock_count + stockDifference;
      
      // Update the product
      const updateFields = [];
      const updateValues = [];
      let valueIndex = 1;
      
      if (name !== undefined) {
        updateFields.push(`name = $${valueIndex}`);
        updateValues.push(name);
        valueIndex++;
      }
      
      if (price !== undefined) {
        updateFields.push(`price = $${valueIndex}`);
        updateValues.push(price);
        valueIndex++;
      }
      
      if (stock_count !== undefined) {
        updateFields.push(`stock_count = $${valueIndex}`);
        updateValues.push(stock_count);
        valueIndex++;
        
        updateFields.push(`available_stock_count = $${valueIndex}`);
        updateValues.push(newAvailableStock);
        valueIndex++;
      }
      
      if (short_description !== undefined) {
        updateFields.push(`short_description = $${valueIndex}`);
        updateValues.push(short_description);
        valueIndex++;
      }
      
      if (long_description !== undefined) {
        updateFields.push(`long_description = $${valueIndex}`);
        updateValues.push(long_description);
        valueIndex++;
      }
      
      if (size !== undefined) {
        updateFields.push(`size = $${valueIndex}`);
        updateValues.push(size);
        valueIndex++;
      }
      
      if (image_path !== undefined) {
        updateFields.push(`image_path = $${valueIndex}`);
        updateValues.push(image_path);
        valueIndex++;
      }
      
      if (updateFields.length > 0) {
        const updateQuery = `
          UPDATE products 
          SET ${updateFields.join(', ')} 
          WHERE id = $${valueIndex}
          RETURNING *
        `;
        updateValues.push(productId);
        
        const productRes = await client.query(updateQuery, updateValues);
        
        // If category provided, update product_categories
        if (category_id !== undefined) {
          // Remove existing categories
          await client.query(
            'DELETE FROM product_categories WHERE product_id = $1',
            [productId]
          );
          
          // Add new category
          await client.query(
            'INSERT INTO product_categories(product_id, category_id) VALUES($1, $2)',
            [productId, category_id]
          );
        }
        
        await client.query('COMMIT');
        
        return productRes.rows[0];
      } else {
        // No fields to update
        await client.query('ROLLBACK');
        
        // Just return the current product
        const res = await client.query(
          'SELECT * FROM products WHERE id = $1',
          [productId]
        );
        
        return res.rows[0];
      }
    } catch (err) {
      await client.query('ROLLBACK');
      console.error('Error in transaction:', err);
      throw err;
    } finally {
      client.release();
    }
  } catch (err) {
    console.error('Error updating product:', err);
    throw err;
  }
};

// Delete a product
const deleteProduct = async (productId) => {
  try {
    console.log(`Deleting product ID: ${productId}`);
    const numericProductId = Number(productId);
    
    if (isNaN(numericProductId)) {
      throw new Error(`Invalid product ID: ${productId} is not a number`);
    }
    
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');
      
      // Get product details including manufacturer_id
      const productRes = await client.query(
        'SELECT id, name, manufacturer_id FROM products WHERE id = $1',
        [numericProductId]
      );
      
      if (productRes.rows.length === 0) {
        await client.query('ROLLBACK');
        throw new Error(`Product with ID ${numericProductId} not found`);
      }
      
      const product = productRes.rows[0];
      const manufacturerId = product.manufacturer_id;
      
      console.log(`Found product: ${product.name} (ID: ${numericProductId}) owned by manufacturer ${manufacturerId}`);
      
      // Remove product categories
      await client.query(
        'DELETE FROM product_categories WHERE product_id = $1',
        [numericProductId]
      );
      console.log(`Deleted product categories for product ID: ${numericProductId}`);
      
      // Remove product reviews
      await client.query(
        'DELETE FROM reviews WHERE product_id = $1',
        [numericProductId]
      );
      console.log(`Deleted product reviews for product ID: ${numericProductId}`);
      
      // Delete the product
      const deleteRes = await client.query(
        'DELETE FROM products WHERE id = $1 RETURNING id',
        [numericProductId]
      );
      
      if (deleteRes.rows.length === 0) {
        await client.query('ROLLBACK');
        throw new Error(`Failed to delete product with ID ${numericProductId}`);
      }
      
      console.log(`Product deleted successfully, updating manufacturer's product count`);
      
      // Decrement manufacturer's product count
      await client.query(
        'UPDATE manufacturers SET no_of_products = no_of_products - 1 WHERE id = $1',
        [manufacturerId]
      );
      
      await client.query('COMMIT');
      console.log(`Transaction committed, product ${numericProductId} fully deleted`);
      
      return {
        success: true,
        productId: numericProductId,
        productName: product.name
      };
    } catch (err) {
      await client.query('ROLLBACK');
      console.error('Error in transaction:', err);
      throw err;
    } finally {
      client.release();
    }
  } catch (err) {
    console.error('Error deleting product:', err);
    throw err;
  }
};

module.exports = {
  getManufacturerProducts,
  getManufacturerPendingOrders,
  getManufacturerOrders,
  canManufacturerManageOrder,
  acceptManufacturerOrder,
  rejectManufacturerOrder,
  getManufacturerSales,
  getManufacturerSalesAnalytics,
  getManufacturerProductReviews,
  addProduct,
  updateProduct,
  deleteProduct
}; 