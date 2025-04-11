const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const db = require('../db/index');
const { query } = db; // Extract query function from db
const requireLogin = require('./middleware');

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'public/product-images/');
  },
  filename: function (req, file, cb) {
    // Generate next image ID
    getNextImageId().then(nextId => {
      // Get product name slug from request body
      const nameSlug = req.body.product_name_slug || 'product';
      const fileName = `${nextId}-${nameSlug}${path.extname(file.originalname)}`;
      cb(null, fileName);
    }).catch(err => {
      console.error('Error generating filename:', err);
      cb(err);
    });
  }
});

// Function to get the next available image ID
async function getNextImageId() {
  try {
    // Get the last product ID from the database
    const result = await db.query('SELECT MAX(id) as max_id FROM products');
    const lastId = result.rows[0].max_id || 0;
    return lastId + 1;
  } catch (err) {
    console.error('Error getting next image ID:', err);
    throw err;
  }
}

// Filter to only accept image files
const fileFilter = (req, file, cb) => {
  if (file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(new Error('Only image files are allowed!'), false);
  }
};

const upload = multer({ 
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  }
});

// Middleware to check if user is a manufacturer
const requireManufacturer = (req, res, next) => {
  console.log("Authentication check. Request user:", req.user ? `ID: ${req.user.id}, Method: ${req.user.auth_method}` : "No user");
  console.log("isAuthenticated:", req.isAuthenticated());
  
  if (!req.isAuthenticated()) {
    console.error("Authentication required but user not authenticated");
    return res.status(401).json({
      error: true,
      message: 'Authentication required. Please log in.'
    });
  }
  
  if (!req.user) {
    console.error("User authenticated but no user object found");
    return res.status(500).json({
      error: true,
      message: 'Authentication error: No user data found'
    });
  }
  
  if (req.user.auth_method !== 'manufacturer') {
    console.error(`Access denied. User has ${req.user.auth_method} role, manufacturer required`);
    return res.status(403).json({
      error: true,
      message: 'Access denied. Manufacturer role required.'
    });
  }
  
  if (!req.user.id) {
    console.error("User is manufacturer but has no ID");
    return res.status(500).json({
      error: true,
      message: 'Authentication error: Manufacturer ID missing'
    });
  }
  
  console.log(`Middleware check passed: User is manufacturer with ID ${req.user.id}`);
  next();
};

