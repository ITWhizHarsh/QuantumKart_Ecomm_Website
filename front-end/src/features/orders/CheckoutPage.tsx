import { Form, Link, redirect, useActionData, useLoaderData, useRouteLoaderData } from "react-router-dom";
import { useState, useEffect } from "react";

import { AuthData } from "../auth/authData";
import { CartLoaderData } from "./Cart";
import { renderOrderItems } from "./utils";
import InlineErrorPage from "../../components/InlineErrorPage/InlineErrorPage";
import { formatCurrency } from "../../utils/currency";

import utilStyles from "../../App/utilStyles.module.css";
import styles from "./Checkout.module.css";

type Address = {
  address_id: number;
  house_no: string;
  locality: string;
  city: string;
  country: string;
  postcode: string;
};

export async function checkoutAction({ request }: { request: Request }) {
  // https://reactrouter.com/en/main/start/tutorial#data-writes--html-forms
  // https://reactrouter.com/en/main/route/action
  let formData = await request.formData();
  try {
    const addressType = formData.get("addressType");
    const redeemPoints = formData.get("redeemLoyaltyPoints") === "on";
    
    // Different handling based on whether using saved address or new address
    let requestBody: any = {
      redeemPoints
    };
    
    if (addressType === "saved") {
      const addressId = formData.get("savedAddress");
      requestBody = {
        ...requestBody,
        address_id: addressId
      };
    } else {
      // New address
      requestBody = {
        ...requestBody,
        house_no: formData.get("house_no"),
        locality: formData.get("locality"),
        city: formData.get("city"),
        country: formData.get("country"),
        postcode: formData.get("postcode"),
        saveAddress: formData.get("saveAddress") === "on"
      };
    }
    
    console.log('Sending checkout request with:', requestBody);
    
    const res = await fetch(
      `${process.env.REACT_APP_API_BASE_URL}/checkout/create-pending-order`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(requestBody)
      }
    );

    if (res.ok) {
      const { order_id }: { order_id: number } = await res.json();
      return redirect(`/checkout/${order_id}/payment`);
    }
    throw new Error("Unexpected status code.");
  } catch (error) {
    console.error('Checkout error:', error);
    return { checkoutErrMsg: "Sorry, your order could not be completed. Please try again later." };
  }
}


