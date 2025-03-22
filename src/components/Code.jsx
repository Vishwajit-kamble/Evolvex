import React, { useState } from "react";
import axios from "axios";

export const Code = () => {
  const [input, setInput] = useState("");
  const [output, setOutput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setOutput("");

    try {
      const response = await axios.post(
        "https://evolvex.onrender.com/api/code",
        {
          input: input,
        }
      );
      setOutput(response.data.output);
    } catch (err) {
      setError("Failed to process request: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="Code">
      <h2>EVOLVEX CODE AGENT</h2>
      {output && (
        <div>
          <h3>Output:</h3>
          <pre>{output}</pre>
        </div>
      )}
      <form onSubmit={handleSubmit}>
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Enter the prompt to continue..."
          rows="5"
          cols="50"
        />
        <br />
        <button
          type="submit"
          className={loading ? "proc" : ""}
          disabled={loading}
        >
          {loading ? "Processing..." : "Submit"}
        </button>
      </form>

      {/* {error && <p style={{ color: 'red' }}>{error}</p>} */}
    </div>
  );
};
