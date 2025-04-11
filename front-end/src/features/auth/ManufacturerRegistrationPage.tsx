import React from 'react';
import { Form, redirect } from 'react-router-dom';
import utilStyles from '../../App/utilStyles.module.css';

export async function manufacturerRegisterAction({ request }: { request: Request }) {
  let formData = await request.formData();
  try {
    const email_address = formData.get('email_address');
    const password = formData.get('password');
    const company_name = formData.get('company_name');

    console.log(`Attempting to register manufacturer with email: ${email_address}`);
    console.log(`API URL: ${process.env.REACT_APP_API_BASE_URL}/auth/register-manufacturer`);

    const res = await fetch(
      `${process.env.REACT_APP_API_BASE_URL}/auth/register-manufacturer`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          email_address,
          password,
          company_name
        })
      }
    );

    if (res.ok) {
      console.log('Manufacturer registration successful');
      return redirect('/manufacturer-dashboard');
    } else {
      const errorText = await res.text();
      console.error(`Registration failed with status ${res.status}: ${errorText}`);
      return `Registration failed (${res.status}): ${errorText}`;
    }
  } catch (error) {
    console.error('Registration error:', error);
    return 'Sorry, registration failed. Please try again later.';
  }
}

export const ManufacturerRegistrationPage: React.FC = () => {
  return (
    <div className={`${utilStyles.pagePadding} ${utilStyles.mw80rem}`}>
      <h1 className={utilStyles.h1}>Register as Manufacturer</h1>
      <Form method="post" className={utilStyles.stackedForm}>
        <label htmlFor="email_address" className={utilStyles.label}>Email</label>
        <input id="email_address" className={utilStyles.input} type="email" name="email_address" minLength={5} required />
        
        <label htmlFor="password" className={utilStyles.label}>Password</label>
        <input id="password" className={utilStyles.input} type="password" name="password" minLength={8} maxLength={25} required />
        
        <label htmlFor="company_name" className={utilStyles.label}>Company Name</label>
        <input id="company_name" className={utilStyles.input} type="text" name="company_name" minLength={2} required />
        
        <button type="submit" className={utilStyles.button}>Register</button>
      </Form>
    </div>
  );
};

export default ManufacturerRegistrationPage; 