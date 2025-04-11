import { useLoaderData } from "react-router-dom";

import { OrderSummaryData } from "./OrderSummary";
import OrderSummary from "./OrderSummary";
import utilStyles from "../../App/utilStyles.module.css";


type LoaderData = {
  ordersData: OrderSummaryData[],
  errMsg?: string
}


export async function ordersLoader() {
  // https://reactrouter.com/en/main/start/tutorial#loading-data
  // https://reactrouter.com/en/main/route/loader
  let ordersData: OrderSummaryData[] = [];
  try {
    const res = await fetch(
      `${process.env.REACT_APP_API_BASE_URL}/orders`,
      { credentials: "include" }
    );
    if (res.ok) {
      ordersData = await res.json();
      
      // Convert order_id to number if it's a string
      ordersData = ordersData.map(order => ({
        ...order,
        order_id: typeof order.order_id === 'string' ? parseInt(order.order_id) : order.order_id
      }));
      
      return { ordersData };
    }
    throw new Error("Unexpected status code.");
  } catch (error) {
    return { ordersData, errMsg: "Sorry, your orders could not be retrieved. Please try again later." };
  }
}


export function OrdersHistory() {
  // https://reactrouter.com/en/main/hooks/use-loader-data
  const { errMsg, ordersData } = useLoaderData() as LoaderData;

  function renderOrderSummaries() {
    if (errMsg) {
      return <p className={utilStyles.error}>{errMsg}</p>;
    }

    // Sort orders by date, newest first
    const sortedOrders = [...ordersData].sort((a, b) => 
      new Date(b.order_placed_time).getTime() - new Date(a.order_placed_time).getTime()
    );

    // Exclude orders with incomplete or failed payments
    const filteredOrders = sortedOrders.filter(order => 
      !order.order_status.includes("payment") && !order.order_status.includes("pending")
    );

    if (filteredOrders.length === 0) {
      return <p className={utilStyles.emptyFeedMessage}>You have no orders yet.</p>;
    }

    return filteredOrders.map((order, index) => {
      if (index + 1 === filteredOrders.length) {
        return <OrderSummary key={order.order_id} orderData={order} lastItem={true} />; 
      }
      return <OrderSummary key={order.order_id} orderData={order} />;
    });
  }

  return (
    <div className={utilStyles.mb4rem}>
      {renderOrderSummaries()}
    </div>
  );
}