// Get manufacturer dashboard data
router.get('/dashboard', requireManufacturer, async (req, res) => {
  try {
    const manufacturerId = req.user.id;
    console.log(`Getting dashboard data for manufacturer ID: ${manufacturerId}`);
    
    // Verify the manufacturer exists
    const manufacturerCheck = await db.query(
      'SELECT id, company_name, no_of_products FROM manufacturers WHERE id = $1',
      [manufacturerId]
    );
    
    if (manufacturerCheck.rows.length === 0) {
      console.error(`Manufacturer with ID ${manufacturerId} does not exist`);
      return res.status(404).json({
        error: true,
        message: `Manufacturer with ID ${manufacturerId} not found`
      });
    }
    
    console.log(`Manufacturer found: ${JSON.stringify(manufacturerCheck.rows[0])}`);
    
    // Get manufacturer's products
    const products = await db.getManufacturerProducts(manufacturerId);
    console.log(`Found ${products.length} products for manufacturer dashboard`);
    
    // Get pending orders for manufacturer's products
    const pendingOrders = await db.getManufacturerPendingOrders(manufacturerId);
    console.log(`Found ${pendingOrders.length} pending orders for manufacturer dashboard`);
    
    // Get sales data
    const sales = await db.getManufacturerSales(manufacturerId);
    
    // Get product reviews
    const reviews = await db.getManufacturerProductReviews(manufacturerId);
    console.log(`Found ${reviews.length} reviews for manufacturer dashboard`);
    
    // If no products were found, automatically fix product associations
    if (products.length === 0) {
      console.log(`No products found for manufacturer ${manufacturerId}, attempting to fix...`);
      
      // Check if there are products with NULL manufacturer_id
      const nullManufacturerProducts = await db.query(
        'SELECT COUNT(*) FROM products WHERE manufacturer_id IS NULL'
      );
      
      if (parseInt(nullManufacturerProducts.rows[0].count) > 0) {
        console.log(`Found ${nullManufacturerProducts.rows[0].count} products with NULL manufacturer_id, assigning to manufacturer ${manufacturerId}`);
        
        // Update all products with NULL manufacturer_id to this manufacturer
        const updateResult = await db.query(
          'UPDATE products SET manufacturer_id = $1 WHERE manufacturer_id IS NULL RETURNING id, name',
          [manufacturerId]
        );
        
        console.log(`${updateResult.rows.length} products updated with manufacturer ID`);
        
        // Get products again
        const updatedProducts = await db.getManufacturerProducts(manufacturerId);
        
        // Return the updated products
        return res.status(200).json({
          products: updatedProducts,
          pendingOrders,
          sales,
          reviews,
          fix_applied: true,
          products_added: updateResult.rows.length
        });
      } else {
        // Create sample products if no products exist
        console.log("Creating sample products for manufacturer");
        
        // Create sample products
        const sampleProducts = [
          {
            name: "Sample Product 1",
            price: 99.99,
            stock_count: 100,
            available_stock_count: 100,
            short_description: "This is a sample product 1",
            long_description: "This is a detailed description of sample product 1",
            manufacturer_id: manufacturerId,
            image_path: "uploads/default-product.jpg"
          },
          {
            name: "Sample Product 2",
            price: 149.99,
            stock_count: 50,
            available_stock_count: 50,
            short_description: "This is a sample product 2",
            long_description: "This is a detailed description of sample product 2",
            manufacturer_id: manufacturerId,
            image_path: "uploads/default-product.jpg"
          },
          {
            name: "Sample Product 3",
            price: 199.99,
            stock_count: 25,
            available_stock_count: 25,
            short_description: "This is a sample product 3",
            long_description: "This is a detailed description of sample product 3",
            manufacturer_id: manufacturerId,
            image_path: "uploads/default-product.jpg"
          }
        ];
        
        for (const product of sampleProducts) {
          await db.query(
            `INSERT INTO products 
             (name, price, stock_count, available_stock_count, short_description, long_description, manufacturer_id, image_path) 
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
            [product.name, product.price, product.stock_count, product.available_stock_count, 
             product.short_description, product.long_description, product.manufacturer_id, product.image_path]
          );
        }
        
        console.log(`Created ${sampleProducts.length} sample products for manufacturer ID: ${manufacturerId}`);
        
        // Get products again
        const updatedProducts = await db.getManufacturerProducts(manufacturerId);
        
        // Return the updated products
        return res.status(200).json({
          products: updatedProducts,
          pendingOrders,
          sales,
          reviews,
          fix_applied: true,
          sample_products_added: sampleProducts.length
        });
      }
    }
    
    res.status(200).json({
      products,
      pendingOrders,
      sales,
      reviews
    });
  } catch (err) {
    console.error('Error getting manufacturer dashboard data:', err);
    res.status(500).send('Failed to retrieve dashboard data');
  }
});

// Get all products for the logged-in manufacturer
router.get('/products', requireManufacturer, async (req, res) => {
  try {
    const manufacturerId = req.user.id;
    console.log(`Fetching products for manufacturer ID: ${manufacturerId}`);
    
    const products = await db.getManufacturerProducts(manufacturerId);
    console.log(`Returning ${products.length} products`);
    
    res.status(200).json(products);
  } catch (err) {
    console.error('Error fetching manufacturer products:', err);
    res.status(500).send('Failed to retrieve products');
  }
});

// Diagnostic endpoint for debugging
router.get('/debug-info', requireManufacturer, async (req, res) => {
  try {
    const manufacturerId = req.user.id;
    console.log(`Getting debug info for manufacturer ID: ${manufacturerId}`);
    
    // Get manufacturer info
    const manufacturerInfo = await db.query(
      'SELECT * FROM manufacturers WHERE id = $1',
      [manufacturerId]
    );
    
    // Check products table
    const productsInfo = await db.query(
      'SELECT id, name, manufacturer_id FROM products WHERE manufacturer_id = $1',
      [manufacturerId]
    );
    
    // Check total products
    const totalProducts = await db.query(
      'SELECT COUNT(*) FROM products'
    );
    
    // Get list of manufacturer IDs that have products
    const manufacturersWithProducts = await db.query(
      'SELECT DISTINCT manufacturer_id FROM products WHERE manufacturer_id IS NOT NULL'
    );
    
    res.status(200).json({
      manufacturer: manufacturerInfo.rows[0] || null,
      products_count: productsInfo.rows.length,
      products_sample: productsInfo.rows.slice(0, 5),
      total_products: totalProducts.rows[0].count,
      manufacturers_with_products: manufacturersWithProducts.rows
    });
  } catch (err) {
    console.error('Error fetching debug info:', err);
    res.status(500).send('Failed to retrieve debug info');
  }
});

// Endpoint to fix product associations
router.post('/fix-products', requireManufacturer, async (req, res) => {
  try {
    const manufacturerId = req.user.id;
    console.log(`Fixing product associations for manufacturer ID: ${manufacturerId}`);
    
    if (!manufacturerId) {
      console.error('Invalid manufacturer ID in auth data');
      return res.status(400).json({
        success: false,
        message: 'Invalid manufacturer ID in auth data'
      });
    }
    
    // Check if manufacturer exists
    const manufacturerCheck = await db.query(
      'SELECT id, company_name, no_of_products FROM manufacturers WHERE id = $1',
      [manufacturerId]
    );
    
    if (manufacturerCheck.rows.length === 0) {
      console.error(`Manufacturer with ID ${manufacturerId} does not exist`);
      return res.status(404).json({
        success: false,
        message: `Manufacturer with ID ${manufacturerId} does not exist`
      });
    }
    
    console.log(`Manufacturer found: ${JSON.stringify(manufacturerCheck.rows[0])}`);
    
    // Check current manufacturer products count
    const beforeCount = await db.query(
      'SELECT COUNT(*) FROM products WHERE manufacturer_id = $1',
      [manufacturerId]
    );
    
    console.log(`Current products count: ${beforeCount.rows[0].count}`);
    
    // Check if there are any products in the database
    const totalProducts = await db.query('SELECT COUNT(*) FROM products');
    console.log(`Total products in database: ${totalProducts.rows[0].count}`);
    
    // Check if there are products with NULL manufacturer_id
    const nullManufacturerProducts = await db.query(
      'SELECT COUNT(*) FROM products WHERE manufacturer_id IS NULL'
    );
    console.log(`Products with NULL manufacturer_id: ${nullManufacturerProducts.rows[0].count}`);
    
    // Update all products with NULL manufacturer_id to this manufacturer
    const updateResult = await db.query(
      'UPDATE products SET manufacturer_id = $1 WHERE manufacturer_id IS NULL RETURNING id, name',
      [manufacturerId]
    );
    
    console.log(`${updateResult.rows.length} products updated with manufacturer ID`);
    
    // If no products were updated and manufacturer has no products, create some sample products
    if (updateResult.rows.length === 0 && parseInt(beforeCount.rows[0].count) === 0) {
      console.log("Creating sample products for manufacturer");
      
      // Create sample products
      const sampleProducts = [
        {
          name: "Sample Product 1",
          price: 99.99,
          stock_count: 100,
          available_stock_count: 100,
          short_description: "This is a sample product 1",
          long_description: "This is a detailed description of sample product 1",
          manufacturer_id: manufacturerId,
          image_path: "uploads/default-product.jpg"
        },
        {
          name: "Sample Product 2",
          price: 149.99,
          stock_count: 50,
          available_stock_count: 50,
          short_description: "This is a sample product 2",
          long_description: "This is a detailed description of sample product 2",
          manufacturer_id: manufacturerId,
          image_path: "uploads/default-product.jpg"
        },
        {
          name: "Sample Product 3",
          price: 199.99,
          stock_count: 25,
          available_stock_count: 25,
          short_description: "This is a sample product 3",
          long_description: "This is a detailed description of sample product 3",
          manufacturer_id: manufacturerId,
          image_path: "uploads/default-product.jpg"
        }
      ];
      
      for (const product of sampleProducts) {
        await db.query(
          `INSERT INTO products 
           (name, price, stock_count, available_stock_count, short_description, long_description, manufacturer_id, image_path) 
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
          [product.name, product.price, product.stock_count, product.available_stock_count, 
           product.short_description, product.long_description, product.manufacturer_id, product.image_path]
        );
      }
      
      console.log(`Created ${sampleProducts.length} sample products for manufacturer ID: ${manufacturerId}`);
    }
    
    // Update the manufacturer's product count
    const totalCount = await db.query(
      'SELECT COUNT(*) FROM products WHERE manufacturer_id = $1',
      [manufacturerId]
    );
    
    await db.query(
      'UPDATE manufacturers SET no_of_products = $1 WHERE id = $2',
      [totalCount.rows[0].count, manufacturerId]
    );
    
    console.log(`Updated manufacturer's product count to ${totalCount.rows[0].count}`);
    
    res.status(200).json({
      success: true,
      message: `Fixed product associations for manufacturer ID: ${manufacturerId}`,
      products_before: parseInt(beforeCount.rows[0].count, 10),
      products_added: updateResult.rows.length,
      sample_products_added: updateResult.rows.length === 0 && parseInt(beforeCount.rows[0].count) === 0 ? 3 : 0,
      total_products_now: parseInt(totalCount.rows[0].count, 10),
      manufacturer_info: manufacturerCheck.rows[0],
      newly_associated_products: updateResult.rows
    });
  } catch (err) {
    console.error('Error fixing product associations:', err);
    res.status(500).json({
      success: false,
      message: 'Failed to fix product associations',
      error: err.message
    });
  }
});

// Get manufacturer's orders
router.get('/orders', requireManufacturer, async (req, res) => {
  try {
    const manufacturerId = req.user.id;
    const orders = await db.getManufacturerOrders(manufacturerId);
    res.status(200).json(orders);
  } catch (err) {
    console.error('Error getting manufacturer orders:', err);
    res.status(500).send('Failed to retrieve orders');
  }
});

// Accept an order
router.post('/orders/:orderId/accept', requireManufacturer, async (req, res) => {
  try {
    const { orderId } = req.params;
    const manufacturerId = req.user.id;
    
    // Verify the order contains products from this manufacturer
    const canManageOrder = await db.canManufacturerManageOrder(manufacturerId, orderId);
    if (!canManageOrder) {
      return res.status(403).send('Access denied. This order does not contain your products.');
    }
    
    await db.acceptManufacturerOrder(manufacturerId, orderId);
    res.status(200).json({ success: true, message: 'Order accepted successfully' });
  } catch (err) {
    console.error('Error accepting order:', err);
    res.status(500).send('Failed to accept order');
  }
});

// Reject an order
router.post('/orders/:orderId/reject', requireManufacturer, async (req, res) => {
  try {
    const { orderId } = req.params;
    const manufacturerId = req.user.id;
    
    // Verify the order contains products from this manufacturer
    const canManageOrder = await db.canManufacturerManageOrder(manufacturerId, orderId);
    if (!canManageOrder) {
      return res.status(403).send('Access denied. This order does not contain your products.');
    }
    
    await db.rejectManufacturerOrder(manufacturerId, orderId);
    res.status(200).json({ success: true, message: 'Order rejected successfully' });
  } catch (err) {
    console.error('Error rejecting order:', err);
    res.status(500).send('Failed to reject order');
  }
});

// Add a new product with image upload
router.post('/products', requireManufacturer, upload.single('image'), async (req, res) => {
  try {
    const manufacturerId = req.user.id;
    const productData = {
      ...req.body,
      manufacturer_id: manufacturerId
    };
    
    // If an image was uploaded, record its path
    if (req.file) {
      const fileName = req.file.filename;
      productData.image_path = `product-images/${fileName}`;
      console.log(`Image uploaded: ${fileName}, saved path: ${productData.image_path}`);
    } else {
      // Set default image path
      productData.image_path = 'product-images/default-product.jpg';
    }
    
    const newProduct = await db.addProduct(productData);
    res.status(201).json(newProduct);
  } catch (err) {
    console.error('Error adding product:', err);
    res.status(500).send('Failed to add product');
  }
});

// Update a product
router.put('/products/:productId', requireManufacturer, upload.single('image'), async (req, res) => {
  try {
    const { productId } = req.params;
    const manufacturerId = req.user.id;
    
    // Verify the product belongs to this manufacturer
    const product = await db.getProductById(productId);
    if (!product || product.manufacturer_id !== manufacturerId) {
      return res.status(403).send('Access denied. This product does not belong to you.');
    }
    
    const updateData = { ...req.body };
    
    // If an image was uploaded, update the image path
    if (req.file) {
      const fileName = req.file.filename;
      updateData.image_path = `product-images/${fileName}`;
      console.log(`Image updated: ${fileName}, new path: ${updateData.image_path}`);
    }
    
    const updatedProduct = await db.updateProduct(productId, updateData);
    res.status(200).json(updatedProduct);
  } catch (err) {
    console.error('Error updating product:', err);
    res.status(500).send('Failed to update product');
  }
});

// Delete a product - simplified after fixing the db function
router.delete('/products/:productId', requireManufacturer, async (req, res) => {
  try {
    const productId = req.params.productId;
    const manufacturerId = req.user.id;
    
    console.log(`[DELETE] Request to delete product ID: ${productId} for manufacturer ID: ${manufacturerId}`);
    
    // First verify the product belongs to this manufacturer
    try {
      // Direct query to check product ownership
      const productCheck = await db.query(
        'SELECT id, name, manufacturer_id FROM products WHERE id = $1',
        [productId]
      );
      
      if (productCheck.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: `Product with ID ${productId} not found`
        });
      }
      
      const product = productCheck.rows[0];
      
      // Use simple string comparison to avoid type mismatches
      if (String(product.manufacturer_id) !== String(manufacturerId)) {
        console.log(`Access denied. Product ${productId} belongs to manufacturer ${product.manufacturer_id}, not ${manufacturerId}`);
        return res.status(403).json({
          success: false,
          message: 'Access denied. This product does not belong to you.'
        });
      }
      
      // If we get here, the product exists and belongs to this manufacturer
      console.log(`Ownership verified. Calling deleteProduct for ID: ${productId}`);
      
      const result = await db.deleteProduct(productId);
      
      console.log(`Delete operation successful:`, result);
      
      return res.status(200).json({
        success: true,
        message: `Product successfully deleted`,
        productId: Number(productId),
        productName: product.name
      });
    } catch (err) {
      console.error('Error deleting product:', err);
      return res.status(500).json({
        success: false,
        message: 'Server error deleting product',
        error: err.message
      });
    }
  } catch (err) {
    console.error('Unexpected error in delete route:', err);
    return res.status(500).json({
      success: false,
      message: 'Server error processing request',
      error: err.message
    });
  }
});

