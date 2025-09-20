import os
from flask import Flask, request, render_template, flash, jsonify
from flask_cors import CORS
from werkzeug.utils import secure_filename
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()
from langchain_community.document_loaders import CSVLoader, PyPDFLoader
from langchain.text_splitter import RecursiveCharacterTextSplitter
from langchain_community.embeddings import HuggingFaceEmbeddings
from langchain_community.vectorstores import FAISS
from langchain.chains import RetrievalQA
from langchain_together import Together
from langchain_core.documents import Document
import google.generativeai as genai

app = Flask(__name__)
app.secret_key = "supersecretkey"
CORS(app)  # Enable CORS for all routes
UPLOAD_FOLDER = "uploads"
app.config["UPLOAD_FOLDER"] = UPLOAD_FOLDER
ALLOWED_EXTENSIONS = {"csv", "pdf"}

os.makedirs(UPLOAD_FOLDER, exist_ok=True)


def allowed_file(filename):
    return "." in filename and filename.rsplit(".", 1)[1].lower() in ALLOWED_EXTENSIONS


def load_documents(csv_path, pdf_path):
    print(f"Loading CSV: {csv_path}")
    csv_loader = CSVLoader(file_path=csv_path)
    csv_docs = csv_loader.load()
    print(f"Loading PDF: {pdf_path}")
    pdf_loader = PyPDFLoader(pdf_path)
    pdf_docs = pdf_loader.load()
    return csv_docs + pdf_docs


def split_documents(docs):
    print("Splitting documents...")
    text_splitter = RecursiveCharacterTextSplitter(
        chunk_size=500, chunk_overlap=50)
    return text_splitter.split_documents(docs)


def setup_vector_store(docs):
    print("Setting up vector store...")
    embeddings = HuggingFaceEmbeddings(
        model_name="sentence-transformers/all-MiniLM-L6-v2")
    return FAISS.from_documents(docs, embeddings)


def setup_rag_chain(vector_store):
    print("Setting up RAG chain...")
    
    # Try Together API first
    together_api_key = os.environ.get("TOGETHER_API_KEY")
    gemini_api_key = os.environ.get("GEMINI_API_KEY")
    
    if together_api_key:
        try:
            print("Using Together API...")
            llm = Together(
                model="meta-llama/Llama-3-70b-chat-hf",
                together_api_key=together_api_key,
                temperature=0.7
            )
            return RetrievalQA.from_chain_type(
                llm=llm,
                chain_type="stuff",
                retriever=vector_store.as_retriever(search_kwargs={"k": 2})
            )
        except Exception as e:
            print(f"Together API failed: {e}")
            if gemini_api_key:
                print("Falling back to Gemini API...")
            else:
                raise e
    
    # Fallback to Gemini API
    if gemini_api_key:
        try:
            print("Using Gemini API...")
            genai.configure(api_key=gemini_api_key)
            model = genai.GenerativeModel('gemini-1.5-flash')
            
            # Create a custom LLM wrapper for Gemini
            class GeminiLLM:
                def __init__(self, model):
                    self.model = model
                
                def invoke(self, input_text, **kwargs):
                    response = self.model.generate_content(input_text)
                    return {"result": response.text}
            
            llm = GeminiLLM(model)
            return RetrievalQA.from_chain_type(
                llm=llm,
                chain_type="stuff",
                retriever=vector_store.as_retriever(search_kwargs={"k": 2})
            )
        except Exception as e:
            print(f"Gemini API failed: {e}")
            raise e
    
    raise ValueError("No valid API key found. Please set TOGETHER_API_KEY or GEMINI_API_KEY")


rag_chain = None


