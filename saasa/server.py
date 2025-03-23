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

app = Flask(__name__)
app.secret_key = "supersecretkey"
UPLOAD_FOLDER = "uploads"
app.config["UPLOAD_FOLDER"] = UPLOAD_FOLDER
ALLOWED_EXTENSIONS = {"csv", "pdf"}

# Enable CORS for all origins during development
# For production, specify the exact origin of your React app
CORS(app, resources={r"/*": {"origins": "*"}})

os.makedirs(UPLOAD_FOLDER, exist_ok=True)


def allowed_file(filename):
    return "." in filename and filename.rsplit(".", 1)[1].lower() in ALLOWED_EXTENSIONS


def load_documents(csv_path=None, pdf_path=None):
    docs = []
    if csv_path and os.path.exists(csv_path):
        print(f"Loading CSV: {csv_path}")
        csv_loader = CSVLoader(file_path=csv_path)
        docs.extend(csv_loader.load())
    if pdf_path and os.path.exists(pdf_path):
        print(f"Loading PDF: {pdf_path}")
        pdf_loader = PyPDFLoader(pdf_path)
        docs.extend(pdf_loader.load())
    return docs


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
    llm = Together(
        model="meta-llama/Llama-3-70b-chat-hf",
        together_api_key=os.environ.get("TOGETHER_API_KEY"),
        temperature=0.7
    )
    return RetrievalQA.from_chain_type(
        llm=llm,
        chain_type="stuff",
        retriever=vector_store.as_retriever(search_kwargs={"k": 2})
    )


rag_chain = None
uploaded_files = {"csv": None, "pdf": None}


@app.route("/", methods=["GET", "POST"])
def index():
    global rag_chain, uploaded_files
    print(f"Received {request.method} request")

    # Handle OPTIONS request for CORS preflight
    if request.method == "OPTIONS":
        return "", 200

    if request.method == "POST":
        print("POST Headers:", request.headers)
        print("POST Files:", request.files)
        print("POST Form:", request.form)
        
        # Handle file upload
        if "csv_file" in request.files or "pdf_file" in request.files:
            print("Processing file upload request")
            csv_file = request.files.get("csv_file")
            pdf_file = request.files.get("pdf_file")

            csv_path = None
            pdf_path = None

            if csv_file and csv_file.filename and allowed_file(csv_file.filename):
                csv_filename = secure_filename(csv_file.filename)
                csv_path = os.path.join(
                    app.config["UPLOAD_FOLDER"], csv_filename)
                csv_file.save(csv_path)
                uploaded_files["csv"] = csv_filename
                print(f"Saved CSV to: {csv_path}")

            if pdf_file and pdf_file.filename and allowed_file(pdf_file.filename):
                pdf_filename = secure_filename(pdf_file.filename)
                pdf_path = os.path.join(
                    app.config["UPLOAD_FOLDER"], pdf_filename)
                pdf_file.save(pdf_path)
                uploaded_files["pdf"] = pdf_filename
                print(f"Saved PDF to: {pdf_path}")

            if not csv_path and not pdf_path:
                return jsonify({"error": "No valid files uploaded"}), 400

            try:
                docs = load_documents(csv_path, pdf_path)
                if not docs:
                    return jsonify({"error": "No documents loaded"}), 400
                split_docs = split_documents(docs)
                vector_store = setup_vector_store(split_docs)
                rag_chain = setup_rag_chain(vector_store)
                return jsonify({"message": "Files uploaded and processed successfully", "files": uploaded_files})
            except Exception as e:
                print(f"Error processing files: {str(e)}")
                return jsonify({"error": f"Error processing files: {str(e)}"}), 500

        # Handle query submission
        if "query" in request.form:
            query = request.form.get("query").strip()
            print(f"Processing query: {query}")
            
            if not query:
                return jsonify({"error": "Please enter a query"}), 400
            if not rag_chain:
                return jsonify({"error": "Please upload files first"}), 400
            
            try:
                response = rag_chain.invoke(query)
                return jsonify({"response": response["result"], "query": query, "files": uploaded_files})
            except Exception as e:
                print(f"Error processing query: {str(e)}")
                return jsonify({"error": f"Error querying: {str(e)}"}), 500

    return jsonify({"message": "Welcome to the RAG API", "uploaded_files": uploaded_files})


@app.errorhandler(500)
def server_error(e):
    print(f"Server error: {str(e)}")
    return jsonify({"error": "Internal server error. Check server logs for details."}), 500


@app.errorhandler(404)
def not_found(e):
    return jsonify({"error": "Endpoint not found"}), 404


if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    app.run(host="0.0.0.0", port=port, debug=True)