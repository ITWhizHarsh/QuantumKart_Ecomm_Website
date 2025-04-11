import React, { useState, useEffect } from 'react';
import { useRouteLoaderData } from 'react-router-dom';
import { AuthData } from '../../auth/authData';
import utilStyles from '../../../App/utilStyles.module.css';

interface Order {
  order_id: number;
  order_date: string;
  order_placed_time?: string; // Alternative field name that might come from API
  customer_name: string;
  total: string;
  total_cost?: string; // Alternative field name that might come from API
  status: string;
  products: OrderProduct[];
}

interface OrderProduct {
  product_id: number;
  product_name: string;
  quantity: number;
  price: string;
}

const OrderManagement: React.FC = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionStatus, setActionStatus] = useState<{ isProcessing: boolean, orderId: number | null }>({
    isProcessing: false,
    orderId: null
  });
  const authData = useRouteLoaderData("app") as AuthData;

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    try {
      setLoading(true);
      console.log('Fetching manufacturer orders...');
      
      const res = await fetch(
        `${process.env.REACT_APP_API_BASE_URL}/manufacturer/orders`,
        { credentials: "include" }
      );

      if (!res.ok) {
        throw new Error(`HTTP error! Status: ${res.status}`);
      }

      const data = await res.json();
      console.log('Orders data received:', data);
      
      // Normalize the data to handle different field names
      const normalizedOrders = data.map((order: any) => ({
        order_id: order.order_id,
        order_date: order.order_date || order.order_placed_time || new Date().toISOString(),
        customer_name: order.customer_name || 'Unknown Customer',
        total: order.total || order.total_cost || '$0.00',
        status: order.status || 'pending',
        products: Array.isArray(order.products) ? order.products.map((p: any) => ({
          product_id: p.product_id,
          product_name: p.product_name || 'Unknown Product',
          quantity: p.quantity || p.product_quantity || 1,
          price: p.price || '$0.00'
        })) : []
      }));
      
      setOrders(normalizedOrders);
      setLoading(false);
    } catch (err) {
      console.error("Error fetching orders:", err);
      setError("Failed to load orders. Please try again later.");
      setLoading(false);
    }
  };

  const handleOrderAction = async (orderId: number, action: 'accept' | 'reject') => {
    try {
      setActionStatus({ isProcessing: true, orderId });
      
      const res = await fetch(
        `${process.env.REACT_APP_API_BASE_URL}/manufacturer/orders/${orderId}/${action}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include'
        }
      );

      if (!res.ok) {
        throw new Error(`HTTP error! Status: ${res.status}`);
      }

      // Update the local state
      setOrders(prevOrders =>
        prevOrders.map(order =>
          order.order_id === orderId
            ? { ...order, status: action === 'accept' ? 'accepted' : 'rejected' }
            : order
        )
      );
      
      setActionStatus({ isProcessing: false, orderId: null });
    } catch (err) {
      console.error(`Error ${action}ing order:`, err);
      setError(`Failed to ${action} order. Please try again.`);
      setActionStatus({ isProcessing: false, orderId: null });
    }
  };

  if (loading) return <div>Loading orders...</div>;
  if (error) return <div className={utilStyles.error}>{error}</div>;

  const pendingOrders = orders.filter(o => o.status === 'pending' || o.status === 'processing order');
  const processedOrders = orders.filter(o => o.status !== 'pending' && o.status !== 'processing order');

  return (
    <div>
      <h2 className={utilStyles.h2}>Order Management</h2>
      <div className={utilStyles.dashboardPanel}>
        <h3 className={utilStyles.dashboardTitle}>Pending Orders</h3>
        {pendingOrders.length === 0 ? (
          <p>No pending orders to display. When customers place orders for your products, they will appear here for approval.</p>
        ) : (
          <div>
            {pendingOrders.map(order => (
              <div key={order.order_id} className={utilStyles.orderCard}>
                <div className={utilStyles.orderHeader}>
                  <h4>Order #{order.order_id}</h4>
                  <p>{new Date(order.order_date).toLocaleString()}</p>
                </div>
                <div className={utilStyles.orderDetails}>
                  <p><strong>Customer:</strong> {order.customer_name}</p>
                  <p><strong>Total:</strong> {order.total}</p>
                  <div className={utilStyles.orderProducts}>
                    <strong>Products:</strong>
                    <ul>
                      {order.products && order.products.length > 0 ? (
                        order.products.map(product => (
                          <li key={product.product_id}>
                            {product.product_name} x {product.quantity} - {product.price}
                          </li>
                        ))
                      ) : (
                        <li>No product details available</li>
                      )}
                    </ul>
                  </div>
                  <div className={utilStyles.orderActions}>
                    <button 
                      className={`${utilStyles.actionButton} ${utilStyles.acceptButton}`}
                      onClick={() => handleOrderAction(order.order_id, 'accept')}
                      disabled={actionStatus.isProcessing && actionStatus.orderId === order.order_id}
                    >
                      {actionStatus.isProcessing && actionStatus.orderId === order.order_id && actionStatus.isProcessing
                        ? 'Processing...'
                        : 'Accept Order'
                      }
                    </button>
                    <button 
                      className={`${utilStyles.actionButton} ${utilStyles.rejectButton}`}
                      onClick={() => handleOrderAction(order.order_id, 'reject')}
                      disabled={actionStatus.isProcessing && actionStatus.orderId === order.order_id}
                    >
                      {actionStatus.isProcessing && actionStatus.orderId === order.order_id && actionStatus.isProcessing
                        ? 'Processing...'
                        : 'Reject Order'
                      }
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className={utilStyles.dashboardPanel}>
        <h3 className={utilStyles.dashboardTitle}>Processed Orders</h3>
        {processedOrders.length === 0 ? (
          <p>No processed orders to display. Orders that you have accepted or rejected will appear here.</p>
        ) : (
          <div>
            {processedOrders.map(order => (
              <div key={order.order_id} className={utilStyles.orderCard}>
                <div className={utilStyles.orderHeader}>
                  <h4>Order #{order.order_id}</h4>
                  <p>{new Date(order.order_date).toLocaleString()}</p>
                </div>
                <div className={utilStyles.orderDetails}>
                  <p><strong>Customer:</strong> {order.customer_name}</p>
                  <p><strong>Status:</strong> {order.status.charAt(0).toUpperCase() + order.status.slice(1)}</p>
                  <p><strong>Total:</strong> {order.total}</p>
                  <div className={utilStyles.orderProducts}>
                    <strong>Products:</strong>
                    <ul>
                      {order.products && order.products.length > 0 ? (
                        order.products.map(product => (
                          <li key={product.product_id}>
                            {product.product_name} x {product.quantity} - {product.price}
                          </li>
                        ))
                      ) : (
                        <li>No product details available</li>
                      )}
                    </ul>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default OrderManagement; 