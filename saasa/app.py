import os
import logging
import traceback
from datetime import datetime
from flask import Flask, request, render_template, flash, jsonify
from flask_cors import CORS
from werkzeug.utils import secure_filename
from dotenv import load_dotenv
import psutil

# Load environment variables from .env file
load_dotenv()

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler(),
        logging.FileHandler('app.log')
    ]
)
logger = logging.getLogger(__name__)

# Import AI/ML dependencies with error handling
try:
    from langchain_community.document_loaders import CSVLoader, PyPDFLoader
    from langchain.text_splitter import RecursiveCharacterTextSplitter
    from langchain_community.embeddings import HuggingFaceEmbeddings
    from langchain_community.vectorstores import FAISS
    from langchain.chains import RetrievalQA
    from langchain_together import Together
    from langchain_core.documents import Document
    import google.generativeai as genai
    AI_DEPENDENCIES_AVAILABLE = True
    logger.info("AI/ML dependencies loaded successfully")
except ImportError as e:
    logger.error(f"Failed to import AI/ML dependencies: {e}")
    AI_DEPENDENCIES_AVAILABLE = False

app = Flask(__name__)
app.secret_key = os.environ.get("SECRET_KEY", "supersecretkey")
CORS(app)  # Enable CORS for all routes

# Configuration
UPLOAD_FOLDER = "uploads"
app.config["UPLOAD_FOLDER"] = UPLOAD_FOLDER
ALLOWED_EXTENSIONS = {"csv", "pdf"}
MAX_FILE_SIZE = 10 * 1024 * 1024  # 10MB

# Create upload directory
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

# Global variables
rag_chain = None
app_start_time = datetime.now()


def allowed_file(filename):
    """Check if file extension is allowed"""
    return "." in filename and filename.rsplit(".", 1)[1].lower() in ALLOWED_EXTENSIONS

def get_file_size(file):
    """Get file size in bytes"""
    file.seek(0, 2)  # Seek to end
    size = file.tell()
    file.seek(0)  # Reset to beginning
    return size

def load_documents(csv_path, pdf_path):
    """Load documents from CSV and PDF files"""
    if not AI_DEPENDENCIES_AVAILABLE:
        raise ImportError("AI/ML dependencies not available")
    
    logger.info(f"Loading CSV: {csv_path}")
    csv_loader = CSVLoader(file_path=csv_path)
    csv_docs = csv_loader.load()
    
    logger.info(f"Loading PDF: {pdf_path}")
    pdf_loader = PyPDFLoader(pdf_path)
    pdf_docs = pdf_loader.load()
    
    return csv_docs + pdf_docs

def split_documents(docs):
    """Split documents into chunks"""
    logger.info("Splitting documents...")
    text_splitter = RecursiveCharacterTextSplitter(
        chunk_size=500, chunk_overlap=50)
    return text_splitter.split_documents(docs)

def setup_vector_store(docs):
    """Setup FAISS vector store"""
    logger.info("Setting up vector store...")
    embeddings = HuggingFaceEmbeddings(
        model_name="sentence-transformers/all-MiniLM-L6-v2")
    return FAISS.from_documents(docs, embeddings)

def setup_rag_chain(vector_store):
    """Setup RAG chain with fallback options"""
    logger.info("Setting up RAG chain...")
    
    # Try Together API first
    together_api_key = os.environ.get("TOGETHER_API_KEY")
    gemini_api_key = os.environ.get("GEMINI_API_KEY")
    
    if together_api_key:
        try:
            logger.info("Using Together API...")
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
            logger.error(f"Together API failed: {e}")
            if gemini_api_key:
                logger.info("Falling back to Gemini API...")
            else:
                raise e
    
    # Fallback to Gemini API
    if gemini_api_key:
        try:
            logger.info("Using Gemini API...")
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
            logger.error(f"Gemini API failed: {e}")
            raise e
    
    raise ValueError("No valid API key found. Please set TOGETHER_API_KEY or GEMINI_API_KEY")

