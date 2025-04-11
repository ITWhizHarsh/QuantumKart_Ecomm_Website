import { createBrowserRouter } from "react-router-dom";

import AccountPage from "./components/AccountPage/AccountPage";
import { App, authLoader } from "./App/App";
import { Cart, cartLoader } from "./features/orders/Cart";
import { CheckoutPage, checkoutAction } from "./features/orders/CheckoutPage";
import { removeCartItemAction } from "./features/orders/OrderItem";
import FallbackErrorPage from "./components/FallbackErrorPage/FallbackErrorPage";
import { LoginPage, loginAction } from "./features/auth/LoginPage";
import { ManufacturerRegistrationPage, manufacturerRegisterAction } from "./features/auth/ManufacturerRegistrationPage";
import { OrderDetailsPage, orderDetailsLoader } from "./features/orders/OrderDetailsPage";
import { ordersLoader } from "./features/orders/OrdersHistory";
import PaymentPage from "./features/orders/PaymentPage";
import PaymentReturn from "./features/orders/PaymentReturn";
import { ProductDetail, productDetailLoader, addToCartAction } from "./features/products/ProductDetail";
import { ProductFeed, productFeedLoader } from "./features/products/ProductFeed";
import { RegistrationPage, registerAction } from "./features/auth/RegistrationPage";
import ManufacturerDashboard, { manufacturerDashboardLoader } from "./features/manufacturer/ManufacturerDashboard";
import EditProduct from "./features/manufacturer/components/EditProduct";


// https://reactrouter.com/en/main/routers/create-browser-router
export const router = createBrowserRouter([
  {
    path: "/",
    element: <App />,
    errorElement: <FallbackErrorPage />,
    loader: authLoader,
    id: "app",
    children: [
      {
        path: "",
        element: <ProductFeed />,
        loader: productFeedLoader,
      },
      {
        path: "account",
        element: <AccountPage />,
        loader: ordersLoader
      },
      {
        path: "cart",
        element: <Cart />,
        loader: cartLoader,
        action: removeCartItemAction,
      },
      {
        path: "category/:categorySlug",
        element: <ProductFeed />,
        loader: productFeedLoader,
      },
      {
        path: "checkout",
        element: <CheckoutPage />,
        loader: cartLoader,
        action: checkoutAction,
      },
      {
        path: "checkout/:orderId/payment",
        element: <PaymentPage />,
      },
      {
        path: "checkout/:orderId/payment-return",
        element: <PaymentReturn />,
      },
      {
        path: "checkout/:id/success",
        element: <OrderDetailsPage checkoutSuccess={true} />,
        loader: orderDetailsLoader,
      },
      {
        path: "login",
        element: <LoginPage />,
        action: loginAction,
      },
      {
        path: "orders/:id",
        element: <OrderDetailsPage />,
        loader: orderDetailsLoader,
      },
      {
        path: "products/:id/:productNameSlug",
        element: <ProductDetail />,
        loader: productDetailLoader,
        action: addToCartAction,
      },
      {
        path: "register",
        element: <RegistrationPage />,
        action: registerAction,
      },
      {
        path: "manufacturer-registration",
        element: <ManufacturerRegistrationPage />,
        action: manufacturerRegisterAction,
      },
      {
        path: "search",
        element: <ProductFeed isSearchResults={true} />,
        loader: productFeedLoader,
      },
    ],
  },
  // Separate route for manufacturer dashboard that doesn't use the App wrapper component
  {
    path: "/manufacturer-dashboard",
    element: <ManufacturerDashboard />,
    errorElement: <FallbackErrorPage />,
    loader: async () => {
      console.log("Running manufacturer dashboard route loader");
      
      // First get auth data to ensure the user is authenticated
      const authData = await authLoader();
      console.log("Auth data from authLoader:", authData);
      
      if (!authData.logged_in || authData.auth_method !== 'manufacturer') {
        throw new Response("Authentication required", { status: 401 });
      }
      
      try {
        // Then get the dashboard data
        const dashboardData = await manufacturerDashboardLoader();
        console.log("Dashboard data from manufacturerDashboardLoader:", dashboardData);
        
        // Combine the data
        return { 
          ...dashboardData,
          authData: authData
        };
      } catch (error) {
        console.error("Error in manufacturer route loader:", error);
        // Still return auth data even if dashboard data failed
        return {
          products: [],
          pendingOrders: [],
          sales: { total: 0, monthly: [] },
          reviews: [],
          authData: authData
        };
      }
    },
    id: "manufacturer",
    children: [],
  },
  {
    path: "/manufacturer-dashboard/edit-product/:productId",
    element: <EditProduct />,
    errorElement: <FallbackErrorPage />,
    loader: async ({ params }) => {
      console.log("Running edit product route loader");
      
      // First get auth data to ensure the user is authenticated
      const authData = await authLoader();
      console.log("Auth data from authLoader:", authData);
      
      if (!authData.logged_in || authData.auth_method !== 'manufacturer') {
        throw new Response("Authentication required", { status: 401 });
      }
      
      return { authData, productId: params.productId };
    },
    id: "manufacturer-edit-product",
  },
]);
