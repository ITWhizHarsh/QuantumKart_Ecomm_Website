import { useEffect, useState } from "react";
import { useParams, useRouteLoaderData, useNavigate } from "react-router-dom";
// Comment out Stripe imports
// import { loadStripe } from "@stripe/stripe-js";
// import { EmbeddedCheckoutProvider, EmbeddedCheckout } from "@stripe/react-stripe-js";

import { AuthData } from "../auth/authData";
import InlineErrorPage from "../../components/InlineErrorPage/InlineErrorPage";
import utilStyles from "../../App/utilStyles.module.css";


// Comment out Stripe initialization
// const stripePromise = loadStripe(`${process.env.REACT_APP_STRIPE_PUBLIC_KEY}`);

export default function PaymentPage() {
  
  const { orderId } = useParams();
  const authData = useRouteLoaderData("app") as AuthData;
  // Comment out clientSecret state
  // const [clientSecret, setClientSecret] = useState("");
  const navigate = useNavigate();
  const [isConfirming, setIsConfirming] = useState(false);

  // Comment out Stripe session creation
  /*
  useEffect(() => {
    // Create a Checkout Session as soon as the page loads
    const basePath = `${process.env.REACT_APP_API_BASE_URL}/checkout/create-payment-session`;
    console.log('Making request to:', basePath);
    
    fetch(`${basePath}?order_id=${orderId}`,
    {
      method: "POST",
      credentials: "include",
    })
      .then((res) => {
        if (!res.ok) throw new Error('Failed to create payment session');
        return res.json();
      })
      .then((data: { clientSecret: string }) => {
        console.log('Received clientSecret:', data.clientSecret);
        setClientSecret(data.clientSecret);
      })
      .catch((error) => console.error('Error fetching payment session:', error));
  }, [orderId]);
  */

  function handleConfirmPayment() {
    console.log(`Attempting to confirm payment for order ID: ${orderId}`);
    
    if (!orderId) {
      console.error('No order ID available');
      alert('Error: No order ID found. Please try again.');
      return;
    }
    
    setIsConfirming(true);
    
    // Confirm the existing order instead of creating a new one
    const apiUrl = `${process.env.REACT_APP_API_BASE_URL}/orders/confirm-order/${orderId}`;
    console.log('Making request to:', apiUrl);
    
    fetch(apiUrl, {
      method: "POST",
      credentials: "include",
      headers: {
        'Content-Type': 'application/json'
      },
      // Disable cache to prevent issues
      cache: 'no-cache',
    })
      .then((res) => {
        console.log('Response status:', res.status);
        if (!res.ok) {
          console.error('Server response not OK:', res.status);
          return res.text().then(text => {
            console.error('Error response body:', text);
            throw new Error(`Failed to confirm payment: ${res.status}. Details: ${text}`);
          });
        }
        return res.json();
      })
      .then((data) => {
        console.log('Order confirmed successfully:', data);
        
        // Navigate to order success page instead of homepage to refresh auth data
        navigate(`/checkout/${orderId}/success`);
      })
      .catch((error) => {
        console.error('Error confirming order:', error);
        alert(`Error: ${error.message}. Please try again.`);
        setIsConfirming(false);
      });
  }

  if (!authData.logged_in) {
    return <InlineErrorPage pageName="Order failed" type="login_required" loginRedirect="/orders" />;
  }

  return (
    <div className={utilStyles.pagePadding} id="checkout">
      <h1 className={utilStyles.h1}>Complete your payment below</h1>
      <p>The payment system (Stripe) is in test mode, so no payment will be made.</p>
      <p>Feel free to use the following details:</p>
      <ul className={utilStyles.mb3rem}>
        <li><strong>Email: </strong>test@example.com</li>
        <li><strong>Card number: </strong>4242 4242 4242 4242</li>
        <li><strong>Expiry date: </strong>12/34</li>
        <li><strong>CVC: </strong>123</li>
        <li><strong>Name: </strong>John Smith</li>
        <li><strong>Postcode: </strong>A1 1AB</li>
      </ul>
      
      {/* Remove Stripe Checkout and replace with direct button */}
      <button
        onClick={handleConfirmPayment}
        className={`${utilStyles.button} ${utilStyles.primaryButton}`}
        style={{ 
          fontSize: '1.2rem', 
          padding: '12px 24px', 
          marginTop: '1rem',
          backgroundColor: '#FFA500',
          color: '#000000',
          fontWeight: 'bold',
          border: '2px solid #000000',
          cursor: isConfirming ? 'wait' : 'pointer',
          opacity: isConfirming ? '0.7' : '1',
          borderRadius: '8px'
        }}
        disabled={isConfirming}
      >
        {isConfirming ? 'Processing...' : 'Confirm Payment'}
      </button>
    </div>
  )
}
