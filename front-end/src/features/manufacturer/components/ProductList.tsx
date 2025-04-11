import React, { useState, useEffect } from 'react';
import { useRouteLoaderData } from 'react-router-dom';
import { AuthData } from '../../auth/authData';
import utilStyles from '../../../App/utilStyles.module.css';

interface Product {
  id: number;
  name: string;
  short_description: string;
  long_description: string;
  price: number | string;
  stock_count: number;
  available_stock_count: number;
  avg_rating: number;
  rating_count: number;
  image_path: string;
}

const ProductList: React.FC = () => {
  // Use manufacturer loader data instead of app loader
  const loaderData = useRouteLoaderData("manufacturer") as any || {};
  const authData = loaderData?.authData as AuthData;
  
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [debugInfo, setDebugInfo] = useState<string>("");
  const [deleteStatus, setDeleteStatus] = useState<{ isDeleting: boolean, productId: number | null }>({
    isDeleting: false,
    productId: null
  });

  useEffect(() => {
    console.log("ProductList component mounted, authData:", authData);
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    try {
      setLoading(true);
      setError(null);
      setSuccessMessage(null);
      setDebugInfo("Starting fetch process...\n");
      
      // Log auth data
      setDebugInfo(prev => prev + `Auth data: ${JSON.stringify(authData)}\n`);
      console.log("Auth data available:", authData);
      
      if (!authData || !authData.id) {
        setDebugInfo(prev => prev + "ERROR: No valid auth data found\n");
        setError("Authentication error: Please log in again");
        setLoading(false);
        return;
      }

      // Check API base URL
      const apiBaseUrl = process.env.REACT_APP_API_BASE_URL || "";
      setDebugInfo(prev => prev + `API Base URL: ${apiBaseUrl}\n`);
      
      if (!apiBaseUrl) {
        setDebugInfo(prev => prev + "ERROR: API Base URL is missing\n");
        setError("Configuration error: API URL not defined");
        setLoading(false);
        return;
      }

      // Simple network test - try to fetch anything from the API
      try {
        setDebugInfo(prev => prev + "Testing API connection with diagnostic endpoint...\n");
        let testRes: Response | null = null;
        
        // Try manufacturer diagnostic endpoint first
        try {
          const manufacturerRes = await fetch(`${apiBaseUrl}/manufacturer/diagnostic`, { 
            credentials: "include",
            headers: {
              "Accept": "application/json"
            }
          });
          testRes = manufacturerRes;
          
          setDebugInfo(prev => prev + `Manufacturer diagnostic test status: ${manufacturerRes.status}\n`);
        } catch (firstErr) {
          setDebugInfo(prev => prev + `Manufacturer diagnostic error: ${firstErr}\n`);
          
          // If that fails, try auth/status endpoint as fallback
          try {
            setDebugInfo(prev => prev + "Trying auth/status endpoint...\n");
            const authRes = await fetch(`${apiBaseUrl}/auth/status`, { 
              credentials: "include",
              headers: {
                "Accept": "application/json"
              }
            });
            testRes = authRes;
            
            setDebugInfo(prev => prev + `Auth status test status: ${authRes.status}\n`);
          } catch (secondErr) {
            setDebugInfo(prev => prev + `Auth status error: ${secondErr}\n`);
            
            // If all attempts fail, try a basic ping to the server
            setDebugInfo(prev => prev + "Trying base URL ping...\n");
            try {
              const pingRes = await fetch(`${apiBaseUrl}/`, { 
                credentials: "include"
              });
              testRes = pingRes;
              
              setDebugInfo(prev => prev + `Base URL ping status: ${pingRes.status}\n`);
            } catch (finalErr) {
              setDebugInfo(prev => prev + `Server unreachable: ${finalErr}\n`);
              throw finalErr;
            }
          }
        }
        
        // If we have a response, check if it succeeded
        if (testRes && testRes.ok) {
          try {
            const testData = await testRes.json();
            setDebugInfo(prev => prev + `Connection test response: ${JSON.stringify(testData)}\n`);
          } catch (parseErr) {
            const textData = await testRes.text();
            setDebugInfo(prev => prev + `Connection test returned non-JSON: ${textData}\n`);
          }
        } else if (testRes) {
          // We know testRes is not null at this point since we've checked
          const statusCode = testRes.status;
          setDebugInfo(prev => prev + `Connection test FAILED with status: ${statusCode}\n`);
          
          try {
            const errorText = await testRes.text();
            setDebugInfo(prev => prev + `Error response: ${errorText}\n`);
          } catch (readErr) {
            setDebugInfo(prev => prev + `Could not read error response: ${readErr}\n`);
          }
        }
      } catch (testErr) {
        setDebugInfo(prev => prev + `Network test ERROR: ${testErr}\n`);
        setError(`Connection error: Cannot reach server. ${testErr}`);
        setLoading(false);
        return;
      }
      
      // Try direct products endpoint with more detailed error handling
      setDebugInfo(prev => prev + "Fetching products...\n");
      try {
        const res = await fetch(
          `${apiBaseUrl}/manufacturer/products`,
          { 
            credentials: "include",
            headers: {
              "Accept": "application/json",
              "Content-Type": "application/json"
            }
          }
        );

        setDebugInfo(prev => prev + `Products API response status: ${res.status}\n`);
        
        if (!res.ok) {
          const errorText = await res.text();
          setDebugInfo(prev => prev + `Error response: ${errorText}\n`);
          
          // Try the fix endpoint as fallback
          setDebugInfo(prev => prev + "Trying fix-products endpoint...\n");
          const fixRes = await fetch(
            `${apiBaseUrl}/manufacturer/fix-products`,
            { 
              method: 'POST',
              credentials: "include",
              headers: {
                "Accept": "application/json",
                "Content-Type": "application/json"
              }
            }
          );
          
          setDebugInfo(prev => prev + `Fix API response status: ${fixRes.status}\n`);
          
          if (fixRes.ok) {
            const fixData = await fixRes.json();
            setDebugInfo(prev => prev + `Fix result: ${JSON.stringify(fixData)}\n`);
            
            // Try fetching products again
            setDebugInfo(prev => prev + "Retrying products fetch...\n");
            const retryRes = await fetch(
              `${apiBaseUrl}/manufacturer/products`,
              { credentials: "include" }
            );
            
            setDebugInfo(prev => prev + `Retry response status: ${retryRes.status}\n`);
            
            if (retryRes.ok) {
              const retryData = await retryRes.json();
              setDebugInfo(prev => prev + `Got ${retryData.length || 0} products\n`);
              setProducts(retryData || []);
            } else {
              throw new Error(`Retry failed with status: ${retryRes.status}`);
            }
          } else {
            throw new Error(`Fix endpoint failed with status: ${fixRes.status}`);
          }
        } else {
          const productsData = await res.json();
          setDebugInfo(prev => prev + `Got ${productsData.length || 0} products\n`);
          setProducts(productsData || []);
        }
      } catch (err) {
        setDebugInfo(prev => prev + `ERROR: ${err}\n`);
        throw err;
      }
      
      setLoading(false);
    } catch (err) {
      console.error("Error fetching products:", err);
      setDebugInfo(prev => prev + `Final error: ${err}\n`);
      setError("Failed to load products. Please check console for details.");
      setLoading(false);
    }
  };

  const handleDelete = async (productId: number) => {
    if (!window.confirm('Are you sure you want to delete this product?')) {
      return;
    }
    
    try {
      setDeleteStatus({ isDeleting: true, productId });
      setError(null);
      console.log(`Deleting product ${productId}...`);
      setDebugInfo(prev => prev + `Sending delete request for product ID: ${productId}\n`);
      
      const apiBaseUrl = process.env.REACT_APP_API_BASE_URL || "";
      if (!apiBaseUrl) {
        throw new Error("API base URL is missing");
      }
      
      const url = `${apiBaseUrl}/manufacturer/products/${productId}`;
      setDebugInfo(prev => prev + `Delete URL: ${url}\n`);
      
      const res = await fetch(url, {
        method: 'DELETE',
        credentials: 'include',
        headers: {
          "Accept": "application/json",
          "Content-Type": "application/json"
        }
      });
      
      setDebugInfo(prev => prev + `Delete response status: ${res.status}\n`);
      
      // Handle different response types
      let responseData: any = null;
      const contentType = res.headers.get('content-type') || '';
      
      if (contentType.includes('application/json')) {
        try {
          responseData = await res.json();
          setDebugInfo(prev => prev + `Delete response data (JSON): ${JSON.stringify(responseData)}\n`);
        } catch (jsonError) {
          setDebugInfo(prev => prev + `Error parsing JSON response: ${jsonError}\n`);
          
          // If we fail to parse as JSON, we can't try text() because the body stream is already consumed
          responseData = { message: 'Failed to parse JSON response' };
        }
      } else {
        try {
          const textResponse = await res.text();
          setDebugInfo(prev => prev + `Delete response data (text): ${textResponse}\n`);
          responseData = { message: textResponse };
        } catch (textError) {
          setDebugInfo(prev => prev + `Error reading text response: ${textError}\n`);
          responseData = { message: `Response status: ${res.status}` };
        }
      }
      
      if (!res.ok) {
        console.error(`Failed to delete product: ${res.status}`);
        console.error('Response:', responseData);
        throw new Error(responseData?.message || `Failed to delete product: ${res.status}`);
      }

      console.log('Delete successful:', responseData);
      setDebugInfo(prev => prev + `Delete successful: ${responseData?.message || 'Product deleted'}\n`);
      
      // Show success message
      setSuccessMessage(`Product deleted successfully`);
      
      // Clear success message after 3 seconds
      setTimeout(() => {
        setSuccessMessage(null);
      }, 3000);
      
      // Remove the product from the state
      setProducts(products.filter(product => product.id !== productId));
      setDeleteStatus({ isDeleting: false, productId: null });
    } catch (err) {
      console.error("Error deleting product:", err);
      setDebugInfo(prev => prev + `Error deleting product: ${err instanceof Error ? err.message : String(err)}\n`);
      setError(err instanceof Error ? err.message : "Failed to delete product. Please try again.");
      setDeleteStatus({ isDeleting: false, productId: null });
    }
  };

  const getImageUrl = (product: Product) => {
    if (!product.image_path || product.image_path.trim() === '') {
      return 'https://via.placeholder.com/300x450?text=No+Image';
    }
    
    // Check if it's already a full URL
    if (product.image_path.startsWith('http://') || product.image_path.startsWith('https://')) {
      return product.image_path;
    }
    
    // If image_path already contains the product-images prefix, use it directly
    if (product.image_path.includes('product-images/')) {
      return `${process.env.REACT_APP_API_BASE_URL}/${product.image_path}`;
    }
    
    // Otherwise, use the path as is, ensuring the product-images prefix
    return `${process.env.REACT_APP_API_BASE_URL}/product-images/${product.image_path}`;
  };
  
  // Format price to handle different formats from backend and use Rs as currency
  const formatPrice = (price: number | string): string => {
    if (price === null || price === undefined) {
      return 'Rs 0.00';
    }
    
    if (typeof price === 'string') {
      // Handle PostgreSQL money type (e.g., "$99.99" or "₹99.99")
      if (price.startsWith('$')) {
        return price.replace('$', 'Rs ');
      }
      if (price.startsWith('₹')) {
        return price.replace('₹', 'Rs ');
      }
      
      // Try to parse the string as a number
      const numericPrice = parseFloat(price.replace(/[^0-9.-]+/g, ''));
      if (!isNaN(numericPrice)) {
        return `Rs ${numericPrice.toFixed(2)}`;
      }
      
      return price; // Return as is if we can't parse it
    }
    
    // Handle numeric price
    return `Rs ${price.toFixed(2)}`;
  };

  if (loading) return <div>Loading products...</div>;
  
  return (
    <div className={utilStyles.container}>
      <h2 className={utilStyles.h2}>Your Products</h2>
      
      {error && (
        <div className={utilStyles.error}>
          <p>{error}</p>
          <details>
            <summary>Debug Information</summary>
            <pre style={{ whiteSpace: 'pre-wrap', textAlign: 'left' }}>{debugInfo}</pre>
          </details>
        </div>
      )}
      
      {successMessage && <div className={utilStyles.success}>{successMessage}</div>}
      
      {!loading && products.length === 0 && !error && (
        <div>
          <p>You haven't added any products yet. Use the "Add Product" tab to create your first product.</p>
          <details>
            <summary>Debug Information</summary>
            <pre style={{ whiteSpace: 'pre-wrap', textAlign: 'left' }}>{debugInfo}</pre>
          </details>
          <div style={{ display: 'flex', gap: '10px', marginTop: '1rem' }}>
            <button 
              onClick={fetchProducts} 
              className={utilStyles.primaryButton}
            >
              Refresh Products
            </button>
          </div>
        </div>
      )}
      
      {products.length > 0 && (
        <>
          <div className={utilStyles.productGrid}>
            {products.map(product => (
              <div key={product.id} className={utilStyles.productCard}>
                <img 
                  src={getImageUrl(product)} 
                  alt={product.name} 
                  className={utilStyles.productImage}
                  onError={(e) => {
                    // If image fails to load, replace with placeholder
                    (e.target as HTMLImageElement).src = 'https://via.placeholder.com/300x450?text=Image+Not+Found';
                  }} 
                />
                <div className={utilStyles.productInfo}>
                  <h3>{product.name}</h3>
                  <p>{product.short_description || 'No description available'}</p>
                  <p className={utilStyles.price}>{formatPrice(product.price)}</p>
                  <div style={{ marginTop: 'auto' }}>
                    <p>Stock: {product.available_stock_count || 0} / {product.stock_count || 0}</p>
                    {product.avg_rating > 0 && (
                      <p>Rating: {typeof product.avg_rating === 'string' ? parseFloat(product.avg_rating).toFixed(1) : product.avg_rating.toFixed(1)} ({product.rating_count} reviews)</p>
                    )}
                    <div className={utilStyles.buttonGroup}>
                      <button
                        onClick={() => handleDelete(product.id)}
                        className={utilStyles.dangerButton}
                        disabled={deleteStatus.isDeleting && deleteStatus.productId === product.id}
                      >
                        {deleteStatus.isDeleting && deleteStatus.productId === product.id
                          ? 'Deleting...'
                          : 'Delete'
                        }
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
          <button 
            onClick={fetchProducts} 
            className={utilStyles.secondaryButton}
            style={{ marginTop: '1rem' }}
          >
            Refresh Products
          </button>
        </>
      )}
    </div>
  );
};

export default ProductList; 