import { useEffect, useState } from "react";
import { Navigate, useParams } from "react-router-dom";


// https://docs.stripe.com/checkout/embedded/quickstart?client=react&lang=node
// https://docs.stripe.com/payments/accept-a-payment?platform=web&ui=embedded-form#return-page
export default function PaymentReturn() {

  const { orderId } = useParams();
  const [status, setStatus] = useState<string | null>(null);
  const [orderConfirmed, setOrderConfirmed] = useState(false);

  useEffect(() => {
    // Fetch payment status (completed or failed/cancelled)
    const urlParams = new URLSearchParams(window.location.search);
    const sessionId = urlParams.get("session_id");
    const basePath = `${process.env.REACT_APP_API_BASE_URL}/checkout/payment-session-status`;

    fetch(`${basePath}?order_id=${orderId}&session_id=${sessionId}`)
      .then((res) => res.json())
      .then((data: { status: string }) => {
        setStatus(data.status);
      });
  }, [orderId]);

  useEffect(() => {
    // Update database upon successful payment
    if (status === "complete" && !orderConfirmed) {
      const urlParams = new URLSearchParams(window.location.search);
      const sessionId = urlParams.get("session_id");
      
      // Use confirm-payment to get updated loyalty points
      const confirmPaymentPath = `${process.env.REACT_APP_API_BASE_URL}/checkout/confirm-payment`;

      // Add credentials to ensure the session is included
      fetch(`${confirmPaymentPath}?order_id=${orderId}&session_id=${sessionId}`, { 
        method: "POST",
        credentials: "include"
      })
        .then(res => res.json())
        .then(data => {
          console.log("Order confirmation response:", data);
          
          // Store updated loyalty points in session storage
          if (data.currentLoyaltyPoints !== undefined) {
            sessionStorage.setItem('currentLoyaltyPoints', data.currentLoyaltyPoints.toString());
            console.log("Updated loyalty points in session storage:", data.currentLoyaltyPoints);
          }
          
          setOrderConfirmed(true);
        })
        .catch(err => {
          console.error("Error confirming payment:", err);
          // Still set orderConfirmed to true to proceed
          setOrderConfirmed(true);
        });
    }
  }, [status, orderConfirmed, orderId]);

  if (status === "open") {
    // Payment failed or cancelled; redirect to payment page to try again
    return <Navigate to={`/checkout/${orderId}/payment`} />;
  }

  if (status === "complete" && orderConfirmed) {
    // Payment succeeded
    return <Navigate to={`/checkout/${orderId}/success`} />;
  }

  return null;
}
