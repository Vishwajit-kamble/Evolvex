# Enhanced version with additional features and improvements
import os
import logging
import traceback
from datetime import datetime, timedelta
from flask import Flask, request, render_template, flash, jsonify, session
from flask_cors import CORS
from werkzeug.utils import secure_filename
from dotenv import load_dotenv
import psutil
import hashlib
from functools import wraps
import time
from typing import Dict, Optional, Any
import threading

# Load environment variables
load_dotenv()

# Configure logging with rotation
from logging.handlers import RotatingFileHandler
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Add rotating file handler
handler = RotatingFileHandler('app.log', maxBytes=10000000, backupCount=3)
handler.setFormatter(logging.Formatter('%(asctime)s - %(name)s - %(levelname)s - %(message)s'))
logger.addHandler(handler)

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
CORS(app)

# Enhanced Configuration
UPLOAD_FOLDER = "uploads"
app.config.update({
    "UPLOAD_FOLDER": UPLOAD_FOLDER,
    "MAX_CONTENT_LENGTH": 10 * 1024 * 1024,  # 10MB
    "PERMANENT_SESSION_LIFETIME": timedelta(hours=2)
})

ALLOWED_EXTENSIONS = {"csv", "pdf", "txt", "docx"}  # Added more file types
MAX_FILE_SIZE = 10 * 1024 * 1024

# Create directories
os.makedirs(UPLOAD_FOLDER, exist_ok=True)
os.makedirs("sessions", exist_ok=True)

# Enhanced global variables with session management
rag_chains: Dict[str, Any] = {}  # Session-based storage
app_start_time = datetime.now()
rate_limit_store: Dict[str, list] = {}  # Simple in-memory rate limiting

class SessionManager:
    """Manage user sessions and their RAG chains"""
    
    def __init__(self):
        self.sessions = {}
        self.lock = threading.Lock()
    
    def get_session_id(self) -> str:
        """Get or create session ID"""
        if 'session_id' not in session:
            session['session_id'] = hashlib.md5(
                f"{request.remote_addr}_{time.time()}".encode()
            ).hexdigest()
            session.permanent = True
        return session['session_id']
    
    def store_rag_chain(self, session_id: str, chain: Any):
        """Store RAG chain for session"""
        with self.lock:
            self.sessions[session_id] = {
                'chain': chain,
                'created_at': datetime.now(),
                'last_used': datetime.now()
            }
    
    def get_rag_chain(self, session_id: str) -> Optional[Any]:
        """Get RAG chain for session"""
        with self.lock:
            if session_id in self.sessions:
                self.sessions[session_id]['last_used'] = datetime.now()
                return self.sessions[session_id]['chain']
        return None
    
    def cleanup_old_sessions(self, max_age_hours: int = 2):
        """Clean up old sessions"""
        cutoff_time = datetime.now() - timedelta(hours=max_age_hours)
        with self.lock:
            expired_sessions = [
                sid for sid, data in self.sessions.items()
                if data['last_used'] < cutoff_time
            ]
            for sid in expired_sessions:
                del self.sessions[sid]
                logger.info(f"Cleaned up expired session: {sid}")

session_manager = SessionManager()

def rate_limit(max_requests: int = 10, window_seconds: int = 60):
    """Rate limiting decorator"""
    def decorator(f):
        @wraps(f)
        def decorated_function(*args, **kwargs):
            client_ip = request.remote_addr
            now = time.time()
            
            # Initialize or clean old requests
            if client_ip not in rate_limit_store:
                rate_limit_store[client_ip] = []
            
            # Remove old requests outside the window
            rate_limit_store[client_ip] = [
                req_time for req_time in rate_limit_store[client_ip]
                if now - req_time < window_seconds
            ]
            
            # Check rate limit
            if len(rate_limit_store[client_ip]) >= max_requests:
                return jsonify({
                    "error": f"Rate limit exceeded. Max {max_requests} requests per {window_seconds} seconds."
                }), 429
            
            # Add current request
            rate_limit_store[client_ip].append(now)
            
            return f(*args, **kwargs)
        return decorated_function
    return decorator

def validate_file_content(file_path: str, file_type: str) -> bool:
    """Validate file content beyond just extension"""
    try:
        if file_type == 'csv':
            import pandas as pd
            df = pd.read_csv(file_path, nrows=1)  # Just read first row
            return len(df.columns) > 0
        elif file_type == 'pdf':
            from PyPDF2 import PdfReader
            reader = PdfReader(file_path)
            return len(reader.pages) > 0
        return True
    except Exception as e:
        logger.error(f"File validation failed for {file_path}: {e}")
        return False