@app.route("/health", methods=["GET"])
def health_check():
    """Health check endpoint for Railway monitoring"""
    try:
        # Check system resources
        cpu_percent = psutil.cpu_percent()
        memory = psutil.virtual_memory()
        
        # Check if AI dependencies are available
        ai_status = "available" if AI_DEPENDENCIES_AVAILABLE else "unavailable"
        
        # Check if RAG chain is initialized
        rag_status = "initialized" if rag_chain is not None else "not_initialized"
        
        # Calculate uptime
        uptime = datetime.now() - app_start_time
        
        return jsonify({
            "status": "healthy",
            "timestamp": datetime.now().isoformat(),
            "uptime_seconds": uptime.total_seconds(),
            "cpu_percent": cpu_percent,
            "memory_percent": memory.percent,
            "ai_dependencies": ai_status,
            "rag_chain": rag_status,
            "version": "1.0.0"
        }), 200
    except Exception as e:
        logger.error(f"Health check failed: {e}")
        return jsonify({
            "status": "unhealthy",
            "error": str(e),
            "timestamp": datetime.now().isoformat()
        }), 500


@app.route("/", methods=["GET", "POST"])
def index():
    """Main route for file upload and querying"""
    global rag_chain
    response = None

    try:
        # Handle file upload
        if request.method == "POST" and "csv_file" in request.files:
            csv_file = request.files["csv_file"]
            pdf_file = request.files["pdf_file"]

            if not csv_file or not pdf_file:
                flash("Please upload both CSV and PDF files.")
            elif csv_file.filename == "" or pdf_file.filename == "":
                flash("No selected file.")
            elif csv_file and allowed_file(csv_file.filename) and pdf_file and allowed_file(pdf_file.filename):
                # Check file sizes
                csv_size = get_file_size(csv_file)
                pdf_size = get_file_size(pdf_file)
                
                if csv_size > MAX_FILE_SIZE or pdf_size > MAX_FILE_SIZE:
                    flash(f"File size too large. Maximum size is {MAX_FILE_SIZE // (1024*1024)}MB.")
                else:
                    csv_filename = secure_filename(csv_file.filename)
                    pdf_filename = secure_filename(pdf_file.filename)
                    csv_path = os.path.join(app.config["UPLOAD_FOLDER"], csv_filename)
                    pdf_path = os.path.join(app.config["UPLOAD_FOLDER"], pdf_filename)

                    try:
                        csv_file.save(csv_path)
                        pdf_file.save(pdf_path)
                        logger.info(f"Saved CSV to: {csv_path}")
                        logger.info(f"Saved PDF to: {pdf_path}")
                        
                        if not os.path.exists(csv_path) or not os.path.exists(pdf_path):
                            raise FileNotFoundError("Files failed to save.")

                        if not AI_DEPENDENCIES_AVAILABLE:
                            flash("AI/ML dependencies not available. Please check server configuration.")
                        else:
                            docs = load_documents(csv_path, pdf_path)
                            split_docs = split_documents(docs)
                            vector_store = setup_vector_store(split_docs)
                            rag_chain = setup_rag_chain(vector_store)
                            flash("Files uploaded and processed successfully!")
                    except Exception as e:
                        logger.error(f"Error processing files: {e}")
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
                    logger.info(f"Processing query: {query}")
                    response = rag_chain.invoke(query)
                except Exception as e:
                    logger.error(f"Error querying: {e}")
                    flash(f"Error querying: {str(e)}")

    except Exception as e:
        logger.error(f"Unexpected error in index route: {e}")
        flash("An unexpected error occurred. Please try again.")

    return render_template("index.html", response=response)


