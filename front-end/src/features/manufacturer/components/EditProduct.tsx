import React, { useState, useEffect } from 'react';
import { useRouteLoaderData, useParams, useNavigate } from 'react-router-dom';
import { AuthData } from '../../auth/authData';
import utilStyles from '../../../App/utilStyles.module.css';
import styles from '../ManufacturerDashboard.module.css';

interface ProductFormData {
  name: string;
  short_description: string;
  long_description: string;
  price: number;
  stock_count: number;
  category_id: string;
  image: File | null;
}

interface Category {
  id: number;
  name: string;
  description: string;
  url_slug: string;
}

interface Product {
  id: number;
  name: string;
  short_description: string;
  long_description: string;
  price: number | string;
  stock_count: number;
  available_stock_count: number;
  image_path: string;
  avg_rating: number | string;
  rating_count: number;
  manufacturer_id: number;
}

const EditProduct: React.FC = () => {
  const { productId } = useParams<{ productId: string }>();
  const loaderData = useRouteLoaderData("manufacturer") as any || {};
  const authData = loaderData?.authData as AuthData;
  const navigate = useNavigate();
  
  const [formData, setFormData] = useState<ProductFormData>({
    name: '',
    short_description: '',
    long_description: '',
    price: 0,
    stock_count: 0,
    category_id: '',
    image: null
  });
  const [originalProduct, setOriginalProduct] = useState<Product | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [debugInfo, setDebugInfo] = useState<string>("");

  useEffect(() => {
    // Fetch product data and categories when component mounts
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);

        if (!productId) {
          throw new Error("Product ID is required");
        }
        
        setDebugInfo(prev => prev + `Fetching product ${productId}...\n`);
        
        // Fetch product data
        const productRes = await fetch(
          `${process.env.REACT_APP_API_BASE_URL}/manufacturer/products/${productId}`,
          { 
            credentials: "include",
            headers: {
              "Accept": "application/json"
            }
          }
        );
        
        if (!productRes.ok) {
          setDebugInfo(prev => prev + `Error fetching product: ${productRes.status}\n`);
          const errorText = await productRes.text();
          setDebugInfo(prev => prev + `Error response: ${errorText}\n`);
          throw new Error(`Failed to load product data: ${productRes.status}`);
        }
        
        const productData = await productRes.json();
        setDebugInfo(prev => prev + `Product data loaded\n`);
        setOriginalProduct(productData);
        
        // Initialize form with product data
        setFormData({
          name: productData.name || '',
          short_description: productData.short_description || '',
          long_description: productData.long_description || '',
          price: typeof productData.price === 'string' 
            ? parseFloat(productData.price.replace(/[^0-9.-]+/g, '')) 
            : productData.price || 0,
          stock_count: productData.stock_count || 0,
          category_id: productData.category_id?.toString() || '',
          image: null
        });
        
        // Fetch categories
        setDebugInfo(prev => prev + `Fetching categories...\n`);
        const categoryRes = await fetch(
          `${process.env.REACT_APP_API_BASE_URL}/categories`,
          { 
            credentials: "include",
            headers: {
              "Accept": "application/json"
            }
          }
        );
        
        if (!categoryRes.ok) {
          setDebugInfo(prev => prev + `Error fetching categories: ${categoryRes.status}\n`);
          const errorText = await categoryRes.text();
          setDebugInfo(prev => prev + `Categories error response: ${errorText}\n`);
          throw new Error(`Failed to load categories: ${categoryRes.status}`);
        }
        
        const categoryData = await categoryRes.json();
        setDebugInfo(prev => prev + `Categories loaded\n`);
        setCategories(categoryData);
        
        setLoading(false);
      } catch (err) {
        console.error('Error loading product data:', err);
        setDebugInfo(prev => prev + `Error: ${err instanceof Error ? err.message : String(err)}\n`);
        setError(err instanceof Error ? err.message : 'Failed to load product data');
        setLoading(false);
      }
    };
    
    fetchData();
  }, [productId]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'price' || name === 'stock_count' ? parseFloat(value) : value
    }));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setFormData(prev => ({
        ...prev,
        image: e.target.files![0]
      }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    setSuccess(false);
    
    console.log('Updating product:', formData);
    console.log('Auth data:', authData);
    setDebugInfo(prev => prev + `Updating product ${productId}...\n`);
    
    try {
      if (!productId) {
        throw new Error("Product ID is required");
      }
      
      // Create a FormData object for file upload
      const productFormData = new FormData();
      productFormData.append('name', formData.name);
      productFormData.append('short_description', formData.short_description);
      productFormData.append('long_description', formData.long_description);
      productFormData.append('price', formData.price.toString());
      productFormData.append('stock_count', formData.stock_count.toString());
      if (formData.category_id) {
        productFormData.append('category_id', formData.category_id);
      }
      
      // Include information about the image naming pattern for the server if a new image is uploaded
      if (formData.image) {
        // Create a slug from the product name
        const nameSlug = formData.name.toLowerCase()
          .replace(/[^a-z0-9 -]/g, '')  // Remove invalid chars
          .replace(/\s+/g, '-')         // Replace spaces with -
          .replace(/-+/g, '-');         // Collapse multiple dashes
          
        console.log('Product slug for image naming:', nameSlug);
        setDebugInfo(prev => prev + `Product slug for image naming: ${nameSlug}\n`);
        productFormData.append('product_name_slug', nameSlug);
        productFormData.append('image', formData.image);
      }
      
      setDebugInfo(prev => prev + `FormData created, sending PUT request...\n`);
      
      const res = await fetch(
        `${process.env.REACT_APP_API_BASE_URL}/manufacturer/products/${productId}`,
        {
          method: 'PUT',
          body: productFormData,
          credentials: 'include'
        }
      );
      
      setDebugInfo(prev => prev + `Response status: ${res.status}\n`);
      
      if (!res.ok) {
        console.error('Error status:', res.status);
        const errorText = await res.text();
        console.error('Error updating product:', errorText);
        setDebugInfo(prev => prev + `Error: ${errorText}\n`);
        throw new Error(`Failed to update product: ${res.status} - ${errorText}`);
      }
      
      const data = await res.json();
      console.log('Product updated successfully:', data);
      setDebugInfo(prev => prev + `Product updated successfully\n`);
      
      setSuccess(true);
      setSubmitting(false);
      
      // After successful update, redirect back to product list after a short delay
      setTimeout(() => {
        navigate('/manufacturer-dashboard');
      }, 2000);
    } catch (err) {
      console.error('Error updating product:', err);
      setDebugInfo(prev => prev + `Error: ${err instanceof Error ? err.message : String(err)}\n`);
      setError(err instanceof Error ? err.message : 'Failed to update product. Please try again.');
      setSubmitting(false);
    }
  };

  // Handle logout
  const handleLogout = async () => {
    try {
      const res = await fetch(
        `${process.env.REACT_APP_API_BASE_URL}/auth/logout`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
        }
      );
      if (!res.ok) {
        throw new Error("Logout failed");
      }
      navigate('/login');
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  if (loading) {
    return <div className={utilStyles.container}>Loading product data...</div>;
  }

  return (
    <div className={styles.manufacturerLayout}>
      {/* Custom header for manufacturer dashboard */}
      <header className={styles.manufacturerHeader}>
        <div className={styles.logoSection}>
          <h1 className={styles.logo}>Quantum<span className={styles.highlight}>Kart</span></h1>
        </div>
        <div className={styles.headerRight}>
          <button 
            onClick={() => navigate('/manufacturer-dashboard')}
            className={styles.backButton}
          >
            Back to Dashboard
          </button>
          <button onClick={handleLogout} className={styles.logoutButton}>Log Out</button>
        </div>
      </header>

      <div className={utilStyles.pagePadding}>
        <h1 className={utilStyles.h1}>Edit Product</h1>
      
        {success && (
          <div className={utilStyles.successMessage}>
            Product updated successfully! Redirecting...
          </div>
        )}
      
        {error && (
          <div className={utilStyles.error}>
            <p>{error}</p>
            <details>
              <summary>Debug Information</summary>
              <pre style={{ whiteSpace: 'pre-wrap', textAlign: 'left' }}>{debugInfo}</pre>
            </details>
          </div>
        )}
      
        <form onSubmit={handleSubmit} className={utilStyles.form}>
          <div className={utilStyles.formGroup}>
            <label htmlFor="name" className={utilStyles.label}>Product Name*</label>
            <input
              type="text"
              id="name"
              name="name"
              value={formData.name}
              onChange={handleChange}
              required
              className={utilStyles.input}
            />
          </div>
          
          <div className={utilStyles.formGroup}>
            <label htmlFor="short_description" className={utilStyles.label}>Short Description*</label>
            <input
              type="text"
              id="short_description"
              name="short_description"
              value={formData.short_description}
              onChange={handleChange}
              required
              className={utilStyles.input}
            />
          </div>
          
          <div className={utilStyles.formGroup}>
            <label htmlFor="long_description" className={utilStyles.label}>Long Description</label>
            <textarea
              id="long_description"
              name="long_description"
              value={formData.long_description}
              onChange={handleChange}
              rows={5}
              className={utilStyles.textarea}
            />
          </div>
          
          <div className={utilStyles.formGroup}>
            <label htmlFor="price" className={utilStyles.label}>Price (Rs)*</label>
            <input
              type="number"
              id="price"
              name="price"
              value={formData.price || ''}
              onChange={handleChange}
              step="0.01"
              min="0"
              required
              className={utilStyles.input}
            />
          </div>
          
          <div className={utilStyles.formGroup}>
            <label htmlFor="stock_count" className={utilStyles.label}>Stock Count*</label>
            <input
              type="number"
              id="stock_count"
              name="stock_count"
              value={formData.stock_count || ''}
              onChange={handleChange}
              min="0"
              required
              className={utilStyles.input}
            />
          </div>
          
          <div className={utilStyles.formGroup}>
            <label htmlFor="category_id" className={utilStyles.label}>Category</label>
            <select
              id="category_id"
              name="category_id"
              value={formData.category_id}
              onChange={handleChange}
              className={utilStyles.select}
            >
              <option value="">Select a category</option>
              {categories.map(category => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
          </div>
          
          <div className={utilStyles.formGroup}>
            <label htmlFor="image" className={utilStyles.label}>Product Image</label>
            {originalProduct?.image_path && (
              <div style={{ marginBottom: '10px' }}>
                <img 
                  src={originalProduct.image_path.startsWith('http') 
                    ? originalProduct.image_path 
                    : `${process.env.REACT_APP_API_BASE_URL}/${originalProduct.image_path.replace(/^\//, '')}`
                  } 
                  alt="Current product"
                  style={{ maxWidth: '200px', maxHeight: '200px', objectFit: 'contain' }}
                />
                <p style={{ marginTop: '5px', fontSize: '0.8rem' }}>Current image</p>
              </div>
            )}
            <input
              type="file"
              id="image"
              name="image"
              onChange={handleFileChange}
              accept="image/*"
              className={utilStyles.fileInput}
            />
            <p style={{ marginTop: '5px', fontSize: '0.8rem' }}>Upload a new image only if you want to change the current one</p>
          </div>
          
          <div className={utilStyles.buttonGroup}>
            <button 
              type="submit" 
              className={utilStyles.primaryButton}
              disabled={submitting}
            >
              {submitting ? 'Updating Product...' : 'Update Product'}
            </button>
            
            <button 
              type="button" 
              className={utilStyles.secondaryButton}
              onClick={() => navigate('/manufacturer-dashboard')}
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditProduct; 