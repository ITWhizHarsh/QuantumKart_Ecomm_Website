import { Link, useLoaderData, useRouteLoaderData } from "react-router-dom";
import { LoaderFunctionArgs } from 'react-router-dom';
import { useState, useEffect } from "react";

import { AuthData } from "../auth/authData";
import { OrderItemData } from "./orderItemData";
import InlineErrorPage from "../../components/InlineErrorPage/InlineErrorPage";
import { getDateTimeString, renderOrderItems } from "./utils";
import { formatCurrency } from "../../utils/currency";

import utilStyles from "../../App/utilStyles.module.css";
import styles from "./OrderDetailsPage.module.css";


type OrderDetailsPageProps = {
  /** Whether the page is being served immediately following a successful checkout */
  checkoutSuccess?: boolean
}

type OrderData = {
  order_id: number,
  user_id: number,
  order_items: OrderItemData[],
  order_placed_time: string,
  order_status: string,
  total_cost: string,
  address: string,
  postcode: string,
  points_redeemed?: number,
  discounted_cost?: string,
  redeem_loyalty_points?: boolean
}

type LoaderData = {
  orderData: OrderData,
  errMsg: string | null
}


export async function orderDetailsLoader({ params }: LoaderFunctionArgs) {
  // https://reactrouter.com/en/main/start/tutorial#loading-data
  // https://reactrouter.com/en/main/route/loader

  let { orderData, errMsg } = { orderData: {}, errMsg: null } as LoaderData;

  try {
    const res = await fetch(
      `${process.env.REACT_APP_API_BASE_URL}/orders/${params.id}`,
      { credentials: "include" }
      );
    if (res.ok) {
      orderData = await res.json();
    } else if (res.status === 404) {
      // https://reactrouter.com/en/main/route/error-element#throwing-manually
      throw new Response("Not Found", { status: 404 });
    } else if (res.status === 401) {
      errMsg = "You must be logged in as the correct user to view this order.";
    } else {
      throw new Error("Unsuccessful order fetch.");
    }

  } catch (error: unknown) {
    if (error && typeof error === 'object' && 'status' in error && error.status === 404) {
      throw error;  // Serve 404 error page
    }
    errMsg = errMsg ? errMsg : "Sorry, this order could not be loaded. Please try again later.";
  }

  return { orderData, errMsg };
}


