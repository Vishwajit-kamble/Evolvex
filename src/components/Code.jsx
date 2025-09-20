import React, { useState } from "react";
import axios from "axios";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { dark } from "react-syntax-highlighter/dist/esm/styles/prism"; // You can choose a different style
import "./Code.css"; // Import CSS for styling
import { monoBlue, monokai } from "react-syntax-highlighter/dist/esm/styles/hljs";

export const Code = () => {
  const [input, setInput] = useState("");
  const [history, setHistory] = useState([]); // Store input/output pairs
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!input.trim()) {
      setError("Please enter a prompt.");
      return;
    }

    setLoading(true);
    setError(null);

    // Add user input to history
    setHistory((prev) => [...prev, { type: "input", text: input }]);

    try {
      // Try Together API first, fallback to Gemini if needed
      let response;
      let output;
      
      try {
        // Call Together API directly
        response = await fetch("https://api.together.xyz/v1/chat/completions", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${import.meta.env.VITE_TOGETHER_API_KEY || "tgp_v1_ykDLFqDZq-VLfFEBoiILW0JtxeDmXsCATSI_UgK43NM"}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "mistralai/Mixtral-8x7B-Instruct-v0.1",
            messages: [
              {
                role: "system",
                content: "You are Evolvex, an advanced AI coding assistant. Provide detailed, accurate, and helpful responses for coding questions, debugging, and development tasks. Always format code properly with syntax highlighting when applicable."
              },
              {
                role: "user",
                content: input
              }
            ],
            max_tokens: 2000,
            temperature: 0.7,
          }),
        });

        if (!response.ok) {
          throw new Error(`Together API error: ${response.status}`);
        }

        const data = await response.json();
        output = data.choices[0].message.content || "No response generated.";
        
      } catch (togetherError) {
        console.warn("Together API failed, trying Gemini:", togetherError);
        
        // Fallback to Gemini API
        const geminiApiKey = import.meta.env.VITE_GEMINI_API_KEY;
        if (!geminiApiKey) {
          throw new Error("Together API failed and no Gemini API key available");
        }

        response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiApiKey}`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            contents: [{
              parts: [{
                text: `You are Evolvex, an advanced AI coding assistant. Provide detailed, accurate, and helpful responses for coding questions, debugging, and development tasks. Always format code properly with syntax highlighting when applicable.\n\nUser query: ${input}`
              }]
            }],
            generationConfig: {
              temperature: 0.7,
              maxOutputTokens: 2000,
            }
          }),
        });

        if (!response.ok) {
          const errorText = await response.text();
          let errorMessage = `Gemini API error: ${response.status}`;
          
          if (response.status === 404) {
            errorMessage = "Gemini API endpoint not found. Please check your API key and model configuration.";
          } else if (response.status === 400) {
            errorMessage = "Invalid request to Gemini API. Please check your input.";
          } else if (response.status === 403) {
            errorMessage = "Gemini API access denied. Please check your API key permissions.";
          } else if (response.status === 429) {
            errorMessage = "Gemini API rate limit exceeded. Please try again later.";
          }
          
          throw new Error(errorMessage);
        }

        const geminiData = await response.json();
        output = geminiData.candidates[0].content.parts[0].text || "No response generated.";
      }

      // Add output to history
      setHistory((prev) => [...prev, { type: "output", text: output }]);
    } catch (err) {
      console.error("Together API Error:", err);
      
      // More specific error handling
      if (err.message.includes("401") || err.message.includes("Unauthorized")) {
        setError("API authentication failed. Please check your API key.");
      } else if (err.message.includes("429")) {
        setError("API rate limit exceeded. Please try again later.");
      } else if (err.message.includes("500")) {
        setError("Server error. Please try again later.");
      } else {
        setError("Failed to process request: " + err.message);
      }
    } finally {
      setLoading(false);
      setInput(""); // Clear input after submission
    }
  };

  // Custom renderer for code blocks using react-syntax-highlighter
  const renderMessage = (text) => {
    return (
      <ReactMarkdown
        remarkPlugins={[remarkGfm]} // Enable GitHub-flavored markdown
        components={{
          code({ node, inline, className, children, ...props }) {
            const match = /language-(\w+)/.exec(className || "");
            const language = match ? match[1] : "text"; // Default to plain text if no language specified

            return !inline ? (
              <SyntaxHighlighter
                style={monokai} // Choose your preferred style
                language={language}
                PreTag="div" // Use div instead of pre for better styling control
                className="code-block"
                {...props}
              >
                {String(children).replace(/\n$/, "")}{" "}
                {/* Remove trailing newline */}
              </SyntaxHighlighter>
            ) : (
              <code style={{whiteSpace:"pre-line"}} className={className} {...props}>
                {children}
              </code>
            );
          },
          p({ children }) {
            return <p className="text-content">{children}</p>; // Preserve newlines in paragraphs
          },
        }}
      >
        {text}
      </ReactMarkdown>
    );
  };

  return (
    <div className="Code">
      <h2>EVOLVEX CODE AGENT</h2>
      {history.length > 0 && ( // Only show chat container when history has items
        <div className="chat-container">
          {history.map((item, index) => (
            <div
              key={index}
              className={
                item.type === "input" ? "user-message" : "output-message"
              }
            >
              <strong>{item.type === "input" ? "User" : "Evolvex"}</strong> 
              {renderMessage(item.text)}
            </div>
          ))}
        </div>
      )}
      {error && <p className="error">{error}</p>}
      <form onSubmit={handleSubmit} className="input-form">
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Enter the prompt to continue..."
          rows="5"
          cols="50"
          disabled={loading}
        />
        <button
          type="submit"
          className={`submit-btn ${loading ? "proc" : ""}`}
          disabled={loading}
        >
          {loading ? "Processing..." : "Submit"}
        </button>
      </form>
    </div>
  );
};
