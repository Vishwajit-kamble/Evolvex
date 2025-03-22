import React, { useState } from "react";
import axios from "axios";

export const Rag = () => {
  const [csvFile, setCsvFile] = useState(null);
  const [pdfFile, setPdfFile] = useState(null);
  const [query, setQuery] = useState("");
  const [history, setHistory] = useState([]); // Store input/output history
  const [uploadedFiles, setUploadedFiles] = useState({ csv: null, pdf: null });
  const [error, setError] = useState("");

  const backendUrl = "https://falcons-algoforge.onrender.com/";

  const handleFileUpload = async (e) => {
    e.preventDefault();
    setError("");

    const formData = new FormData();
    if (csvFile) formData.append("csv_file", csvFile);
    if (pdfFile) formData.append("pdf_file", pdfFile);

    if (!csvFile && !pdfFile) {
      setError("Please upload at least one file (CSV or PDF).");
      return;
    }

    try {
      const response = await axios.post(backendUrl, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setUploadedFiles(response.data.files);
      setError("");
      alert(response.data.message);
    } catch (err) {
      setError(err.response?.data?.error || "Error uploading files");
    }
  };

  const handleQuerySubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!query.trim()) {
      setError("Please enter a query.");
      return;
    }

    const formData = new FormData();
    formData.append("query", query);

    try {
      const response = await axios.post(backendUrl, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setHistory([...history, { query, response: response.data.response }]);
      setQuery(""); // Clear input after submission
      setUploadedFiles(response.data.files); // Update file names if changed
    } catch (err) {
      setError(err.response?.data?.error || "Error processing query");
    }
  };

  return (
    <div style={{ padding: "20px", maxWidth: "600px", margin: "0 auto" }}>
      <h1>Talk to Your Files</h1>

      {/* File Upload Section */}
      <form onSubmit={handleFileUpload}>
        <div>
          <label>Upload CSV: </label>
          <input
            type="file"
            accept=".csv"
            onChange={(e) => setCsvFile(e.target.files[0])}
          />
        </div>
        <div>
          <label>Upload PDF: </label>
          <input
            type="file"
            accept=".pdf"
            onChange={(e) => setPdfFile(e.target.files[0])}
          />
        </div>
        <button type="submit" style={{ marginTop: "10px" }}>
          Upload Files
        </button>
      </form>

      {/* Display Uploaded Files */}
      {uploadedFiles.csv && <p>Uploaded CSV: {uploadedFiles.csv}</p>}
      {uploadedFiles.pdf && <p>Uploaded PDF: {uploadedFiles.pdf}</p>}

      {/* Query Section */}
      <form onSubmit={handleQuerySubmit} style={{ marginTop: "20px" }}>
        <label>Ask a Question: </label>
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Type your question here"
          style={{ width: "100%", marginBottom: "10px" }}
        />
        <button type="submit">Submit Query</button>
      </form>

      {/* Error Message */}
      {error && <p style={{ color: "red" }}>{error}</p>}

      {/* History Section */}
      <div style={{ marginTop: "20px" }}>
        <h2>Conversation History</h2>
        {history.length === 0 ? (
          <p>No queries yet.</p>
        ) : (
          history.map((item, index) => (
            <div key={index} style={{ marginBottom: "15px" }}>
              <p>
                <strong>You:</strong> {item.query}
              </p>
              <p>
                <strong>Response:</strong> {item.response}
              </p>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
