import React, { useState } from "react";
import axios from "axios";
import "./Code.css"; // Import CSS for styling

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
        { timeout: 30000 } // 30-second timeout
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

  // Function to split text and code blocks
  const renderMessage = (text) => {
    const parts = [];
    let remainingText = text;
    let codeBlockIndex = 0;

    while (remainingText.length > 0) {
      const codeStart = remainingText.indexOf("```");
      if (codeStart === -1) {
        parts.push({ type: "text", content: remainingText });
        break;
      }

      // Text before code block
      if (codeStart > 0) {
        parts.push({
          type: "text",
          content: remainingText.slice(0, codeStart),
        });
      }

      // Find end of code block
      const codeEnd = remainingText.indexOf("```", codeStart + 3);
      if (codeEnd === -1) {
        parts.push({ type: "text", content: remainingText.slice(codeStart) });
        break;
      }

      // Extract code block content (without ``` markers)
      const codeContent = remainingText.slice(codeStart + 3, codeEnd).trim();
      parts.push({ type: "code", content: codeContent, key: codeBlockIndex++ });

      // Update remaining text
      remainingText = remainingText.slice(codeEnd + 3);
    }

    return parts.map((part, index) =>
      part.type === "code" ? (
        <pre key={`${part.key}-${index}`} className="code-block">
          <code>{part.content}</code>
        </pre>
      ) : (
        <p key={index}>{part.content}</p>
      )
    );
  };

  return (
    <div className="Code">
      <h2>EVOLVEX CODE AGENT</h2>
      <div className="chat-container">
        {history.map((item, index) => (
          <div
            key={index}
            className={
              item.type === "input" ? "user-message" : "output-message"
            }
          >
            <strong>{item.type === "input" ? "Input" : "Output"}:</strong>
            {renderMessage(item.text)}
          </div>
        ))}
      </div>
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
