import React from 'react';
import utilStyles from '../../../App/utilStyles.module.css';

const SalesAnalytics: React.FC = () => {
  // Mock data for sales analytics
  const salesData = [
    { month: 'January', revenue: 12500 },
    { month: 'February', revenue: 15000 },
    { month: 'March', revenue: 18200 },
    { month: 'April', revenue: 20100 },
    { month: 'May', revenue: 22500 },
    { month: 'June', revenue: 19800 }
  ];

  const totalRevenue = salesData.reduce((sum, item) => sum + item.revenue, 0);
  const averageRevenue = totalRevenue / salesData.length;

  return (
    <div className={utilStyles.container}>
      <h2 className={utilStyles.h2}>Sales Analytics</h2>
      
      <div className={utilStyles.mb2rem}>
        <h3>Performance Overview</h3>
        <p>Total Revenue: <span className={utilStyles.bold}>${totalRevenue.toLocaleString()}</span></p>
        <p>Average Monthly Revenue: <span className={utilStyles.bold}>${averageRevenue.toLocaleString()}</span></p>
      </div>
      
      <div>
        <h3>Monthly Revenue</h3>
        <table className={utilStyles.orderTable}>
          <thead>
            <tr>
              <th>Month</th>
              <th>Revenue</th>
            </tr>
          </thead>
          <tbody>
            {salesData.map((item, index) => (
              <tr key={index}>
                <td>{item.month}</td>
                <td>${item.revenue.toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default SalesAnalytics; 