def allowed_file(filename):
    """Check if file extension is allowed"""
    return "." in filename and filename.rsplit(".", 1)[1].lower() in ALLOWED_EXTENSIONS

def get_file_size(file):
    """Get file size in bytes"""
    file.seek(0, 2)
    size = file.tell()
    file.seek(0)
    return size

def load_documents_enhanced(file_paths: list) -> list:
    """Enhanced document loading with support for multiple file types"""
    if not AI_DEPENDENCIES_AVAILABLE:
        raise ImportError("AI/ML dependencies not available")
    
    all_docs = []
    
    for file_path in file_paths:
        try:
            file_ext = file_path.split('.')[-1].lower()
            logger.info(f"Loading {file_ext} file: {file_path}")
            
            if file_ext == 'csv':
                loader = CSVLoader(file_path=file_path)
                docs = loader.load()
            elif file_ext == 'pdf':
                loader = PyPDFLoader(file_path)
                docs = loader.load()
            elif file_ext == 'txt':
                with open(file_path, 'r', encoding='utf-8') as f:
                    content = f.read()
                docs = [Document(page_content=content, metadata={"source": file_path})]
            else:
                logger.warning(f"Unsupported file type: {file_ext}")
                continue
                
            all_docs.extend(docs)
            logger.info(f"Loaded {len(docs)} documents from {file_path}")
            
        except Exception as e:
            logger.error(f"Error loading {file_path}: {e}")
            continue
    
    return all_docs

def setup_enhanced_rag_chain(vector_store, temperature: float = 0.7):
    """Enhanced RAG chain setup with better prompt engineering"""
    logger.info("Setting up enhanced RAG chain...")
    
    together_api_key = os.environ.get("TOGETHER_API_KEY")
    gemini_api_key = os.environ.get("GEMINI_API_KEY")
    
    if together_api_key:
        try:
            logger.info("Using Together API...")
            llm = Together(
                model="meta-llama/Llama-3-70b-chat-hf",
                together_api_key=together_api_key,
                temperature=temperature
            )
            
            # Enhanced retrieval with more context
            return RetrievalQA.from_chain_type(
                llm=llm,
                chain_type="stuff",
                retriever=vector_store.as_retriever(
                    search_type="similarity",
                    search_kwargs={"k": 4}  # Increased context
                ),
                return_source_documents=True
            )
        except Exception as e:
            logger.error(f"Together API failed: {e}")
            if not gemini_api_key:
                raise e
    
    if gemini_api_key:
        try:
            logger.info("Using Gemini API...")
            genai.configure(api_key=gemini_api_key)
            model = genai.GenerativeModel('gemini-1.5-flash')
            
            class EnhancedGeminiLLM:
                def __init__(self, model, temperature=0.7):
                    self.model = model
                    self.temperature = temperature
                
                def invoke(self, input_text, **kwargs):
                    # Enhanced prompt for better responses
                    enhanced_prompt = f"""
                    Based on the provided context, please answer the question comprehensively and accurately.
                    If the information is not in the context, please state that clearly.
                    
                    Context: {input_text}
                    
                    Please provide a detailed and helpful response.
                    """
                    
                    response = self.model.generate_content(enhanced_prompt)
                    return {"result": response.text}
            
            llm = EnhancedGeminiLLM(model, temperature)
            return RetrievalQA.from_chain_type(
                llm=llm,
                chain_type="stuff",
                retriever=vector_store.as_retriever(search_kwargs={"k": 4}),
                return_source_documents=True
            )
        except Exception as e:
            logger.error(f"Gemini API failed: {e}")
            raise e
    
    raise ValueError("No valid API key found")

