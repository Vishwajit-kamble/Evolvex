// src/Rag.jsx
import { useState } from "react";

export const Rag = () => {
  const [csvFile, setCsvFile] = useState(null);
  const [pdfFile, setPdfFile] = useState(null);
  const [query, setQuery] = useState("");
  const [conversation, setConversation] = useState([]);
  const [message, setMessage] = useState("");
  const [isUploaded, setIsUploaded] = useState(false);

  // Single API URL for both upload and query
  const API_URL =
    import.meta.env.MODE === "development"
      ? "/api" // Proxy to falcons-algoforge.onrender.com in dev
      : "https://falcons-algoforge.onrender.com";

  const handleCsvChange = (e) => setCsvFile(e.target.files[0]);
  const handlePdfChange = (e) => setPdfFile(e.target.files[0]);

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!csvFile && !pdfFile) {
      setMessage("Please select at least one file.");
      return;
    }

    const formData = new FormData();
    if (csvFile) formData.append("csv_file", csvFile);
    if (pdfFile) formData.append("pdf_file", pdfFile);

    try {
      const res = await fetch(`${API_URL}/api/upload`, {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        throw new Error(
          `HTTP error! Status: ${res.status} - ${res.statusText}`
        );
      }

      const data = await res.json();
      if (data.success) {
        setMessage("Files uploaded successfully.");
        setIsUploaded(true);
        setConversation([]);
      } else {
        setMessage(data.message || "Error uploading files.");
      }
    } catch (err) {
      setMessage(`Error uploading files: ${err.message}`);
      console.error("Upload error:", err);
    }
  };

  const handleQuery = async (e) => {
    e.preventDefault();
    if (!query) {
      setMessage("Please enter a query.");
      return;
    }
    if (!isUploaded) {
      setMessage("Please upload files first.");
      return;
    }

    try {
      const res = await fetch(`${API_URL}/api/query`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query }),
      });

      if (!res.ok) {
        throw new Error(`HTTP error! Status: ${res.status}`);
      }

      const data = await res.json();
      if (data.success) {
        setConversation([...conversation, { query, response: data.response }]);
        setQuery("");
        setMessage("");
      } else {
        setMessage(data.message || "Error querying.");
      }
    } catch (err) {
      setMessage(`Error querying: ${err.message}`);
      console.error("Query error:", err);
    }
  };

  const handleRemove = () => {
    setCsvFile(null);
    setPdfFile(null);
    setIsUploaded(false);
    setConversation([]);
    setMessage("Files removed. Upload new files to continue.");
  };

  return (
    <div style={{ padding: "20px" }}>
      <h1>Talk to PDF</h1>

      {!isUploaded ? (
        <form onSubmit={handleUpload}>
          <div>
            <label>Upload CSV (optional): </label>
            <input type="file" accept=".csv" onChange={handleCsvChange} />
          </div>
          <div>
            <label>Upload PDF (optional): </label>
            <input type="file" accept=".pdf" onChange={handlePdfChange} />
          </div>
          <button type="submit">Upload Files</button>
        </form>
      ) : (
        <div>
          <p>
            Files uploaded: {csvFile?.name || ""} {pdfFile?.name || ""}
          </p>
          <button onClick={handleRemove}>Remove Files</button>
        </div>
      )}
      {message && <p style={{ color: "red" }}>{message}</p>}

      {isUploaded && (
        <>
          <form onSubmit={handleQuery}>
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Ask something about the documents..."
              style={{ width: "300px", marginRight: "10px" }}
            />
            <button type="submit">Send</button>
          </form>

          <div style={{ marginTop: "20px" }}>
            <h3>Conversation</h3>
            {conversation.length === 0 ? (
              <p>No queries yet.</p>
            ) : (
              <ul style={{ listStyleType: "none", padding: 0 }}>
                {conversation.map((item, index) => (
                  <li key={index} style={{ marginBottom: "15px" }}>
                    <strong>You:</strong> {item.query}
                    <br />
                    <strong>Response:</strong> {item.response}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </>
      )}
    </div>
  );
};