export function OrderDetailsPage({ checkoutSuccess }: OrderDetailsPageProps) {
  // https://reactrouter.com/en/main/hooks/use-route-loader-data
  const authData = useRouteLoaderData("app") as AuthData;
  const { orderData, errMsg } = useLoaderData() as LoaderData;
  const [currentLoyaltyPoints, setCurrentLoyaltyPoints] = useState<number | null>(null);
  
  // If checkout was successful, check session storage first for updated loyalty points
  useEffect(() => {
    // Initially set points from authData
    setCurrentLoyaltyPoints(authData.loyalty_pts || 0);
    
    if (checkoutSuccess) {
      // Check if session storage has updated loyalty points
      const storedPoints = sessionStorage.getItem('currentLoyaltyPoints');
      if (storedPoints) {
        console.log("Retrieved loyalty points from session storage:", storedPoints);
        setCurrentLoyaltyPoints(parseInt(storedPoints, 10));
        // Clear from session storage
        sessionStorage.removeItem('currentLoyaltyPoints');
        return;
      }
      
      // If no points in session storage, fetch from API
      const refreshAuthData = async () => {
        try {
          const res = await fetch(
            `${process.env.REACT_APP_API_BASE_URL}/auth/status`,
            { credentials: "include" }
          );
          if (res.ok) {
            const freshAuthData = await res.json();
            console.log("Refreshed auth data after checkout:", freshAuthData);
            if (freshAuthData.loyalty_pts !== undefined) {
              setCurrentLoyaltyPoints(freshAuthData.loyalty_pts);
            }
          }
        } catch (error) {
          console.error("Error refreshing auth data:", error);
        }
      };
      
      refreshAuthData();
    }
  }, [checkoutSuccess, authData.loyalty_pts]);

  if (!authData.logged_in) {
    return <InlineErrorPage pageName="Order details" type="login_required" loginRedirect="/orders" />;
  } else if (errMsg) {
    return <InlineErrorPage pageName="Order details" message={errMsg} />;
  }

  const { 
    address, 
    order_id, 
    order_items, 
    order_placed_time, 
    order_status, 
    postcode, 
    total_cost,
    points_redeemed,
    discounted_cost,
    redeem_loyalty_points
  } = orderData;
  
  const formattedTime = getDateTimeString(order_placed_time);
  const loyaltyPointsEarned = Math.floor(parseFloat(total_cost) * 0.1);
  
  // Use a null check to avoid rendering "0" accidentally
  const displayLoyaltyPoints = currentLoyaltyPoints !== null ? currentLoyaltyPoints : (authData.loyalty_pts || 0);

  return (
    <div className={utilStyles.pagePadding}>
      <h1 className={utilStyles.mb3rem}>Order details</h1>
      
      {checkoutSuccess ? (
        <div className={styles.successMessage}>
          <p>Your order was placed successfully!</p>
          
          {/* Show loyalty points information */}
          <div className={styles.loyaltyInfo}>
            <h3>Loyalty Points Update</h3>
            <p>You earned <strong>{loyaltyPointsEarned}</strong> loyalty points from this purchase.</p>
            
            {redeem_loyalty_points && points_redeemed && points_redeemed > 0 && (
              <p>You redeemed <strong>{points_redeemed}</strong> loyalty points for this order.</p>
            )}
            
            <p>Your current loyalty balance: <strong>{displayLoyaltyPoints}</strong> points</p>
            
            <button 
              className={styles.refreshButton}
              onClick={async () => {
                try {
                  const res = await fetch(
                    `${process.env.REACT_APP_API_BASE_URL}/auth/status`,
                    { credentials: "include" }
                  );
                  if (res.ok) {
                    const freshAuthData = await res.json();
                    console.log("Manually refreshed auth data:", freshAuthData);
                    setCurrentLoyaltyPoints(freshAuthData.loyalty_pts || 0);
                    
                    // Force refresh the app route to update loyalty points everywhere
                    window.location.reload();
                  }
                } catch (error) {
                  console.error("Error refreshing auth data:", error);
                }
              }}
            >
              Refresh Points
            </button>
          </div>
        </div>
      ) : null}
      
      <section className={utilStyles.mb3rem}>
        <h2>Key details</h2>
        <div className={styles.detailsContainer}>
          <p><span className={utilStyles.bold}>Order ID:</span> {order_id}</p>
          <p><span className={utilStyles.bold}>Status:</span> {order_status}</p>
          <p><span className={utilStyles.bold}>Placed:</span> {formattedTime}</p>
          <p><span className={utilStyles.bold}>Total cost:</span> {formatCurrency(total_cost)}</p>
          
          {/* Show discounted cost if points were redeemed */}
          {redeem_loyalty_points && discounted_cost && (
            <p><span className={utilStyles.bold}>Amount paid:</span> {formatCurrency(discounted_cost)}</p>
          )}
          
          {/* Show points redeemed */}
          {redeem_loyalty_points && points_redeemed && points_redeemed > 0 && (
            <p><span className={utilStyles.bold}>Points redeemed:</span> {points_redeemed}</p>
          )}
        </div>
      </section>
      
      <section className={utilStyles.mb3rem}>
        <h2>Items</h2>
        {renderOrderItems(order_items, false)}
      </section>
      
      <section className={utilStyles.mb3rem}>
        <h2 className={utilStyles.mb2rem}>Delivery address</h2>
        <p>{address}</p>
        <p>{postcode}</p>
      </section>
      
      <Link to="/" className={utilStyles.button}>Continue shopping</Link>
    </div>
  );
}
