import { useRouteLoaderData } from "react-router-dom";
import { AuthData } from "../auth/authData";
import InlineErrorPage from "../../components/InlineErrorPage/InlineErrorPage";
import utilStyles from "../../App/utilStyles.module.css";
import styles from "./LoyaltyProgram.module.css";

type CouponData = {
  coupon_code: string;
  reqd_pts: number;
  discount_amt: string;
  last_date: string;
};

export function LoyaltyProgram() {
  const authData = useRouteLoaderData("app") as AuthData;

  if (!authData.logged_in) {
    return <InlineErrorPage pageName="Loyalty Program" type="login_required" />;
  }

  const availablePoints = authData.loyalty_pts || 0;

  return (
    <div className={utilStyles.pagePadding}>
      <h1 className={utilStyles.h1}>Loyalty Program</h1>
      
      <section className={styles.pointsSection}>
        <h2>Your Points</h2>
        <p className={styles.pointsDisplay}>You have <strong>{availablePoints}</strong> points available</p>
      </section>

      <section className={styles.rewardsSection}>
        <h2>Available Rewards</h2>
        <p>Redeem your points for discounts on your next purchase!</p>
        
        <div className={styles.rewardsGrid}>
          {/* Example rewards - these would be fetched from the backend */}
          <div className={styles.rewardCard}>
            <h3>10% Off</h3>
            <p>Required Points: 100</p>
            <p>Valid until: Dec 31, 2024</p>
            <button 
              className={`${utilStyles.button} ${styles.redeemButton}`}
              disabled={availablePoints < 100}
            >
              Redeem
            </button>
          </div>

          <div className={styles.rewardCard}>
            <h3>20% Off</h3>
            <p>Required Points: 200</p>
            <p>Valid until: Dec 31, 2024</p>
            <button 
              className={`${utilStyles.button} ${styles.redeemButton}`}
              disabled={availablePoints < 200}
            >
              Redeem
            </button>
          </div>

          <div className={styles.rewardCard}>
            <h3>30% Off</h3>
            <p>Required Points: 300</p>
            <p>Valid until: Dec 31, 2024</p>
            <button 
              className={`${utilStyles.button} ${styles.redeemButton}`}
              disabled={availablePoints < 300}
            >
              Redeem
            </button>
          </div>
        </div>
      </section>
    </div>
  );
} 