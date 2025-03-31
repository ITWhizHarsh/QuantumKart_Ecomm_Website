import { OrderItemData } from "./orderItemData";
import { OrderItem } from "./OrderItem";
import utilStyles from "../../App/utilStyles.module.css";
import { Link, Form } from "react-router-dom";
import { getProductDetailPath, getProductImagePath } from "../products/utils";
import { formatCurrency } from "../../utils/currency";


/**
 * Returns a user-friendly version of the provided back-end API datetime string.
 * 
 * @privateremarks
 * Uses `Date.toLocaleString()` as described in
 * {@link https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Date/toLocaleString} and
 * {@link https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Intl/DateTimeFormat/DateTimeFormat}
 * 
 * @example
 * `getDateTimeString("2023-11-20T20:35:03.846Z")` returns `"20/11/2023, 20:35"`.
 * 
 * @param rawString - The back-end API datetime string to convert
 * @returns A formatted, user-friendly representation of `rawString`
 */
export function getDateTimeString(rawString: string) {
  const n: "numeric" = "numeric";
  const options = { year: n, month: n, day: n, hour: n, minute: n };
  return new Date(rawString).toLocaleString("en-GB", options);
}


/**
 * Returns JSX for a table of order items (cart items or completed order items).
 * 
 * @param orderItemsData - An array of cart (pending order) items or completed order items
 * @param editable - Whether it should be possible for the user to remove cart items
 * @returns JSX that displays a table of order items
 */
export function renderOrderItems(orderItemsData: OrderItemData[], editable: boolean) {
  const itemsCount = orderItemsData.length;
  if (itemsCount === 0) {
    return <p className={utilStyles.emptyFeedMessage}>Your cart is empty.</p>;
  }
  
  return (
    <table className={utilStyles.orderTable}>
      <thead>
        <tr>
          <th>Product</th>
          <th>Name</th>
          <th>Price</th>
          <th>Quantity</th>
          <th>Total</th>
          {editable && <th>Action</th>}
        </tr>
      </thead>
      <tbody>
        {orderItemsData.map((item) => {
          const { product_id, product_name, product_price, product_quantity } = item;
          const productPath = getProductDetailPath(product_id, product_name);
          const imagePath = getProductImagePath(product_id, product_name);
          const numericPrice = parseFloat(product_price.replace(/[^0-9.-]+/g, ''));
          const itemTotal = numericPrice * product_quantity;
          
          return (
            <tr key={product_id}>
              <td className="image-cell">
                <img src={imagePath} alt={product_name} height="80" width="80" />
              </td>
              <td>
                <Link to={productPath}>
                  {product_name}
                </Link>
              </td>
              <td>{formatCurrency(product_price)}</td>
              <td>{product_quantity}</td>
              <td>{formatCurrency(itemTotal)}</td>
              {editable && (
                <td>
                  <Form method="post">
                    <input type="hidden" name="product_id" value={product_id}></input>
                    <input type="hidden" name="product_name" value={product_name}></input>
                    <button type="submit" className={utilStyles.buttonSmall}>Remove</button>
                  </Form>
                </td>
              )}
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
