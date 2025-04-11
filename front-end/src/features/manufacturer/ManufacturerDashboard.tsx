import React, { useState, useEffect } from 'react';
import { useNavigate, useRouteLoaderData } from 'react-router-dom';
import AddProduct from './components/AddProduct';
import ProductList from './components/ProductList';
import OrderManagement from './components/OrderManagement';
import SalesAnalytics from './components/SalesAnalytics';
import ReviewsSection from './components/ReviewsSection';
import { AuthData } from '../auth/authData';
import utilStyles from '../../App/utilStyles.module.css';
import styles from './ManufacturerDashboard.module.css';

export async function manufacturerDashboardLoader() {
  // Now we only need to load manufacturer-specific data, not auth
  try {
    console.log('Loading manufacturer dashboard data...');
    const res = await fetch(
      `${process.env.REACT_APP_API_BASE_URL}/manufacturer/dashboard`,
      { credentials: "include" }
    );
    
    if (!res.ok) {
      console.error('Dashboard data fetch failed:', res.status);
      const errorText = await res.text();
      console.error('Error response:', errorText);
      throw new Error(`Failed to load dashboard: ${res.status}`);
    }
    
    const dashboardData = await res.json();
    console.log('Dashboard data loaded:', dashboardData);
    
    return dashboardData;
  } catch (err) {
    console.error('Error in manufacturer dashboard loader:', err);
    return {
      products: [],
      pendingOrders: [],
      sales: { total: 0, monthly: [] },
      reviews: []
    };
  }
}

const ManufacturerDashboard: React.FC = () => {
  const [activeTab, setActiveTab] = useState('products');
  const navigate = useNavigate();
  const loaderData = useRouteLoaderData("manufacturer") as any || {};
  console.log('Loader data:', loaderData);
  
  // Extract auth data with fallbacks
  const authData = loaderData?.authData || {
    logged_in: false,
    auth_method: null,
    company_name: 'HRX',
    id: null,
    email_address: null
  };
  console.log('Auth data with fallbacks:', authData);
  
  // Set a fallback company name if it's not provided
  const companyName = authData?.company_name || 'HRX';
  
  useEffect(() => {
    // Redirect if not logged in or not a manufacturer
    if (!authData?.logged_in || authData?.auth_method !== 'manufacturer') {
      navigate('/login');
    }
  }, [authData, navigate]);

  const tabs = [
    { id: 'products', label: 'Products' },
    { id: 'add-product', label: 'Add Product' },
    { id: 'orders', label: 'Order Management' },
    { id: 'sales', label: 'Sales Analytics' },
    { id: 'reviews', label: 'Reviews' },
  ];

  const handleLogout = async () => {
    try {
      const res = await fetch(
        `${process.env.REACT_APP_API_BASE_URL}/auth/logout`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
        }
      );
      if (!res.ok) {
        throw new Error("Logout failed");
      }
      navigate('/login');
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  return (
    <div className={styles.manufacturerLayout}>
      {/* Custom header for manufacturer dashboard */}
      <header className={styles.manufacturerHeader}>
        <div className={styles.logoSection}>
          <h1 className={styles.logo}>Quantum<span className={styles.highlight}>Kart</span></h1>
        </div>
        <div className={styles.headerRight}>
          <button onClick={handleLogout} className={styles.logoutButton}>Log Out</button>
        </div>
      </header>
      
      <div className={utilStyles.pagePadding}>
        <h1 className={utilStyles.h1}>Manufacturer Dashboard</h1>
        <p className={utilStyles.mb2rem}>
          Welcome back, <strong>{companyName}</strong>
        </p>
        
        {/* Navigation Tabs */}
        <div className={utilStyles.tabContainer}>
          {tabs.map(tab => (
            <button
              key={tab.id}
              className={`${utilStyles.tab} ${activeTab === tab.id ? utilStyles.activeTab : ''}`}
              onClick={() => setActiveTab(tab.id)}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content Area */}
        <div className={utilStyles.tabContent}>
          {activeTab === 'products' && <ProductList />}
          {activeTab === 'add-product' && <AddProduct />}
          {activeTab === 'orders' && <OrderManagement />}
          {activeTab === 'sales' && <SalesAnalytics />}
          {activeTab === 'reviews' && <ReviewsSection />}
        </div>
      </div>
    </div>
  );
};

export default ManufacturerDashboard; 