@app.route("/upload", methods=["POST"])
def upload_files():
    """API endpoint for file upload"""
    global rag_chain
    
    try:
        csv_file = request.files.get("csv_file")
        pdf_file = request.files.get("pdf_file")

        if not csv_file and not pdf_file:
            return jsonify({"error": "No files uploaded"}), 400

        uploaded_files = []
        
        if csv_file and csv_file.filename and allowed_file(csv_file.filename):
            # Check file size
            csv_size = get_file_size(csv_file)
            if csv_size > MAX_FILE_SIZE:
                return jsonify({"error": f"CSV file too large. Maximum size is {MAX_FILE_SIZE // (1024*1024)}MB."}), 400
            
            csv_filename = secure_filename(csv_file.filename)
            csv_path = os.path.join(app.config["UPLOAD_FOLDER"], csv_filename)
            csv_file.save(csv_path)
            uploaded_files.append(csv_filename)
            logger.info(f"Saved CSV to: {csv_path}")

        if pdf_file and pdf_file.filename and allowed_file(pdf_file.filename):
            # Check file size
            pdf_size = get_file_size(pdf_file)
            if pdf_size > MAX_FILE_SIZE:
                return jsonify({"error": f"PDF file too large. Maximum size is {MAX_FILE_SIZE // (1024*1024)}MB."}), 400
            
            pdf_filename = secure_filename(pdf_file.filename)
            pdf_path = os.path.join(app.config["UPLOAD_FOLDER"], pdf_filename)
            pdf_file.save(pdf_path)
            uploaded_files.append(pdf_filename)
            logger.info(f"Saved PDF to: {pdf_path}")

        if not uploaded_files:
            return jsonify({"error": "No valid files uploaded"}), 400

        # Process files if we have both CSV and PDF
        csv_files = [f for f in os.listdir(app.config["UPLOAD_FOLDER"]) if f.endswith('.csv')]
        pdf_files = [f for f in os.listdir(app.config["UPLOAD_FOLDER"]) if f.endswith('.pdf')]
        
        if csv_files and pdf_files and AI_DEPENDENCIES_AVAILABLE:
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
                logger.error(f"Error processing files: {e}")
                return jsonify({"error": f"Error processing files: {str(e)}"}), 500
        else:
            if not AI_DEPENDENCIES_AVAILABLE:
                return jsonify({"error": "AI/ML dependencies not available"}), 500
            return jsonify({"message": "Files uploaded successfully! Upload both CSV and PDF to enable querying.", "files": uploaded_files})

    except Exception as e:
        logger.error(f"Error uploading files: {e}")
        return jsonify({"error": f"Error uploading files: {str(e)}"}), 500


@app.route("/query", methods=["POST"])
def query_documents():
    """API endpoint for document querying"""
    global rag_chain
    
    try:
        data = request.get_json()
        query = data.get("query", "").strip()
        
        if not query:
            return jsonify({"error": "Please enter a query"}), 400
        
        if not rag_chain:
            return jsonify({"error": "Please upload both CSV and PDF files first before querying"}), 400
        
        try:
            logger.info(f"Processing query: {query}")
            result = rag_chain.invoke(query)
            response_text = result.get("result", "No response generated")
            return jsonify({"response": response_text})
        except Exception as e:
            logger.error(f"Error processing query: {e}")
            return jsonify({"error": f"Error processing query: {str(e)}"}), 500

    except Exception as e:
        logger.error(f"Error handling query: {e}")
        return jsonify({"error": f"Error handling query: {str(e)}"}), 500

@app.errorhandler(404)
def not_found(error):
    """Handle 404 errors"""
    return jsonify({"error": "Endpoint not found"}), 404

@app.errorhandler(500)
def internal_error(error):
    """Handle 500 errors"""
    logger.error(f"Internal server error: {error}")
    return jsonify({"error": "Internal server error"}), 500

@app.errorhandler(413)
def too_large(error):
    """Handle file too large errors"""
    return jsonify({"error": "File too large"}), 413

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    debug = os.environ.get("FLASK_ENV", "production") == "development"
    
    logger.info(f"Starting Flask app on port {port}")
    logger.info(f"Debug mode: {debug}")
    logger.info(f"AI dependencies available: {AI_DEPENDENCIES_AVAILABLE}")
    
    app.run(debug=debug, host="0.0.0.0", port=port)
