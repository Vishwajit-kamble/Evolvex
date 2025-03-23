import os
from flask import Flask, request, jsonify
from flask_cors import CORS
from werkzeug.utils import secure_filename
from langchain_community.document_loaders import CSVLoader, PyPDFLoader
from langchain.text_splitter import RecursiveCharacterTextSplitter
from langchain_community.embeddings import HuggingFaceEmbeddings
from langchain_community.vectorstores import FAISS
from langchain.chains import RetrievalQA
from langchain_together import Together
from dotenv import load_dotenv

load_dotenv()

app = Flask(__name__)
app.secret_key = "supersecretkey"
UPLOAD_FOLDER = "uploads"
app.config["UPLOAD_FOLDER"] = UPLOAD_FOLDER
ALLOWED_EXTENSIONS = {"csv", "pdf"}

# Simplified CORS configuration
CORS(app, resources={
    r"/*": {
        "origins": [
            "http://localhost:5173",
            "http://localhost:5173/evolvex-code-agentic-ai",
            "https://evolvexai.vercel.app",
            "https://evolvexai.vercel.app/evolvex-code-agentic-ai"
        ],
        "methods": ["GET", "POST", "OPTIONS"],
        "allow_headers": ["Content-Type"]
    }
})

os.makedirs(UPLOAD_FOLDER, exist_ok=True)

def allowed_file(filename):
    return "." in filename and filename.rsplit(".", 1)[1].lower() in ALLOWED_EXTENSIONS

def load_documents(csv_path=None, pdf_path=None):
    docs = []
    try:
        if csv_path and os.path.exists(csv_path):
            print(f"Loading CSV: {csv_path}")
            csv_loader = CSVLoader(file_path=csv_path)
            docs.extend(csv_loader.load())
        if pdf_path and os.path.exists(pdf_path):
            print(f"Loading PDF: {pdf_path}")
            pdf_loader = PyPDFLoader(pdf_path)
            docs.extend(pdf_loader.load())
    except Exception as e:
        print(f"Error in load_documents: {str(e)}")
        raise
    return docs

def split_documents(docs):
    try:
        print("Splitting documents...")
        text_splitter = RecursiveCharacterTextSplitter(
            chunk_size=500, 
            chunk_overlap=50
        )
        return text_splitter.split_documents(docs)
    except Exception as e:
        print(f"Error in split_documents: {str(e)}")
        raise

def setup_vector_store(docs):
    try:
        print("Setting up vector store...")
        embeddings = HuggingFaceEmbeddings(
            model_name="sentence-transformers/all-MiniLM-L6-v2"
        )
        return FAISS.from_documents(docs, embeddings)
    except Exception as e:
        print(f"Error in setup_vector_store: {str(e)}")
        raise

def setup_rag_chain(vector_store):
    try:
        print("Setting up RAG chain...")
        api_key = os.getenv("TOGETHER_API_KEY")
        if not api_key:
            raise ValueError("TOGETHER_API_KEY not found in environment variables")
        
        llm = Together(
            model="meta-llama/Llama-3-70b-chat-hf",
            together_api_key=api_key,
            temperature=0.7
        )
        return RetrievalQA.from_chain_type(
            llm=llm,
            chain_type="stuff",
            retriever=vector_store.as_retriever(search_kwargs={"k": 2})
        )
    except Exception as e:
        print(f"Error in setup_rag_chain: {str(e)}")
        raise

rag_chain = None
uploaded_files = {"csv": None, "pdf": None}

@app.route("/", methods=["GET", "POST", "OPTIONS"])
def index():
    global rag_chain, uploaded_files
    print(f"Received {request.method} request")

    if request.method == "OPTIONS":
        return jsonify({"status": "success"}), 200

    if request.method == "POST":
        print("POST Headers:", dict(request.headers))
        print("POST Files:", request.files)
        print("POST Form:", request.form)

        csv_file = request.files.get("csv_file")
        pdf_file = request.files.get("pdf_file")
        csv_path = None
        pdf_path = None

        try:
            if csv_file and csv_file.filename:
                if not allowed_file(csv_file.filename):
                    return jsonify({"error": "CSV file type not allowed"}), 400
                csv_filename = secure_filename(csv_file.filename)
                csv_path = os.path.join(app.config["UPLOAD_FOLDER"], csv_filename)
                csv_file.save(csv_path)
                uploaded_files["csv"] = csv_filename
                print(f"Saved CSV to: {csv_path}")

            if pdf_file and pdf_file.filename:
                if not allowed_file(pdf_file.filename):
                    return jsonify({"error": "PDF file type not allowed"}), 400
                pdf_filename = secure_filename(pdf_file.filename)
                pdf_path = os.path.join(app.config["UPLOAD_FOLDER"], pdf_filename)
                pdf_file.save(pdf_path)
                uploaded_files["pdf"] = pdf_filename
                print(f"Saved PDF to: {pdf_path}")

            if not csv_path and not pdf_path:
                return jsonify({
                    "error": "No valid files uploaded",
                    "files": uploaded_files
                }), 400

            docs = load_documents(csv_path, pdf_path)
            if not docs:
                return jsonify({
                    "error": "No documents loaded from files",
                    "files": uploaded_files
                }), 400

            split_docs = split_documents(docs)
            vector_store = setup_vector_store(split_docs)
            rag_chain = setup_rag_chain(vector_store)

            return jsonify({
                "message": "Files uploaded and processed successfully",
                "files": uploaded_files
            }), 200

        except Exception as e:
            print(f"Error processing request: {str(e)}")
            return jsonify({
                "error": f"Error processing files: {str(e)}",
                "files": uploaded_files
            }), 500

@app.errorhandler(500)
def server_error(e):
    print(f"Server error: {str(e)}")
    return jsonify({"error": "Internal server error"}), 500

@app.errorhandler(404)
def not_found(e):
    return jsonify({"error": "Endpoint not found"}), 404

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    app.run(host="0.0.0.0", port=port, debug=True)