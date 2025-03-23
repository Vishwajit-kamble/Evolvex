import React, { useState } from 'react';
import * as pdfjsLib from 'pdfjs-dist';

// Set the worker source to a local file in the public folder
pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.js';

export const Rag = () => {
  const [file, setFile] = useState(null);
  const [fileName, setFileName] = useState('');
  const [extractedText, setExtractedText] = useState('');
  const [isSubmitted, setIsSubmitted] = useState(false);

  const handleFileChange = (event) => {
    const selectedFile = event.target.files[0];
    if (selectedFile && selectedFile.type === 'application/pdf') {
      setFile(selectedFile);
      setFileName(selectedFile.name);
      setExtractedText('');
      setIsSubmitted(false);
    } else {
      setFile(null);
      setFileName('');
      setExtractedText('Please upload a valid PDF file.');
      setIsSubmitted(false);
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!file) {
      setExtractedText('No file selected.');
      return;
    }

    const fileReader = new FileReader();

    fileReader.onload = async () => {
      const arrayBuffer = fileReader.result;
      try {
        const pdf = await pdfjsLib.getDocument(arrayBuffer).promise;
        let text = '';

        for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
          const page = await pdf.getPage(pageNum);
          const textContent = await page.getTextContent();
          text += textContent.items.map((item) => item.str).join(' ') + '\n';
        }

        setExtractedText(text);
        setIsSubmitted(true);
      } catch (error) {
        setExtractedText('Error extracting text from PDF: ' + error.message);
        setIsSubmitted(true);
      }
    };

    fileReader.readAsArrayBuffer(file);
  };

  return (
    <div>
      <h1>Upload a PDF</h1>
      <form onSubmit={handleSubmit}>
        <input
          type="file"
          accept="application/pdf"
          onChange={handleFileChange}
        />
        <button type="submit" disabled={!file}>
          Submit
        </button>
      </form>
      {fileName && (
        <div>
          <h2>Selected File:</h2>
          <p>{fileName}</p>
        </div>
      )}
      {isSubmitted && extractedText && (
        <div>
          <h2>Extracted Text:</h2>
          <pre>{extractedText}</pre>
        </div>
      )}
      {!isSubmitted && fileName && (
        <p>Press "Submit" to extract text from {fileName}.</p>
      )}
    </div>
  );
};