export function CheckoutPage() {
  // https://reactrouter.com/en/main/hooks/use-route-loader-data
  const authData = useRouteLoaderData("app") as AuthData;
  const { cartData, cartLoaderErrMsg } = useLoaderData() as CartLoaderData;
  const checkoutActionData = useActionData() as { checkoutErrMsg: string } | undefined;
  const checkoutErrMsg = checkoutActionData?.checkoutErrMsg;
  
  const [addressType, setAddressType] = useState<"saved" | "new">("saved");
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [redeemLoyaltyPoints, setRedeemLoyaltyPoints] = useState(false);
  const [totalCost, setTotalCost] = useState(0);
  const [discountedCost, setDiscountedCost] = useState(0);

  useEffect(() => {
    if (authData.logged_in && authData.id) {
      fetchAddresses();
    }
    
    // Calculate total cost
    const cost = calculateTotalCost();
    setTotalCost(cost);
    setDiscountedCost(cost);
  }, [authData, cartData]);
  
  // Recalculate discounted cost when redeem points changes
  useEffect(() => {
    if (redeemLoyaltyPoints && authData.loyalty_pts) {
      // Apply loyalty points discount - convert points to currency value (1:1 ratio)
      const discount = Math.min(authData.loyalty_pts, totalCost);
      setDiscountedCost(totalCost - discount);
    } else {
      setDiscountedCost(totalCost);
    }
  }, [redeemLoyaltyPoints, totalCost, authData.loyalty_pts]);

  const fetchAddresses = async () => {
    try {
      const res = await fetch(
        `${process.env.REACT_APP_API_BASE_URL}/customers/${authData.id}/addresses`,
        { credentials: "include" }
      );
      if (res.ok) {
        const data = await res.json();
        setAddresses(data);
        
        // If no saved addresses, default to new address form
        if (data.length === 0) {
          setAddressType("new");
        }
      } else {
        console.error("Failed to fetch addresses");
        setError("Could not load your saved addresses. Please enter a new address.");
        setAddressType("new");
      }
    } catch (err) {
      console.error("Error fetching addresses:", err);
      setError("Could not load your saved addresses. Please enter a new address.");
      setAddressType("new");
    } finally {
      setIsLoading(false);
    }
  };

  if (!authData.logged_in) {
    return <InlineErrorPage pageName="Checkout" type="login_required" loginRedirect="/cart" />;
  } else if (cartLoaderErrMsg) {
    return <InlineErrorPage pageName="Checkout" message={cartLoaderErrMsg} />;
  } else if (cartData.length === 0) {
    return <InlineErrorPage pageName="Checkout" message="Your cart is empty so it is not possible to checkout." />;
  }

  function calculateTotalCost() {
    let cost = 0;
    cartData.forEach(item => {
      // Extract numeric value from the price string by removing currency symbols
      const numericPrice = parseFloat(item.product_price.replace(/[^0-9.-]+/g, ''));
      cost += numericPrice * item.product_quantity;
    });
    return cost;
  }

  const formatAddressKey = (address: Address) => {
    return address.address_id.toString();
  };

  return (
    <div className={utilStyles.pagePadding}>
      <h1 className={utilStyles.h1}>Checkout</h1>
      <p className={utilStyles.mb3rem}>Complete your order below.</p>
      <h2>Order items</h2>
      {renderOrderItems(cartData, false)}
      <div className={`${utilStyles.mb3rem} ${utilStyles.XLText}`}>
        <strong>Total cost: <span className={utilStyles.red}>{formatCurrency(totalCost)}</span></strong>
      </div>
      
      {/* Loyalty Points Redemption */}
      {(authData.loyalty_pts && authData.loyalty_pts > 0) && (
        <div className={styles.loyaltySection}>
          <h2>Loyalty Points</h2>
          <p>You have <strong>{authData.loyalty_pts}</strong> loyalty points available.</p>
          
          <label className={styles.checkboxLabel}>
            <input
              type="checkbox"
              checked={redeemLoyaltyPoints}
              onChange={(e) => setRedeemLoyaltyPoints(e.target.checked)}
            />
            Redeem my loyalty points
          </label>
          
          {redeemLoyaltyPoints && (
            <div className={styles.discountInfo}>
              <p>Points to redeem: <strong>{Math.min(authData.loyalty_pts || 0, totalCost)}</strong></p>
              <p className={styles.discountedPrice}>
                Discounted price: <strong>{formatCurrency(discountedCost)}</strong>
              </p>
            </div>
          )}
        </div>
      )}
      
      <h2>Delivery address</h2>
      {error && <p className={styles.errorMessage}>{error}</p>}
      
      {isLoading ? (
        <p>Loading your saved addresses...</p>
      ) : (
        <Form method="post" className={utilStyles.stackedForm}>
          {/* Address Type Selection */}
          <div className={styles.addressTypeSelection}>
            <label className={styles.radioLabel}>
              <input
                type="radio"
                name="addressType"
                value="saved"
                checked={addressType === "saved"}
                onChange={() => setAddressType("saved")}
                disabled={addresses.length === 0}
              />
              Use a saved address
            </label>
            <label className={styles.radioLabel}>
              <input
                type="radio"
                name="addressType"
                value="new"
                checked={addressType === "new"}
                onChange={() => setAddressType("new")}
              />
              Enter a new address
            </label>
          </div>
          
          {/* Saved Addresses */}
          {addressType === "saved" && addresses.length > 0 && (
            <div className={styles.savedAddresses}>
              <label htmlFor="savedAddress" className={utilStyles.label}>Select an address</label>
              <select 
                id="savedAddress" 
                name="savedAddress" 
                className={utilStyles.input}
                required={addressType === "saved"}
              >
                {addresses.map((address, index) => (
                  <option key={index} value={address.address_id}>
                    {address.house_no}, {address.locality}, {address.city}, {address.country}, {address.postcode}
                  </option>
                ))}
              </select>
            </div>
          )}
          
          {/* New Address Form */}
          {addressType === "new" && (
            <div className={styles.newAddressForm}>
              <div className={styles.formRow}>
                <label htmlFor="house_no" className={utilStyles.label}>House/Flat No.</label>
                <input
                  id="house_no"
                  name="house_no"
                  type="text"
                  className={utilStyles.input}
                  required={addressType === "new"}
                />
              </div>
              
              <div className={styles.formRow}>
                <label htmlFor="locality" className={utilStyles.label}>Locality</label>
                <input
                  id="locality"
                  name="locality"
                  type="text"
                  className={utilStyles.input}
                  required={addressType === "new"}
                />
              </div>
              
              <div className={styles.formRow}>
                <label htmlFor="city" className={utilStyles.label}>City</label>
                <input
                  id="city"
                  name="city"
                  type="text"
                  className={utilStyles.input}
                  required={addressType === "new"}
                />
              </div>
              
              <div className={styles.formRow}>
                <label htmlFor="country" className={utilStyles.label}>Country</label>
                <input
                  id="country"
                  name="country"
                  type="text"
                  className={utilStyles.input}
                  required={addressType === "new"}
                />
              </div>
              
              <div className={styles.formRow}>
                <label htmlFor="postcode" className={utilStyles.label}>Postcode</label>
                <input
                  id="postcode"
                  name="postcode"
                  type="text"
                  className={utilStyles.input}
                  required={addressType === "new"}
                />
              </div>
              
              <label className={styles.checkboxLabel}>
                <input 
                  type="checkbox" 
                  name="saveAddress" 
                />
                Save this address for future orders
              </label>
            </div>
          )}
          
          {/* Hidden field to pass loyalty points redemption status */}
          <input
            type="checkbox"
            name="redeemLoyaltyPoints"
            checked={redeemLoyaltyPoints}
            onChange={() => {}}
            style={{ display: 'none' }}
          />
          
          <button type="submit" className={`${utilStyles.button} ${utilStyles.primaryButton}`}>
            Proceed to payment
          </button>
          
          {checkoutErrMsg && <p className={styles.errorMessage}>{checkoutErrMsg}</p>}
          
          <div className={styles.backLink}>
            <Link to="/cart">&larr; Return to cart</Link>
          </div>
        </Form>
      )}
    </div>
  );
}
