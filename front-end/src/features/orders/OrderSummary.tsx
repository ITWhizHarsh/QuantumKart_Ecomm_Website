import { Link } from "react-router-dom";

import { getDateTimeString } from "./utils";
import styles from "./OrderSummary.module.css";
import utilStyles from "../../App/utilStyles.module.css";
import { formatCurrency } from "../../utils/currency";


type OrderSummaryProps = {
  orderData: OrderSummaryData,
  /** Whether the order summary is the final one in a list, which renders an additional separator line */
  lastItem?: boolean
}

export type OrderSummaryData = {
  order_id: number,
  order_placed_time: string,
  order_status: string,
  total_cost: string
}


export default function OrderSummary({ orderData, lastItem }: OrderSummaryProps) {
  const { order_id, order_placed_time, order_status, total_cost } = orderData;
  
  // Debug log to see what's actually coming in
  console.log(`Order #${order_id} total_cost:`, total_cost, 'type:', typeof total_cost);
  
  const formattedTime = getDateTimeString(order_placed_time);
  const orderDetailsPath = `/orders/${order_id}`;
  
  // Format order status for better display
  const formattedStatus = order_status
    .replace(/_/g, ' ')  // Replace underscores with spaces
    .replace(/(\w)(\w*)/g, (_, first, rest) => first.toUpperCase() + rest);  // Capitalize first letter of each word

  // Direct approach to price display
  const formattedPrice = `Rs ${total_cost}`;

  return (
    <div className={styles.orderSummary}>
      <hr className={utilStyles.separator} />
      <article className={styles.flexContainer}>
        <div className={styles.contentContainer}>
          <strong>
            <Link to={orderDetailsPath} className={`${utilStyles.largeText} ${utilStyles.link}`}>
              {formattedStatus}
            </Link>
          </strong>
          <div className={`${utilStyles.mt1rem} ${utilStyles.smallText} ${utilStyles.bold}`}>{formattedTime}</div>
          <div className={utilStyles.mt1rem}>{formattedPrice}</div>
        </div>
        <div>
          <Link to={orderDetailsPath} className={utilStyles.button}>View details</Link>
        </div>
      </article>
      {lastItem ? <hr className={utilStyles.separator} /> : null}
    </div>
  );
}
