const bodyParser = require('body-parser');
const express = require('express');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

const db = require('../db/index');
const requireLogin = require('./middleware');

const router = express.Router();

// https://expressjs.com/en/resources/middleware/body-parser.html
const jsonParser = bodyParser.json();

// https://stripe.com/docs/checkout/embedded/quickstart?client=react&lang=node
// https://stripe.com/docs/payments/accept-a-payment?platform=web&ui=embedded-checkout
const stripe = require('stripe')(`${process.env.STRIPE_SECRET_KEY}`);


router.post('/create-pending-order', requireLogin, jsonParser, async (req, res) => {
  try {
    const userId = req.user.id;
    const { 
      address_id,
      house_no, locality, city, country, postcode,
      saveAddress,
      redeemPoints
    } = req.body;
    
    console.log('Create pending order request received:', req.body);
    
    let orderAddressId = null;
    
    // If using existing address
    if (address_id) {
      console.log(`Using existing address: ${address_id}`);
      orderAddressId = address_id;
    }
    // If creating new address
    else if (house_no && locality && city && country && postcode) {
      console.log('Creating new address for order');
      
      try {
        // First, add the address to the addresses table
        const addressResult = await db.query(
          'INSERT INTO addresses(house_no, locality, city, country, postcode) VALUES($1, $2, $3, $4, $5) RETURNING address_id',
          [house_no, locality, city, country, postcode]
        );
        
        orderAddressId = addressResult.rows[0].address_id;
        console.log(`Created new address with ID: ${orderAddressId}`);
        
        // If saveAddress is true, link it to the customer
        if (saveAddress === true || saveAddress === "true") {
          console.log('Saving address to customer account');
          await db.query(
            'INSERT INTO customer_addresses(customer_id, address_id) VALUES($1, $2) ON CONFLICT DO NOTHING',
            [userId, orderAddressId]
          );
        }
      } catch (err) {
        console.error('Error creating address:', err);
        return res.status(400).send('Failed to create address for order');
      }
    } else {
      return res.status(400).send('Please provide either an address_id or complete address details');
    }

    // Check cart isn't empty
    const cartItems = await db.getCartItems(userId);
    if (cartItems.length < 1) {
      return res.status(400).send('Your cart is empty.');
    }

    // Create pending order with the address
    console.log('Creating pending order with address_id:', orderAddressId);
    const orderDetails = await db.createPendingOrder(userId, orderAddressId, redeemPoints);
    console.log('Order created with ID:', orderDetails.order_id);
    
    res.status(201).json(orderDetails);

  } catch (err) {
    console.error('Error creating pending order:', err);
    res.status(500).send('Server error: Failed to create order');
  }
});


router.post('/create-payment-session', requireLogin, async (req, res) => {
  // Create a Stripe payment session before payment
  try {
    const orderId = req.query.order_id;
    const orderData = await db.getOrderById(orderId);
    console.log('Order data:', orderData);

    // Generate checkout session Price objects (payment line items)
    const orderItemsData = orderData.order_items.map(item => {
      return {
        price_data: {
          currency: 'usd',
          product_data: {
            name: item.product_name,
          },
          unit_amount: (Number(item.product_price.substring(1)) * 100),  // Price in cents
        },
        quantity: Number(item.product_quantity),
      }
    });

    console.log('Order items data:', orderItemsData);

    const session = await stripe.checkout.sessions.create({
      ui_mode: 'embedded',
      line_items: orderItemsData,
      mode: 'payment',
      return_url: `${process.env.FRONT_END_BASE_URL}/checkout/${orderId}/payment-return?session_id={CHECKOUT_SESSION_ID}`,
    });
  
    console.log('Stripe session created:', session);
  
    if (!session.client_secret) {
      throw new Error('Failed to retrieve client secret from Stripe session');
    }
  
    res.send({clientSecret: session.client_secret});

  } catch(err) {
    console.error('Error creating payment session:', err);
    res.status(500).send('Failed to create payment session');
  }
});


router.get('/payment-session-status', async (req, res) => {
  // Retrieve the payment status (complete or failed/cancelled) after an attempted payment
  try {
    const session = await stripe.checkout.sessions.retrieve(req.query.session_id);
    res.send({ status: session.status });
  } catch(err) {
    console.error('Error retrieving payment status:', err);
    res.status(500).send('Failed to retrieve payment status');
  }
});


