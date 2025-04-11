import { Form, redirect, useActionData, useRouteLoaderData } from "react-router-dom";
import React, { useState } from 'react';

import { AuthData } from "./authData";
import InlineLink from "../../components/InlineLink/InlineLink";
import utilStyles from "../../App/utilStyles.module.css";
import GoogleAuthButton from "./GoogleAuthButton";


export async function registerAction({ request }: { request: Request }) {
  // https://reactrouter.com/en/main/start/tutorial#data-writes--html-forms
  // https://reactrouter.com/en/main/route/action
  let formData = await request.formData();
  try {
    const email_address = formData.get("email_address");
    const password = formData.get("password");
    const customer_name = formData.get("customer_name");
    
    console.log(`Attempting to register with email: ${email_address}`);
    console.log(`API URL: ${process.env.REACT_APP_API_BASE_URL}/auth/register`);
    
    const res = await fetch(
      `${process.env.REACT_APP_API_BASE_URL}/auth/register`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ 
          email_address, 
          password, 
          customer_name
        })
      }
    );

    if (res.ok) {
      console.log("Registration successful");
      return redirect("/account");
    } else if (res.status === 400) {
      const errorText = await res.text();
      console.error(`Registration failed with 400 error: ${errorText}`);
      return errorText || "Sorry, someone is already registered with this email address.";
    } else {
      const errorText = await res.text();
      console.error(`Registration failed with status ${res.status}: ${errorText}`);
      return `Registration failed (${res.status}): ${errorText}`;
    }
  } catch (error) {
    console.error("Registration error:", error);
    return "Sorry, registration failed. Please try again later.";
  }
}


export function RegistrationPage() {
  // https://reactrouter.com/en/main/components/form
  // https://reactrouter.com/en/main/hooks/use-action-data
  // https://reactrouter.com/en/main/hooks/use-route-loader-data
  const authData = useRouteLoaderData("app") as AuthData;
  const registrationError = useActionData() as string | undefined;
  const [userType, setUserType] = useState('user');

  const loginLink = <InlineLink path="/login" anchor="log in" />;
  const loggedOutContent = (
    <>Create an account or alternatively sign in with Google.
    If you already have an account, please {loginLink} instead.</>
  );
  const loggedInContent = <>You are already logged in as {authData.email_address}.</>;

  const handleUserTypeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newUserType = e.target.value;
    setUserType(newUserType);
    
    // Immediately redirect if manufacturer is selected
    if (newUserType === 'manufacturer') {
      window.location.href = '/manufacturer-registration';
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    // Removed the redirection logic - it's now in handleUserTypeChange
  };

  return (
    <div className={`${utilStyles.pagePadding} ${utilStyles.mw80rem}`}>
      <h1 className={utilStyles.h1}>Create your account</h1>
      <p className={utilStyles.mb2rem}>{authData.logged_in ? loggedInContent : loggedOutContent}</p>
      <Form method="post" className={utilStyles.stackedForm} onSubmit={handleSubmit}>
        <div className={utilStyles.formGroup}>
          <label>
            <input
              type="radio"
              name="userType"
              value="user"
              checked={userType === 'user'}
              onChange={handleUserTypeChange}
            />
            Register as User
          </label>
          <label>
            <input
              type="radio"
              name="userType"
              value="manufacturer"
              checked={userType === 'manufacturer'}
              onChange={handleUserTypeChange}
            />
            Register as Manufacturer
          </label>
        </div>
        <label htmlFor="email_address" className={utilStyles.label}>Email</label>
        <input id="email_address" className={utilStyles.input} type="email" name="email_address" minLength={5} required />
        
        <label htmlFor="password" className={utilStyles.label}>Password</label>
        <input id="password" className={utilStyles.input} type="password" name="password" minLength={8} maxLength={25} required />
        
        <label htmlFor="customer_name" className={utilStyles.label}>Your Name</label>
        <input id="customer_name" className={utilStyles.input} type="text" name="customer_name" minLength={2} required />
        
        <button type="submit" className={utilStyles.button}>Register</button>
      </Form>
      <p>{registrationError ? registrationError : null}</p>
      <hr className={utilStyles.separator} />
      <GoogleAuthButton />
    </div>
  );
}