// Get sales analytics
router.get('/sales', requireManufacturer, async (req, res) => {
  try {
    const manufacturerId = req.user.id;
    const salesData = await db.getManufacturerSalesAnalytics(manufacturerId);
    res.status(200).json(salesData);
  } catch (err) {
    console.error('Error getting sales data:', err);
    res.status(500).send('Failed to retrieve sales data');
  }
});

// Get reviews for manufacturer's products
router.get('/reviews', requireManufacturer, async (req, res) => {
  try {
    const manufacturerId = req.user.id;
    const reviews = await db.getManufacturerProductReviews(manufacturerId);
    res.status(200).json(reviews);
  } catch (err) {
    console.error('Error getting product reviews:', err);
    res.status(500).send('Failed to retrieve product reviews');
  }
});

// Emergency diagnostic endpoint - no auth required
router.get('/diagnostic', async (req, res) => {
  try {
    console.log('Emergency diagnostic endpoint called');
    
    // Test database connection
    let dbStatus = "Unknown";
    try {
      const dbTest = await db.query('SELECT 1 as test');
      dbStatus = dbTest.rows[0].test === 1 ? "Connected" : "Error";
    } catch (dbErr) {
      dbStatus = `Error: ${dbErr.message}`;
    }
    
    // Check for manufacturers
    let manufacturersCount = 0;
    try {
      const manufacturersTest = await db.query('SELECT COUNT(*) FROM manufacturers');
      manufacturersCount = parseInt(manufacturersTest.rows[0].count, 10);
    } catch (mErr) {
      console.error('Error checking manufacturers:', mErr);
    }
    
    // Check for products
    let productsCount = 0;
    try {
      const productsTest = await db.query('SELECT COUNT(*) FROM products');
      productsCount = parseInt(productsTest.rows[0].count, 10);
    } catch (pErr) {
      console.error('Error checking products:', pErr);
    }
    
    // Basic auth check
    const authStatus = req.isAuthenticated() 
      ? `Authenticated as ${req.user.auth_method}, ID: ${req.user.id}` 
      : "Not authenticated";
    
    res.status(200).json({
      status: "OK",
      timestamp: new Date().toISOString(),
      database: dbStatus,
      auth: authStatus,
      counts: {
        manufacturers: manufacturersCount,
        products: productsCount
      },
      session: req.isAuthenticated() ? "Active" : "None",
      headers: req.headers
    });
  } catch (err) {
    console.error('Error in diagnostic endpoint:', err);
    res.status(500).json({
      status: "Error",
      message: err.message,
      stack: process.env.NODE_ENV !== 'production' ? err.stack : undefined
    });
  }
});