@app.route("/health", methods=["GET"])
def health_check():
    """Enhanced health check with more metrics"""
    try:
        # System metrics
        cpu_percent = psutil.cpu_percent(interval=1)
        memory = psutil.virtual_memory()
        disk = psutil.disk_usage('/')
        
        # App metrics
        active_sessions = len(session_manager.sessions)
        uptime = datetime.now() - app_start_time
        
        return jsonify({
            "status": "healthy",
            "timestamp": datetime.now().isoformat(),
            "uptime_seconds": uptime.total_seconds(),
            "system": {
                "cpu_percent": cpu_percent,
                "memory_percent": memory.percent,
                "disk_percent": disk.percent
            },
            "app": {
                "ai_dependencies": "available" if AI_DEPENDENCIES_AVAILABLE else "unavailable",
                "active_sessions": active_sessions,
                "version": "2.0.0"
            }
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
    """Enhanced main route with session management"""
    session_id = session_manager.get_session_id()
    response = None

    try:
        if request.method == "POST" and request.files:
            # Handle multiple file upload
            uploaded_files = []
            file_paths = []
            
            for file_key in request.files:
                file = request.files[file_key]
                if file and file.filename and allowed_file(file.filename):
                    # Validate file size
                    if get_file_size(file) > MAX_FILE_SIZE:
                        flash(f"File {file.filename} is too large.")
                        continue
                    
                    filename = secure_filename(file.filename)
                    # Add session ID to filename to avoid conflicts
                    filename = f"{session_id}_{filename}"
                    file_path = os.path.join(app.config["UPLOAD_FOLDER"], filename)
                    
                    file.save(file_path)
                    
                    # Validate file content
                    file_ext = filename.split('.')[-1].lower()
                    if validate_file_content(file_path, file_ext):
                        uploaded_files.append(filename)
                        file_paths.append(file_path)
                        logger.info(f"Successfully uploaded: {filename}")
                    else:
                        os.remove(file_path)  # Remove invalid file
                        flash(f"File {file.filename} appears to be corrupted or invalid.")
            
            if file_paths and AI_DEPENDENCIES_AVAILABLE:
                try:
                    docs = load_documents_enhanced(file_paths)
                    if docs:
                        text_splitter = RecursiveCharacterTextSplitter(
                            chunk_size=1000, chunk_overlap=100
                        )
                        split_docs = text_splitter.split_documents(docs)
                        
                        embeddings = HuggingFaceEmbeddings(
                            model_name="sentence-transformers/all-MiniLM-L6-v2"
                        )
                        vector_store = FAISS.from_documents(split_docs, embeddings)
                        rag_chain = setup_enhanced_rag_chain(vector_store)
                        
                        session_manager.store_rag_chain(session_id, rag_chain)
                        flash(f"Successfully processed {len(uploaded_files)} files!")
                    else:
                        flash("No valid content found in uploaded files.")
                except Exception as e:
                    logger.error(f"Error processing files: {e}")
                    flash(f"Error processing files: {str(e)}")

        # Handle query
        if request.method == "POST" and "query" in request.form:
            query = request.form.get("query").strip()
            if not query:
                flash("Please enter a query.")
            else:
                rag_chain = session_manager.get_rag_chain(session_id)
                if not rag_chain:
                    flash("Please upload files first.")
                else:
                    try:
                        logger.info(f"Processing query for session {session_id}: {query}")
                        result = rag_chain.invoke(query)
                        response = result.get("result", "No response generated")
                    except Exception as e:
                        logger.error(f"Error querying: {e}")
                        flash(f"Error querying: {str(e)}")

    except Exception as e:
        logger.error(f"Unexpected error: {e}")
        flash("An unexpected error occurred.")

    return render_template("index.html", response=response)

@app.route("/upload", methods=["POST"])
@rate_limit(max_requests=5, window_seconds=60)  # Rate limiting for uploads
def upload_files():
    """Enhanced API endpoint for file upload"""
    session_id = session_manager.get_session_id()
    
    try:
        if not request.files:
            return jsonify({"error": "No files uploaded"}), 400

        file_paths = []
        uploaded_files = []
        
        for file_key in request.files:
            file = request.files[file_key]
            if file and file.filename and allowed_file(file.filename):
                if get_file_size(file) > MAX_FILE_SIZE:
                    return jsonify({
                        "error": f"File {file.filename} too large. Max {MAX_FILE_SIZE // (1024*1024)}MB."
                    }), 400
                
                filename = secure_filename(file.filename)
                filename = f"{session_id}_{filename}"
                file_path = os.path.join(app.config["UPLOAD_FOLDER"], filename)
                file.save(file_path)
                
                file_ext = filename.split('.')[-1].lower()
                if validate_file_content(file_path, file_ext):
                    file_paths.append(file_path)
                    uploaded_files.append(file.filename)  # Return original filename
                else:
                    os.remove(file_path)
                    return jsonify({
                        "error": f"File {file.filename} appears to be corrupted"
                    }), 400

        if not file_paths:
            return jsonify({"error": "No valid files uploaded"}), 400

        if AI_DEPENDENCIES_AVAILABLE:
            try:
                docs = load_documents_enhanced(file_paths)
                if docs:
                    text_splitter = RecursiveCharacterTextSplitter(
                        chunk_size=1000, chunk_overlap=100
                    )
                    split_docs = text_splitter.split_documents(docs)
                    
                    embeddings = HuggingFaceEmbeddings(
                        model_name="sentence-transformers/all-MiniLM-L6-v2"
                    )
                    vector_store = FAISS.from_documents(split_docs, embeddings)
                    rag_chain = setup_enhanced_rag_chain(vector_store)
                    
                    session_manager.store_rag_chain(session_id, rag_chain)
                    
                    return jsonify({
                        "message": "Files uploaded and processed successfully!",
                        "files": uploaded_files,
                        "documents_processed": len(docs)
                    })
                else:
                    return jsonify({"error": "No valid content found in files"}), 400
            except Exception as e:
                logger.error(f"Error processing files: {e}")
                return jsonify({"error": f"Error processing files: {str(e)}"}), 500
        else:
            return jsonify({"error": "AI/ML dependencies not available"}), 500

    except Exception as e:
        logger.error(f"Error in upload: {e}")
        return jsonify({"error": f"Upload error: {str(e)}"}), 500

@app.route("/query", methods=["POST"])
@rate_limit(max_requests=20, window_seconds=60)  # More generous for queries
def query_documents():
    """Enhanced API endpoint for querying"""
    session_id = session_manager.get_session_id()
    
    try:
        data = request.get_json()
        if not data:
            return jsonify({"error": "Invalid JSON data"}), 400
            
        query = data.get("query", "").strip()
        temperature = data.get("temperature", 0.7)  # Allow temperature control
        
        if not query:
            return jsonify({"error": "Please enter a query"}), 400
        
        rag_chain = session_manager.get_rag_chain(session_id)
        if not rag_chain:
            return jsonify({"error": "Please upload files first"}), 400
        
        try:
            logger.info(f"Processing query for session {session_id}: {query}")
            result = rag_chain.invoke(query)
            
            response_data = {
                "response": result.get("result", "No response generated"),
                "session_id": session_id,
                "timestamp": datetime.now().isoformat()
            }
            
            # Include source documents if available
            if "source_documents" in result:
                response_data["sources"] = [
                    {
                        "content": doc.page_content[:200] + "...",
                        "metadata": doc.metadata
                    }
                    for doc in result["source_documents"]
                ]
            
            return jsonify(response_data)
            
        except Exception as e:
            logger.error(f"Error processing query: {e}")
            return jsonify({"error": f"Query processing error: {str(e)}"}), 500

    except Exception as e:
        logger.error(f"Error handling query: {e}")
        return jsonify({"error": f"Query handling error: {str(e)}"}), 500

@app.route("/sessions/cleanup", methods=["POST"])
def cleanup_sessions():
    """Endpoint to manually trigger session cleanup"""
    try:
        session_manager.cleanup_old_sessions()
        return jsonify({"message": "Session cleanup completed"})
    except Exception as e:
        logger.error(f"Session cleanup error: {e}")
        return jsonify({"error": "Cleanup failed"}), 500

# Background task for periodic cleanup
def periodic_cleanup():
    """Periodic cleanup task"""
    while True:
        time.sleep(3600)  # Run every hour
        try:
            session_manager.cleanup_old_sessions()
        except Exception as e:
            logger.error(f"Periodic cleanup error: {e}")

# Start cleanup thread
cleanup_thread = threading.Thread(target=periodic_cleanup, daemon=True)
cleanup_thread.start()

# Error handlers remain the same...
@app.errorhandler(404)
def not_found(error):
    return jsonify({"error": "Endpoint not found"}), 404

@app.errorhandler(500)
def internal_error(error):
    logger.error(f"Internal server error: {error}")
    return jsonify({"error": "Internal server error"}), 500

@app.errorhandler(413)
def too_large(error):
    return jsonify({"error": "File too large"}), 413

# Production configuration
if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    debug = os.environ.get("FLASK_ENV", "production") == "development"
    
    # Production optimizations
    if not debug:
        # Disable Flask's development server warnings
        import warnings
        warnings.filterwarnings("ignore", message=".*development server.*")
        
        # Set up production logging
        if not app.logger.handlers:
            handler = logging.StreamHandler()
            handler.setFormatter(logging.Formatter(
                '%(asctime)s %(levelname)s: %(message)s'
            ))
            app.logger.addHandler(handler)
            app.logger.setLevel(logging.INFO)
    
    logger.info(f"Starting Flask app on port {port}")
    logger.info(f"Debug mode: {debug}")
    logger.info(f"AI dependencies available: {AI_DEPENDENCIES_AVAILABLE}")
    
    app.run(debug=debug, host="0.0.0.0", port=port)