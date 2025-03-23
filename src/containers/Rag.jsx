import React, { useState } from "react";
import axios from "axios";

export const Rag = () => {
  const [csvFile, setCsvFile] = useState(null);
  const [pdfFile, setPdfFile] = useState(null);
  const [query, setQuery] = useState("");
  const [history, setHistory] = useState([]);
  const [uploadedFiles, setUploadedFiles] = useState({ csv: null, pdf: null });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // Update this to match your Flask backend URL
  const backendUrl = "https://falcons-algoforge.onrender.com";
  
  const handleFileUpload = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    const formData = new FormData();
    if (csvFile) formData.append("csv_file", csvFile);
    if (pdfFile) formData.append("pdf_file", pdfFile);

    if (!csvFile && !pdfFile) {
      setError("Please upload at least one file (CSV or PDF).");
      setLoading(false);
      return;
    }

    try {
      const response = await axios.post(backendUrl, formData, {
        headers: { 
          "Content-Type": "multipart/form-data",
        },
        withCredentials: false
      });
      
      setUploadedFiles(response.data.files || { 
        csv: csvFile ? csvFile.name : null, 
        pdf: pdfFile ? pdfFile.name : null 
      });
      
      setError("");
      alert(response.data.message || "Files uploaded successfully");
    } catch (err) {
      console.error("Upload error:", err);
      if (err.message.includes("Network Error") || err.message.includes("CORS")) {
        setError("CORS error: Backend server is not accepting requests from this origin.");
      } else {
        setError(
          err.response?.data?.error || 
          `Error uploading files: ${err.message || "Unknown error"}`
        );
      }
    } finally {
      setLoading(false);
    }
  };

  const handleQuerySubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    if (!query.trim()) {
      setError("Please enter a query.");
      setLoading(false);
      return;
    }

    // Using FormData as your Flask backend expects form data
    const formData = new FormData();
    formData.append("query", query);

    try {
      const response = await axios.post(backendUrl, formData, {
        headers: { 
          "Content-Type": "multipart/form-data" 
        },
        withCredentials: false
      });
      
      setHistory([...history, { 
        query, 
        response: response.data.response || "No response received" 
      }]);
      
      setQuery("");
      if (response.data.files) {
        setUploadedFiles(response.data.files);
      }
    } catch (err) {
      console.error("Query error:", err);
      if (err.message.includes("Network Error") || err.message.includes("CORS")) {
        setError("CORS error: Backend server is not accepting requests from this origin.");
      } else {
        setError(
          err.response?.data?.error || 
          `Error processing query: ${err.message || "Unknown error"}`
        );
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: "20px", maxWidth: "600px", margin: "0 auto" }}>
      <h1>Talk to Your Files</h1>

      {/* File Upload Section */}
      <form onSubmit={handleFileUpload}>
        <div style={{ marginBottom: "10px" }}>
          <label style={{ display: "block", marginBottom: "5px" }}>Upload CSV: </label>
          <input
            type="file"
            accept=".csv"
            onChange={(e) => setCsvFile(e.target.files[0])}
            style={{ width: "100%" }}
          />
        </div>
        <div style={{ marginBottom: "10px" }}>
          <label style={{ display: "block", marginBottom: "5px" }}>Upload PDF: </label>
          <input
            type="file"
            accept=".pdf"
            onChange={(e) => setPdfFile(e.target.files[0])}
            style={{ width: "100%" }}
          />
        </div>
        <button 
          type="submit" 
          style={{ 
            marginTop: "10px",
            padding: "8px 16px",
            backgroundColor: "#4CAF50",
            color: "white",
            border: "none",
            borderRadius: "4px",
            cursor: loading ? "not-allowed" : "pointer",
            opacity: loading ? 0.7 : 1
          }}
          disabled={loading}
        >
          {loading ? "Uploading..." : "Upload Files"}
        </button>
      </form>

      {/* Display Uploaded Files */}
      {(uploadedFiles.csv || uploadedFiles.pdf) && (
        <div style={{ 
          marginTop: "15px", 
          padding: "10px", 
          backgroundColor: "#e8f5e9", 
          borderRadius: "4px" 
        }}>
          <h3 style={{ margin: "0 0 10px 0" }}>Uploaded Files:</h3>
          {uploadedFiles.csv && <p style={{ margin: "5px 0" }}>CSV: {uploadedFiles.csv}</p>}
          {uploadedFiles.pdf && <p style={{ margin: "5px 0" }}>PDF: {uploadedFiles.pdf}</p>}
        </div>
      )}

      {/* Query Section */}
      <form onSubmit={handleQuerySubmit} style={{ marginTop: "20px" }}>
        <label style={{ display: "block", marginBottom: "5px" }}>Ask a Question: </label>
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Type your question here"
          style={{ 
            width: "100%", 
            marginBottom: "10px", 
            padding: "8px",
            borderRadius: "4px",
            border: "1px solid #ddd"
          }}
        />
        <button 
          type="submit"
          style={{ 
            padding: "8px 16px",
            backgroundColor: "#2196F3",
            color: "white",
            border: "none",
            borderRadius: "4px",
            cursor: (loading || (!uploadedFiles.csv && !uploadedFiles.pdf)) ? "not-allowed" : "pointer",
            opacity: (loading || (!uploadedFiles.csv && !uploadedFiles.pdf)) ? 0.7 : 1
          }}
          disabled={loading || (!uploadedFiles.csv && !uploadedFiles.pdf)}
        >
          {loading ? "Processing..." : "Submit Query"}
        </button>
      </form>

      {/* Error Message */}
      {error && (
        <div style={{ 
          marginTop: "15px",
          padding: "10px", 
          backgroundColor: "#ffebee", 
          borderRadius: "4px",
          color: "#c62828"
        }}>
          <p style={{ margin: 0 }}><strong>Error:</strong> {error}</p>
        </div>
      )}

      {/* History Section */}
      <div style={{ marginTop: "30px" }}>
        <h2>Conversation History</h2>
        {history.length === 0 ? (
          <p>No queries yet. Upload files and ask a question to get started.</p>
        ) : (
          history.map((item, index) => (
            <div 
              key={index} 
              style={{ 
                marginBottom: "15px", 
                padding: "15px", 
                backgroundColor: "#f5f5f5", 
                borderRadius: "4px",
                boxShadow: "0 1px 3px rgba(0,0,0,0.12)"
              }}
            >
              <p style={{ 
                margin: "0 0 10px 0", 
                fontWeight: "bold",
                color: "#2196F3"
              }}>
                You: {item.query}
              </p>
              <p style={{ 
                margin: 0, 
                whiteSpace: "pre-wrap"
              }}>
                <span style={{ fontWeight: "bold" }}>Response:</span> {item.response}
              </p>
            </div>
          ))
        )}
      </div>
    </div>
  );
};