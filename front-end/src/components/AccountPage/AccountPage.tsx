import { useEffect, useState } from "react";
import { useRouteLoaderData, useNavigate } from "react-router-dom";

import { AuthData } from "../../features/auth/authData";
import InlineErrorPage from "../InlineErrorPage/InlineErrorPage";
import InlineLink from "../InlineLink/InlineLink";
import { OrdersHistory } from "../../features/orders/OrdersHistory";
import utilStyles from "../../App/utilStyles.module.css";
import styles from "./AccountPage.module.css";

type Address = {
  address_id: number;
  house_no: string;
  locality: string;
  city: string;
  country: string;
  postcode: string;
};

type PhoneNumber = {
  phone_number: string;
};

export default function AccountPage() {
  // https://reactrouter.com/en/main/hooks/use-route-loader-data
  const authData = useRouteLoaderData("app") as AuthData;
  const navigate = useNavigate();
  
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [phoneNumbers, setPhoneNumbers] = useState<PhoneNumber[]>([]);
  const [phoneNumber, setPhoneNumber] = useState("");
  const [isEditingPhone, setIsEditingPhone] = useState(false);
  const [showAddressForm, setShowAddressForm] = useState(false);
  const [newAddress, setNewAddress] = useState({
    house_no: "",
    locality: "",
    city: "",
    country: "",
    postcode: ""
  });
  const [isLoading, setIsLoading] = useState(true);
  const [phoneError, setPhoneError] = useState("");
  const [addressError, setAddressError] = useState("");

  useEffect(() => {
    // Redirect manufacturers to their dashboard
    if (authData.logged_in && authData.auth_method === 'manufacturer') {
      navigate('/manufacturer-dashboard');
      return;
    }

    if (authData.logged_in && authData.id) {
      // Fetch addresses
      fetchAddresses();
      // Fetch phone numbers
      fetchPhoneNumbers();
    }
  }, [authData, navigate]);

  const fetchAddresses = async () => {
    try {
      const res = await fetch(
        `${process.env.REACT_APP_API_BASE_URL}/customers/${authData.id}/addresses`,
        { credentials: "include" }
      );
      if (res.ok) {
        const data = await res.json();
        setAddresses(data);
      } else {
        console.error("Failed to fetch addresses");
      }
    } catch (err) {
      console.error("Error fetching addresses:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchPhoneNumbers = async () => {
    try {
      const res = await fetch(
        `${process.env.REACT_APP_API_BASE_URL}/customers/${authData.id}/phone-numbers`,
        { credentials: "include" }
      );
      if (res.ok) {
        const data = await res.json();
        setPhoneNumbers(data);
        if (data.length > 0) {
          setPhoneNumber(data[0].phone_number);
        }
      } else {
        console.error("Failed to fetch phone numbers");
      }
    } catch (err) {
      console.error("Error fetching phone numbers:", err);
    }
  };

  const handleAddAddress = async (e: React.FormEvent) => {
    e.preventDefault();
    setAddressError("");
    
    try {
      console.log("Sending address data:", JSON.stringify(newAddress));
      const res = await fetch(
        `${process.env.REACT_APP_API_BASE_URL}/customers/${authData.id}/addresses`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(newAddress),
          credentials: "include"
        }
      );
      
      if (res.ok) {
        // Reset form and fetch updated addresses
        setNewAddress({
          house_no: "",
          locality: "",
          city: "",
          country: "",
          postcode: ""
        });
        setShowAddressForm(false);
        fetchAddresses();
      } else {
        const errorText = await res.text();
        console.error("Failed to add address:", errorText);
        setAddressError(errorText || "Failed to add address");
      }
    } catch (err) {
      console.error("Error adding address:", err);
      setAddressError("An error occurred while adding the address");
    }
  };

  const handleDeleteAddress = async (address: Address) => {
    try {
      const res = await fetch(
        `${process.env.REACT_APP_API_BASE_URL}/customers/${authData.id}/addresses/${address.address_id}`,
        {
          method: "DELETE",
          credentials: "include"
        }
      );
      
      if (res.ok) {
        fetchAddresses();
      } else {
        const errorText = await res.text();
        setAddressError(errorText || "Failed to delete address");
      }
    } catch (err) {
      console.error("Error deleting address:", err);
      setAddressError("An error occurred while deleting the address");
    }
  };

  const handleSavePhone = async (e: React.FormEvent) => {
    e.preventDefault();
    setPhoneError("");
    
    if (!phoneNumber.trim()) {
      setPhoneError("Phone number is required");
      return;
    }
    
    try {
      // If already has a phone number and editing, delete the old one first
      if (phoneNumbers.length > 0 && isEditingPhone) {
        await fetch(
          `${process.env.REACT_APP_API_BASE_URL}/customers/${authData.id}/phone-numbers/${encodeURIComponent(phoneNumbers[0].phone_number)}`,
          {
            method: "DELETE",
            credentials: "include"
          }
        );
      }
      
      // Add the new/updated phone number
      const res = await fetch(
        `${process.env.REACT_APP_API_BASE_URL}/customers/${authData.id}/phone-numbers`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ phone_number: phoneNumber }),
          credentials: "include"
        }
      );
      
      if (res.ok) {
        setIsEditingPhone(false);
        fetchPhoneNumbers();
      } else {
        const errorText = await res.text();
        console.error("Failed to add phone number:", errorText);
        setPhoneError(errorText || "Failed to add phone number");
      }
    } catch (err) {
      console.error("Error saving phone number:", err);
      setPhoneError("An error occurred while saving the phone number");
    }
  };

  const handleAddressInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setNewAddress(prev => ({ ...prev, [name]: value }));
  };

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
          <p><strong>I am:</strong> {authData.customer_name}</p>
          <p><strong>Email:</strong> {authData.email_address}</p>
          {authData.customer_age && <p><strong>Age:</strong> {authData.customer_age}</p>}
          <p><strong>Loyalty Points:</strong> {authData.loyalty_pts || 0}</p>
        </div>
      </section>

      {/* Phone Number Section */}
      <section className={styles.phoneSection}>
        <h2>Phone Number</h2>
        <div className={styles.phonesContainer}>
          {phoneError && <p className={styles.errorMessage}>{phoneError}</p>}
          
          {phoneNumbers.length > 0 && !isEditingPhone ? (
            <div className={styles.phoneDisplay}>
              <p className={styles.phoneValue}>{phoneNumbers[0].phone_number}</p>
              <button
                className={styles.editButton}
                onClick={() => {
                  setIsEditingPhone(true);
                  setPhoneNumber(phoneNumbers[0].phone_number);
                }}
              >
                Edit
              </button>
            </div>
          ) : (
            <form onSubmit={handleSavePhone} className={styles.addPhoneForm}>
              <input
                type="tel"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                placeholder="Enter phone number"
                className={styles.inputField}
                required
              />
              <button type="submit" className={styles.saveButton}>
                {phoneNumbers.length > 0 ? "Update" : "Save"}
              </button>
              {isEditingPhone && (
                <button 
                  type="button" 
                  className={styles.cancelButton}
                  onClick={() => {
                    setIsEditingPhone(false);
                    if (phoneNumbers.length > 0) {
                      setPhoneNumber(phoneNumbers[0].phone_number);
                    }
                  }}
                >
                  Cancel
                </button>
              )}
            </form>
          )}
        </div>
      </section>

      {/* Addresses Section */}
      <section className={styles.addressesSection}>
        <h2>Your Addresses</h2>
        {addressError && <p className={styles.errorMessage}>{addressError}</p>}
        
        {isLoading ? (
          <p>Loading addresses...</p>
        ) : (
          <div className={styles.addressesContainer}>
            {addresses.length > 0 ? (
              <div className={styles.addressList}>
                {addresses.map((address, index) => (
                  <div key={index} className={styles.addressCard}>
                    <p>
                      {address.house_no}, {address.locality}<br />
                      {address.city}, {address.country}<br />
                      {address.postcode}
                    </p>
                    <button 
                      className={styles.deleteButton}
                      onClick={() => handleDeleteAddress(address)}
                    >
                      Delete
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <p>No addresses added yet.</p>
            )}
            
            {!showAddressForm ? (
              <button 
                className={styles.addButton}
                onClick={() => setShowAddressForm(true)}
              >
                Add New Address
              </button>
            ) : (
              <form onSubmit={handleAddAddress} className={styles.addressForm}>
                <h3>Add New Address</h3>
                <div className={styles.formRow}>
                  <label htmlFor="house_no">House/Flat No.</label>
                  <input
                    id="house_no"
                    name="house_no"
                    type="text"
                    value={newAddress.house_no}
                    onChange={handleAddressInputChange}
                    required
                    className={styles.inputField}
                  />
                </div>
                
                <div className={styles.formRow}>
                  <label htmlFor="locality">Locality</label>
                  <input
                    id="locality"
                    name="locality"
                    type="text"
                    value={newAddress.locality}
                    onChange={handleAddressInputChange}
                    required
                    className={styles.inputField}
                  />
                </div>
                
                <div className={styles.formRow}>
                  <label htmlFor="city">City</label>
                  <input
                    id="city"
                    name="city"
                    type="text"
                    value={newAddress.city}
                    onChange={handleAddressInputChange}
                    required
                    className={styles.inputField}
                  />
                </div>
                
                <div className={styles.formRow}>
                  <label htmlFor="country">Country</label>
                  <input
                    id="country"
                    name="country"
                    type="text"
                    value={newAddress.country}
                    onChange={handleAddressInputChange}
                    required
                    className={styles.inputField}
                  />
                </div>
                
                <div className={styles.formRow}>
                  <label htmlFor="postcode">Postcode</label>
                  <input
                    id="postcode"
                    name="postcode"
                    type="text"
                    value={newAddress.postcode}
                    onChange={handleAddressInputChange}
                    required
                    className={styles.inputField}
                  />
                </div>
                
                <div className={styles.formButtons}>
                  <button type="submit" className={styles.saveButton}>
                    Save Address
                  </button>
                  <button 
                    type="button" 
                    className={styles.cancelButton}
                    onClick={() => setShowAddressForm(false)}
                  >
                    Cancel
                  </button>
                </div>
              </form>
            )}
          </div>
        )}
      </section>

      {/* Loyalty Program Section */}
      <section className={styles.loyaltySection}>
        <h2>Loyalty Program</h2>
        <p>Use your loyalty points to get discounts on your purchases!</p>
        <p className={styles.pointsDisplay}>You have <strong>{authData.loyalty_pts || 0}</strong> loyalty points available</p>
      </section>

      {/* Orders Section */}
      <section className={styles.ordersSection}>
        <h2>Your Orders</h2>
        <p className={utilStyles.mb2rem}>
          View your previous orders below or <InlineLink path="/cart" anchor="visit your cart" />.
        </p>
        <OrdersHistory />
      </section>
    </div>
  );
}