@app.route("/", methods=["GET", "POST"])
def index():
    global rag_chain
    response = None

    # Handle file upload
    if request.method == "POST" and "csv_file" in request.files:
        csv_file = request.files["csv_file"]
        pdf_file = request.files["pdf_file"]

        if not csv_file or not pdf_file:
            flash("Please upload both CSV and PDF files.")
        elif csv_file.filename == "" or pdf_file.filename == "":
            flash("No selected file.")
        elif csv_file and allowed_file(csv_file.filename) and pdf_file and allowed_file(pdf_file.filename):
            csv_filename = secure_filename(csv_file.filename)
            pdf_filename = secure_filename(pdf_file.filename)
            csv_path = os.path.join(app.config["UPLOAD_FOLDER"], csv_filename)
            pdf_path = os.path.join(app.config["UPLOAD_FOLDER"], pdf_filename)

            try:
                csv_file.save(csv_path)
                pdf_file.save(pdf_path)
                print(f"Saved CSV to: {csv_path}")
                print(f"Saved PDF to: {pdf_path}")
                if not os.path.exists(csv_path) or not os.path.exists(pdf_path):
                    raise FileNotFoundError("Files failed to save.")

                docs = load_documents(csv_path, pdf_path)
                split_docs = split_documents(docs)
                vector_store = setup_vector_store(split_docs)
                rag_chain = setup_rag_chain(vector_store)
                flash("Files uploaded and processed successfully!")
            except Exception as e:
                flash(f"Error processing files: {str(e)}")

    # Handle query submission
    if request.method == "POST" and "query" in request.form:
        query = request.form.get("query").strip()
        if not query:
            flash("Please enter a query.")
        elif not rag_chain:
            flash("Please upload files first before querying.")
        else:
            try:
                print(f"Processing query: {query}")
                response = rag_chain.invoke(query)
            except Exception as e:
                flash(f"Error querying: {str(e)}")

    return render_template("index.html", response=response)


@app.route("/upload", methods=["POST"])
def upload_files():
    global rag_chain
    try:
        csv_file = request.files.get("csv_file")
        pdf_file = request.files.get("pdf_file")

        if not csv_file and not pdf_file:
            return jsonify({"error": "No files uploaded"}), 400

        uploaded_files = []
        
        if csv_file and csv_file.filename and allowed_file(csv_file.filename):
            csv_filename = secure_filename(csv_file.filename)
            csv_path = os.path.join(app.config["UPLOAD_FOLDER"], csv_filename)
            csv_file.save(csv_path)
            uploaded_files.append(csv_filename)
            print(f"Saved CSV to: {csv_path}")

        if pdf_file and pdf_file.filename and allowed_file(pdf_file.filename):
            pdf_filename = secure_filename(pdf_file.filename)
            pdf_path = os.path.join(app.config["UPLOAD_FOLDER"], pdf_filename)
            pdf_file.save(pdf_path)
            uploaded_files.append(pdf_filename)
            print(f"Saved PDF to: {pdf_path}")

        if not uploaded_files:
            return jsonify({"error": "No valid files uploaded"}), 400

        # Process files if we have both CSV and PDF
        csv_files = [f for f in os.listdir(app.config["UPLOAD_FOLDER"]) if f.endswith('.csv')]
        pdf_files = [f for f in os.listdir(app.config["UPLOAD_FOLDER"]) if f.endswith('.pdf')]
        
        if csv_files and pdf_files:
            try:
                # Use the most recent files
                csv_path = os.path.join(app.config["UPLOAD_FOLDER"], csv_files[-1])
                pdf_path = os.path.join(app.config["UPLOAD_FOLDER"], pdf_files[-1])
                
                docs = load_documents(csv_path, pdf_path)
                split_docs = split_documents(docs)
                vector_store = setup_vector_store(split_docs)
                rag_chain = setup_rag_chain(vector_store)
                
                return jsonify({"message": "Files uploaded and processed successfully!", "files": uploaded_files})
            except Exception as e:
                return jsonify({"error": f"Error processing files: {str(e)}"}), 500
        else:
            return jsonify({"message": "Files uploaded successfully! Upload both CSV and PDF to enable querying.", "files": uploaded_files})

    except Exception as e:
        return jsonify({"error": f"Error uploading files: {str(e)}"}), 500


@app.route("/query", methods=["POST"])
def query_documents():
    global rag_chain
    try:
        data = request.get_json()
        query = data.get("query", "").strip()
        
        if not query:
            return jsonify({"error": "Please enter a query"}), 400
        
        if not rag_chain:
            return jsonify({"error": "Please upload both CSV and PDF files first before querying"}), 400
        
        try:
            print(f"Processing query: {query}")
            result = rag_chain.invoke(query)
            response_text = result.get("result", "No response generated")
            return jsonify({"response": response_text})
        except Exception as e:
            return jsonify({"error": f"Error processing query: {str(e)}"}), 500

    except Exception as e:
        return jsonify({"error": f"Error handling query: {str(e)}"}), 500


if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    print(f"Starting Flask app on port {port}")
    app.run(debug=False, host="0.0.0.0", port=port)
