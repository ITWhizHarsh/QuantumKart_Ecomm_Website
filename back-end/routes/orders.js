const express = require('express');

const db = require('../db/index');
const requireLogin = require('./middleware');

const router = express.Router();

const checkIdValidity = async (req, res, next) => {
  try {
    const orderId = req.params.id;
    const orderUserId = await db.getOrderCustomerId(orderId);
    if (!orderUserId) {
      return res.status(404).send(`An order with the ID '${orderId}' does not exist.`);
    } else if (orderUserId !== req.user.id) {
      return res.status(401).send(
        'Invalid credentials. You cannot view another user\'s order.'
      );
    }
    next();

  } catch(err) {
    res.status(500).send('Query failed. Please ensure you provided a valid order ID.');
  }
};

router.get('', requireLogin, async (req, res) => {
  try {
    const userId = req.user.id;
    const ordersSummary = await db.getOrdersSummary(userId);
    
    console.log('Orders summary before formatting:', ordersSummary);
    
    // Simplified approach to ensure order data is consistent
    const formattedOrders = ordersSummary.map(order => {
      // Ensure order_id is a number
      const orderId = parseInt(order.order_id);
      
      // Parse numeric cost
      let numericCost = 0;
      try {
        numericCost = parseFloat(order.total_cost);
        if (isNaN(numericCost)) numericCost = 0;
      } catch (e) {
        console.error(`Error formatting order total for order ${order.order_id}:`, e);
      }
      
      return {
        order_id: orderId,
        order_placed_time: order.order_placed_time,
        order_status: order.order_status,
        total_cost: numericCost.toFixed(2) // Return as string with 2 decimal places
      };
    });
    
    console.log('Final formatted orders:', formattedOrders);
    
    res.status(200).json(formattedOrders);
  } catch(err) {
    console.error('Orders retrieval failed:', err);
    res.status(500).send('Orders retrieval failed.');
  }
});

router.get('/:id/status', requireLogin, async (req, res) => {
  try {
    const orderId = req.params.id;
    const orderCustomerId = await db.getOrderCustomerId(orderId);
    if (!orderCustomerId) {
      return res.status(404).send(`An order with the ID '${orderId}' does not exist.`);
    } else if (orderCustomerId !== req.user.id) {
      return res.status(403).send('Access to order status is forbidden.');
    }
    
    const orderStatus = await db.getOrderStatus(orderId);
    res.status(200).json({ order_status: orderStatus });
    
  } catch(err) {
    res.status(500).send('Query failed. Please ensure you provided a valid order ID.');
  }
});

router.get('/:id', requireLogin, checkIdValidity, async (req, res) => {
  try {
    const orderId = req.params.id;
    const orderData = await db.getOrderById(orderId);
    res.status(200).json(orderData);
  } catch(err) {
    res.status(500).send('Query failed. Please ensure you provided a valid order ID.');
  }
});

router.delete('/:id', requireLogin, checkIdValidity, async (req, res) => {
  try {
    const orderId = req.params.id;
    const orderStatus = await db.getOrderStatus(orderId);
    if (orderStatus === 'cancelled') {
      return res.status(204).send();
    } else if (orderStatus !== 'pending') {
      return res.status(400).send(
        `Only 'pending' orders can be cancelled; this order's status is '${orderStatus}'.`
      );
    }
    await db.updateOrderStatus(orderId, 'cancelled');
    res.status(204).send();

  } catch(err) {
    res.status(500).send('Query failed. Please ensure you provided a valid order ID.');
  }
});

// Add new endpoint to confirm an order and clear the cart
router.post('/confirm-order/:id', async (req, res) => {
  try {
    console.log('Confirm order request received');
    console.log('URL params:', req.params);
    console.log('User in session:', req.user || 'No user in session');
    
    const orderId = req.params.id;
    console.log(`Processing order confirmation for order ID: ${orderId}`);
    
    // Check if order exists and get its status
    try {
      const orderStatus = await db.getOrderStatus(orderId);
      if (!orderStatus) {
        console.error(`Order with ID ${orderId} not found`);
        return res.status(404).json({ error: 'Order not found' });
      }
      
      console.log(`Current order status: ${orderStatus}`);
      
      // Prevent double-processing orders that are already confirmed
      if (orderStatus === 'processing order' || orderStatus === 'delivered') {
        console.log(`Order ${orderId} is already processed`);
        return res.status(200).json({ 
          message: 'Order already confirmed', 
          orderId, 
          success: true,
          alreadyProcessed: true
        });
      }
      
      // Confirm the order's payment status
      console.log(`Confirming order ${orderId}`);
      
      try {
        // Use confirmPaidOrder instead of updateOrderStatus to handle loyalty points
        const confirmedOrder = await db.confirmPaidOrder(orderId);
        console.log(`Order ${orderId} confirmed successfully with loyalty points processing`);
        
        // Clear the user's cart if user is logged in
        if (req.user && req.user.id) {
          const userId = req.user.id;
          console.log(`Attempting to clear cart for user ID: ${userId}`);
          
          try {
            await db.clearCart(userId);
            console.log(`Cart cleared successfully for user ID: ${userId}`);
          } catch (cartError) {
            console.error(`Error clearing cart:`, cartError);
            // Continue with the process even if cart clearing fails
          }
        } else {
          console.log('No authenticated user found, skipping cart clear');
        }
        
        return res.status(200).json({ 
          message: 'Order confirmed successfully', 
          orderId, 
          success: true,
          order: confirmedOrder
        });
      } catch (updateErr) {
        console.error(`Error confirming order:`, updateErr);
        return res.status(500).json({ 
          error: 'Failed to confirm order', 
          details: updateErr.message 
        });
      }
      
    } catch (innerErr) {
      console.error('Error processing order:', innerErr);
      return res.status(500).json({ 
        error: 'Error processing order', 
        details: innerErr.message 
      });
    }
  } catch (err) {
    console.error('Error in confirm-order endpoint:', err);
    res.status(500).json({ 
      error: 'Failed to confirm order', 
      details: err.message 
    });
  }
});

module.exports = router;