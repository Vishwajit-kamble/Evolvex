import React, { useState } from "react";
import axios from "axios";

export const Rag = () => {
  const [csvFile, setCsvFile] = useState(null);
  const [pdfFile, setPdfFile] = useState(null);
  const [uploadStatus, setUploadStatus] = useState("");
  const [error, setError] = useState(null);

  // API endpoint - adjust based on your deployment
  const API_URL = "https://falcons-algoforge.onrender.com/";

  const handleFileUpload = async (e) => {
    e.preventDefault();
    setUploadStatus("Uploading...");
    setError(null);

    // Check if at least one file is selected
    if (!csvFile && !pdfFile) {
      setError("Please select at least one file (CSV or PDF)");
      setUploadStatus("");
      return;
    }

    // Prepare form data
    const formData = new FormData();
    if (csvFile) formData.append("csv_file", csvFile);
    if (pdfFile) formData.append("pdf_file", pdfFile);

    try {
      const response = await axios.post(API_URL, formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
        timeout: 30000, // 30 second timeout
      });

      setUploadStatus("Files uploaded successfully!");
      console.log("Upload response:", response.data);

      // Reset files after successful upload
      setCsvFile(null);
      setPdfFile(null);
    } catch (err) {
      console.error("Detailed upload error:", {
        message: err.message,
        code: err.code,
        response: err.response?.data,
        status: err.response?.status,
      });

      if (err.response) {
        setError(`Upload failed: ${err.response.data.error || "Server error"}`);
      } else if (err.request) {
        setError("Network error: Could not reach the server");
      } else {
        setError(`Error: ${err.message}`);
      }
      setUploadStatus("");
    }
  };

  const handleCsvChange = (e) => {
    setCsvFile(e.target.files[0]);
  };

  const handlePdfChange = (e) => {
    setPdfFile(e.target.files[0]);
  };

  return (
    <div className="rag-container" style={{ padding: "20px" }}>
      <h2>File Upload for RAG Processing</h2>

      <form onSubmit={handleFileUpload}>
        <div style={{ marginBottom: "15px" }}>
          <label
            htmlFor="csvFile"
            style={{ display: "block", marginBottom: "5px" }}
          >
            Upload CSV:
          </label>
          <input
            type="file"
            id="csvFile"
            accept=".csv"
            onChange={handleCsvChange}
            style={{ display: "block" }}
          />
        </div>

        <div style={{ marginBottom: "15px" }}>
          <label
            htmlFor="pdfFile"
            style={{ display: "block", marginBottom: "5px" }}
          >
            Upload PDF:
          </label>
          <input
            type="file"
            id="pdfFile"
            accept=".pdf"
            onChange={handlePdfChange}
            style={{ display: "block" }}
          />
        </div>

        <button
          type="submit"
          disabled={(!csvFile && !pdfFile) || uploadStatus === "Uploading..."}
          style={{
            padding: "10px 20px",
            backgroundColor: "#007bff",
            color: "white",
            border: "none",
            borderRadius: "5px",
            cursor: "pointer",
          }}
        >
          Upload Files
        </button>
      </form>

      {uploadStatus && (
        <p style={{ color: "green", marginTop: "10px" }}>{uploadStatus}</p>
      )}

      {error && (
        <p style={{ color: "red", marginTop: "10px" }}>
          {error}
          {error.includes("Network error") && (
            <span> Please check if the server is running.</span>
          )}
        </p>
      )}
    </div>
  );
};