router.put('/confirm-paid-order', async (req, res) => {
  // Update the order status if payment was pending and has now been completed
  try {
    const session = await stripe.checkout.sessions.retrieve(req.query.session_id);
    if (session.status === 'complete') {
      try {
        const orderId = req.query.order_id;
        if (!orderId) {
          throw new Error('Order ID not included in request; order status could not be updated.');
        }
        const orderStatus = await db.getOrderStatus(orderId);
        if (orderStatus === 'payment pending') {
          await db.confirmPaidOrder(orderId);
        }
      } catch(err) {
        // In production, log/alert to investigate and update order status manually
        console.error('Error confirming paid order:', err);
      }
    }
    res.send();
  } catch(err) {
    console.error('Error in confirm-paid-order endpoint:', err);
    res.status(500).send('Failed to confirm paid order');
  }
});


router.post('/confirm-payment', requireLogin, async (req, res) => {
  console.log('Confirm payment request received');
  console.log('Query parameters:', req.query);
  console.log('User ID:', req.user?.id || 'User not authenticated');
  
  try {
    const orderId = req.query.order_id;
    if (!orderId) {
      console.error('Missing order_id in request');
      return res.status(400).json({ error: 'Order ID is required' });
    }

    console.log(`Processing order confirmation for order ID: ${orderId}`);

    // Check if order exists
    try {
      const orderStatus = await db.getOrderStatus(orderId);
      if (!orderStatus) {
        console.error(`Order with ID ${orderId} not found`);
        return res.status(404).json({ error: 'Order not found' });
      }

      console.log(`Current order status: ${orderStatus}`);

      // Get order details before confirmation
      const preOrderDetails = await db.getOrderById(orderId);
      console.log('Order details before confirmation:', {
        customer_id: preOrderDetails.customer_id,
        total_cost: preOrderDetails.total_cost,
        redeem_loyalty_points: preOrderDetails.redeem_loyalty_points,
        points_redeemed: preOrderDetails.points_redeemed
      });

      // Check loyalty points before update
      try {
        const loyaltyPointsRes = await db.query(
          'SELECT loyalty_points FROM customer_loyalty WHERE customer_id=$1',
          [req.user.id]
        );
        const pointsBefore = loyaltyPointsRes.rowCount > 0 ? loyaltyPointsRes.rows[0].loyalty_points : 0;
        console.log(`Current loyalty points before update: ${pointsBefore}`);
      } catch (lpErr) {
        console.error('Error checking loyalty points before update:', lpErr);
      }

      // Confirm the order
      const confirmedOrder = await db.confirmPaidOrder(orderId);
      console.log(`Order ${orderId} confirmed successfully`);

      // Check loyalty points after update
      let updatedLoyaltyPoints = 0;
      try {
        const loyaltyPointsRes = await db.query(
          'SELECT loyalty_points FROM customer_loyalty WHERE customer_id=$1',
          [req.user.id]
        );
        updatedLoyaltyPoints = loyaltyPointsRes.rowCount > 0 ? loyaltyPointsRes.rows[0].loyalty_points : 0;
        console.log(`Loyalty points after update: ${updatedLoyaltyPoints}`);
      } catch (lpErr) {
        console.error('Error checking loyalty points after update:', lpErr);
      }

      // Clear the user's cart
      const userId = req.user.id;
      console.log(`Attempting to clear cart for user ID: ${userId}`);
      
      try {
        await db.clearCart(userId);
        console.log(`Cart cleared successfully for user ID: ${userId}`);
      } catch (cartError) {
        console.error(`Error clearing cart for user ${userId}:`, cartError);
        // Continue with the process even if cart clearing fails
      }

      res.status(200).json({ 
        message: 'Payment confirmed and cart cleared', 
        orderId,
        orderDetails: confirmedOrder,
        currentLoyaltyPoints: updatedLoyaltyPoints
      });
    } catch (innerErr) {
      console.error('Error processing order:', innerErr);
      return res.status(500).json({ error: 'Error processing order', details: innerErr.message });
    }
  } catch (err) {
    console.error('Error confirming payment:', err);
    res.status(500).json({ error: 'Failed to confirm payment', details: err.message });
  }
});


module.exports = router;
