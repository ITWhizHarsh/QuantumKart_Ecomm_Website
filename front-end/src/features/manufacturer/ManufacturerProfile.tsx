import { useRouteLoaderData } from "react-router-dom";
import { AuthData } from "../auth/authData";
import InlineErrorPage from "../../components/InlineErrorPage/InlineErrorPage";
import utilStyles from "../../App/utilStyles.module.css";
import styles from "./ManufacturerProfile.module.css";
import { formatCurrency } from "../../utils/currency";

export function ManufacturerProfile() {
  const authData = useRouteLoaderData("app") as AuthData;

  if (!authData.logged_in || authData.auth_method !== 'manufacturer') {
    return <InlineErrorPage pageName="Manufacturer Profile" message="You must be logged in as a manufacturer to view this page." />;
  }

  return (
    <div className={utilStyles.pagePadding}>
      <h1 className={utilStyles.h1}>Manufacturer Profile</h1>
      
      <section className={styles.profileSection}>
        <h2>Company Details</h2>
        <div className={styles.profileDetails}>
          <p><strong>Company Name:</strong> {authData.company_name}</p>
          <p><strong>Agent Name:</strong> {authData.agent_name}</p>
          <p><strong>Email:</strong> {authData.email_address}</p>
          <p><strong>Products Listed:</strong> {authData.no_of_products || 0}</p>
        </div>
      </section>

      <section className={styles.actionsSection}>
        <h2>Quick Actions</h2>
        <div className={styles.actionButtons}>
          <button className={`${utilStyles.button} ${styles.actionButton}`}>
            Add New Product
          </button>
          <button className={`${utilStyles.button} ${styles.actionButton}`}>
            Manage Products
          </button>
          <button className={`${utilStyles.button} ${styles.actionButton}`}>
            View Sales Reports
          </button>
        </div>
      </section>

      <section className={styles.statsSection}>
        <h2>Performance Overview</h2>
        <div className={styles.statsGrid}>
          <div className={styles.statCard}>
            <h3>Total Products</h3>
            <p className={styles.statValue}>{authData.no_of_products || 0}</p>
          </div>
          <div className={styles.statCard}>
            <h3>Active Orders</h3>
            <p className={styles.statValue}>0</p>
          </div>
          <div className={styles.statCard}>
            <h3>Total Sales</h3>
            <p className={styles.statValue}>{formatCurrency(0)}</p>
          </div>
        </div>
      </section>
    </div>
  );
} 