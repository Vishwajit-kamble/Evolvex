import React, { useState } from "react";
import { useAuth } from "../App"; // Adjust path as needed
import { useNavigate } from "react-router-dom";
import { auth } from "../firebase.js"; // Adjust path to your firebase config file
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
} from "firebase/auth";
import sorc from "../assets/trends.png";

export const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSignUp, setIsSignUp] = useState(false); // Toggle between sign-in and sign-up
  const [error, setError] = useState(""); // Handle errors
  const { login } = useAuth();
  const navigate = useNavigate();

  // Handle both sign-in and sign-up
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(""); // Reset error state

    try {
      let userCredential;
      if (isSignUp) {
        // Sign up with Firebase
        userCredential = await createUserWithEmailAndPassword(
          auth,
          email,
          password
        );
      } else {
        // Sign in with Firebase
        userCredential = await signInWithEmailAndPassword(
          auth,
          email,
          password
        );
      }

      // Extract user data from Firebase response
      const userData = {
        email: userCredential.user.email,
        uid: userCredential.user.uid, // Firebase user ID
      };

      // Call the login function from context to update app state
      login(userData);
      navigate("/"); // Redirect to home page after successful login/signup
    } catch (err) {
      // Handle errors (e.g., wrong password, user not found, etc.)
      setError(err.message);
    }
  };

  // Toggle between sign-in and sign-up modes
  const toggleAuthMode = () => {
    setIsSignUp(!isSignUp);
    setError(""); // Clear error when toggling
  };

  return (
    <div className="login-container">
      <div className="lplt">
        <h2><span>EVOLVEX</span> <br />{isSignUp ? "SIGN UP" : "SIGN IN"}</h2>
        <form onSubmit={handleSubmit}>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Email"
            required
          />
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password"
            required
          />
          <button type="submit">{isSignUp ? "Sign Up" : "Sign In"}</button>
        </form>
        {/* Display error message if any */}
        {error && <p style={{ color: "red" }}>Invalid Credentials</p>}

        {/* Toggle between sign-in and sign-up */}
        <p>
          {isSignUp ? "Already have an account?" : "Don't have an account yet?"}{" "}
          <button type="button" onClick={toggleAuthMode}>
            {isSignUp ? "Sign In" : "Sign Up"}
          </button>
        </p>
      </div>
      <img src={sorc} alt="Market Analysis" className="mrktan" />
    </div>
  );
};
