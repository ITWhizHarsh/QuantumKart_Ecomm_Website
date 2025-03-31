import { useRouteLoaderData } from "react-router-dom";

import { AuthData } from "../../features/auth/authData";
import InlineErrorPage from "../InlineErrorPage/InlineErrorPage";
import InlineLink from "../InlineLink/InlineLink";
import { OrdersHistory } from "../../features/orders/OrdersHistory";
import utilStyles from "../../App/utilStyles.module.css";
import styles from "./AccountPage.module.css";

export default function AccountPage() {
  // https://reactrouter.com/en/main/hooks/use-route-loader-data
  const authData = useRouteLoaderData("app") as AuthData;

  if (!authData.logged_in) {
    return <InlineErrorPage pageName="Your account" type="login_required" />;
  }

  return (
    <div className={utilStyles.pagePadding}>
      <h1 className={utilStyles.h1}>Your account</h1>
      
      {/* Customer Profile Section */}
      <section className={styles.profileSection}>
        <h2>Profile Details</h2>
        <div className={styles.profileDetails}>
          <p><strong>Name:</strong> {authData.customer_name}</p>
          <p><strong>Email:</strong> {authData.email_address}</p>
          {authData.customer_age && <p><strong>Age:</strong> {authData.customer_age}</p>}
          <p><strong>Loyalty Points:</strong> {authData.loyalty_pts || 0}</p>
        </div>
      </section>

      {/* Loyalty Program Section */}
      <section className={styles.loyaltySection}>
        <h2>Loyalty Program</h2>
        <p>Use your loyalty points to get discounts on your purchases!</p>
        <InlineLink path="/loyalty-program" anchor="View available rewards" />
      </section>

      {/* Orders Section */}
      <section className={styles.ordersSection}>
        <h2>Your Orders</h2>
        <p className={utilStyles.mb3rem}>
          View your previous orders below or <InlineLink path="/cart" anchor="visit your cart" />.
        </p>
        <OrdersHistory />
      </section>
    </div>
  );
}
