import React, { useEffect, useRef, useState } from "react";
import {
  BrowserRouter,
  Route,
  Routes,
  Navigate,
  useLocation,
} from "react-router-dom";
import "./App.css";
import { Navbar } from "./components/Navbar";
import { Footer } from "./components/Footer";
import { File404 } from "./components/File404";
import { Code } from "./components/Code";
import { UnderDev } from "./components/UnderDev";
import { Hero } from "./components/Hero";
import { CiVolumeHigh, CiVolumeMute } from "react-icons/ci";
import mp3 from "./assets/bg.mp3";
import { Documentation } from "./components/Documentation";
import { Login } from "./components/Login";
import { Trend } from "./containers/Trend";
import { Blog } from "./containers/Blog";

// Create an Auth Context
const AuthContext = React.createContext();

function App() {
  const [isMuted, setIsMuted] = useState(true);
  const [user, setUser] = useState(null); // Store user data including email

  // Function to handle login
  const login = (userData) => {
    setUser(userData);
    localStorage.setItem("user", JSON.stringify(userData)); // Persist user data
  };

  // Function to handle logout
  const logout = () => {
    setUser(null);
    localStorage.removeItem("user");
  };

  // Check for existing user on mount
  useEffect(() => {
    const storedUser = localStorage.getItem("user");
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }
  }, []);

  const toggleMute = () => {
    setIsMuted(!isMuted);
  };

  const BackgroundSound = () => {
    const audioRef = React.useRef(null);

    useEffect(() => {
      if (audioRef.current) {
        audioRef.current.muted = isMuted;
        if (!isMuted) {
          audioRef.current
            .play()
            .catch((e) => console.log("Autoplay prevented:", e));
        }
      }
    }, [isMuted]);
    return (
      <>
        <audio ref={audioRef} src={mp3} loop autoPlay muted={isMuted}>
          Your browser does not support the audio element.
        </audio>
        <button onClick={toggleMute} className="sound-toggle">
          {isMuted ? <CiVolumeMute /> : <CiVolumeHigh />}
        </button>
      </>
    );
  };

  // Protected Route component
  const ProtectedRoute = ({ children }) => {
    const { user } = useAuth();
    const location = useLocation();

    if (!user && location.pathname !== "/evolvex-signin") {
      return (
        <Navigate to="/evolvex-signin" state={{ from: location }} replace />
      );
    }
    return children;
  };
  useEffect(() => {
    window.addEventListener("beforeunload", logout);
    return () => window.removeEventListener("beforeunload", logout);
  }, []);

  return (
    <AuthContext.Provider value={{ user, login, logout }}>
      <BackgroundSound />
      <BrowserRouter>
        <Navbar />
        <Routes>
          <Route path="/evolvex-signin" element={<Login />} />
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <Hero />
              </ProtectedRoute>
            }
          />
          <Route
            path="/evolvex-code-agentic-ai"
            element={
              <ProtectedRoute>
                <Code />
              </ProtectedRoute>
            }
          />
          <Route
            path="/evolvex-creative-agentic-ai"
            element={
              <ProtectedRoute>
                <UnderDev />
              </ProtectedRoute>
            }
          />
          <Route
            path="/evolvex-student-agentic-ai"
            element={
              <ProtectedRoute>
                <UnderDev />
              </ProtectedRoute>
            }
          />
          <Route
            path="/evolvex-business-agentic-ai"
            element={
              <ProtectedRoute>
                <Trend />
              </ProtectedRoute>
            }
          />
          <Route path="/blog/:id" element={<Blog />} />
          <Route
            path="/evolvex-documentation"
            element={
              <ProtectedRoute>
                <Documentation />
              </ProtectedRoute>
            }
          />
          <Route path="*" element={<File404 />} />
        </Routes>
        <Footer />
      </BrowserRouter>
    </AuthContext.Provider>
  );
}

// Custom hook to use auth context
export const useAuth = () => React.useContext(AuthContext);

export default App;
