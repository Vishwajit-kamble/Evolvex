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
      const response = await axios.post(
        "https://evolvex.onrender.com/api/code",
        { input },
        { timeout: 50000 } // 30-second timeout
      );
      const output = response.data.output || "No output returned.";

      // Add output to history
      setHistory((prev) => [...prev, { type: "output", text: output }]);
    } catch (err) {
      setError(
        "Failed to process request: " +
          (err.response?.data?.error || err.message)
      );
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
