import React, { useState, useEffect } from 'react';
import { useRouteLoaderData } from 'react-router-dom';
import { AuthData } from '../../auth/authData';
import utilStyles from '../../../App/utilStyles.module.css';

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

const AddProduct: React.FC = () => {
  const loaderData = useRouteLoaderData("manufacturer") as any || {};
  const authData = loaderData?.authData as AuthData;
  const [formData, setFormData] = useState<ProductFormData>({
    name: '',
    short_description: '',
    long_description: '',
    price: 0,
    stock_count: 0,
    category_id: '',
    image: null
  });
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Fetch categories on component mount
    const fetchCategories = async () => {
      try {
        console.log('Fetching categories...');
        const res = await fetch(
          `${process.env.REACT_APP_API_BASE_URL}/categories`,
          { 
            credentials: "include",
            headers: {
              "Accept": "application/json"
            }
          }
        );
        
        if (!res.ok) {
          console.error('Failed to fetch categories:', res.status);
          const errorText = await res.text();
          console.error('Categories error response:', errorText);
          return;
        }
        
        const data = await res.json();
        console.log('Categories loaded:', data);
        setCategories(data);
      } catch (err) {
        console.error('Error fetching categories:', err);
      }
    };
    
    fetchCategories();
  }, []);

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
    setLoading(true);
    setError(null);
    setSuccess(false);
    
    console.log('Submitting product form:', formData);
    console.log('Auth data:', authData);
    
    try {
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
      
      // Include information about the image naming pattern for the server
      if (formData.image) {
        // Create a slug from the product name
        const nameSlug = formData.name.toLowerCase()
          .replace(/[^a-z0-9 -]/g, '')  // Remove invalid chars
          .replace(/\s+/g, '-')         // Replace spaces with -
          .replace(/-+/g, '-');         // Collapse multiple dashes
          
        console.log('Product slug for image naming:', nameSlug);
        productFormData.append('product_name_slug', nameSlug);
        productFormData.append('image', formData.image);
      }
      
      console.log('FormData created, sending request...');
      
      const res = await fetch(
        `${process.env.REACT_APP_API_BASE_URL}/manufacturer/products`,
        {
          method: 'POST',
          body: productFormData,
          credentials: 'include'
        }
      );
      
      if (!res.ok) {
        console.error('Error status:', res.status);
        const errorText = await res.text();
        console.error('Error adding product:', errorText);
        throw new Error(`Failed to add product: ${res.status} - ${errorText}`);
      }
      
      const data = await res.json();
      console.log('Product added successfully:', data);
      
      // Reset form
      setFormData({
        name: '',
        short_description: '',
        long_description: '',
        price: 0,
        stock_count: 0,
        category_id: '',
        image: null
      });
      
      // Reset file input
      const fileInput = document.getElementById('image') as HTMLInputElement;
      if (fileInput) fileInput.value = '';
      
      setSuccess(true);
      setLoading(false);
    } catch (err) {
      console.error('Error adding product:', err);
      setError(err instanceof Error ? err.message : 'Failed to add product. Please try again.');
      setLoading(false);
    }
  };

  return (
    <div className={utilStyles.container}>
      <h2 className={utilStyles.h2}>Add New Product</h2>
      
      {success && (
        <div className={utilStyles.successMessage}>
          Product added successfully!
        </div>
      )}
      
      {error && (
        <div className={utilStyles.error}>
          {error}
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
          <input
            type="file"
            id="image"
            name="image"
            onChange={handleFileChange}
            accept="image/*"
            className={utilStyles.fileInput}
          />
        </div>
        
        <button 
          type="submit" 
          className={utilStyles.primaryButton}
          disabled={loading}
        >
          {loading ? 'Adding Product...' : 'Add Product'}
        </button>
      </form>
    </div>
  );
};

export default AddProduct; 