// Special debug route for checking product ownership
router.get('/debug-product/:productId', requireManufacturer, async (req, res) => {
  try {
    const productId = req.params.productId;
    const manufacturerId = req.user.id;
    
    console.log(`DEBUG checking product ID ${productId} for manufacturer ID ${manufacturerId}`);
    
    // Direct query to get product data
    const productResult = await db.query(
      'SELECT id, name, manufacturer_id::text FROM products WHERE id = $1',
      [productId]
    );
    
    if (productResult.rows.length === 0) {
      return res.json({
        found: false,
        message: `Product with ID ${productId} not found`,
        manufacturer_id: manufacturerId
      });
    }
    
    const product = productResult.rows[0];
    
    // Get the manufacturer record
    const manufacturerResult = await db.query(
      'SELECT id::text, company_name FROM manufacturers WHERE id = $1',
      [manufacturerId]
    );
    
    const manufacturer = manufacturerResult.rows[0] || { id: 'not found' };
    
    // Compare values with type information
    const productManufacturerId = product.manufacturer_id;
    const comparison = {
      product_manufacturer_id: productManufacturerId,
      product_manufacturer_id_type: typeof productManufacturerId,
      auth_manufacturer_id: String(manufacturerId),
      auth_manufacturer_id_type: typeof String(manufacturerId),
      equal_with_conversion: String(productManufacturerId) === String(manufacturerId),
      equal_without_conversion: productManufacturerId === manufacturerId,
      equal_numbers: Number(productManufacturerId) === Number(manufacturerId)
    };
    
    res.json({
      found: true,
      product,
      manufacturer,
      comparison,
      raw_values: {
        product_manufacturer_id_raw: product.manufacturer_id,
        auth_manufacturer_id_raw: manufacturerId
      }
    });
  } catch (err) {
    console.error('Error debugging product:', err);
    res.status(500).json({
      error: true,
      message: err.message,
      stack: process.env.NODE_ENV !== 'production' ? err.stack : undefined
    });
  }
});

module.exports = router; 