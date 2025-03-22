# server/server.py
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

# Enable CORS for development and production origins
CORS(app, resources={r"/api/*": {"origins": [
    "http://localhost:5173",  # Vite dev server
    "https://your-react-app.vercel.app"  # Replace with your deployed frontend URL
]}})

os.makedirs(UPLOAD_FOLDER, exist_ok=True)

rag_chain = None


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
        together_api_key=os.getenv("TOGETHER_API_KEY"),
        temperature=0.7
    )
    return RetrievalQA.from_chain_type(
        llm=llm,
        chain_type="stuff",
        retriever=vector_store.as_retriever(search_kwargs={"k": 2})
    )


@app.route("/api/upload", methods=["POST"])
def upload_files():
    global rag_chain
    if "csv_file" not in request.files and "pdf_file" not in request.files:
        return jsonify({"success": False, "message": "No files provided."}), 400

    csv_file = request.files.get("csv_file")
    pdf_file = request.files.get("pdf_file")

    if not csv_file and not pdf_file:
        return jsonify({"success": False, "message": "No valid files provided."}), 400

    csv_path = pdf_path = None
    if csv_file and allowed_file(csv_file.filename):
        csv_filename = secure_filename(csv_file.filename)
        csv_path = os.path.join(app.config["UPLOAD_FOLDER"], csv_filename)
        csv_file.save(csv_path)
        print(f"Saved CSV to: {csv_path}")

    if pdf_file and allowed_file(pdf_file.filename):
        pdf_filename = secure_filename(pdf_file.filename)
        pdf_path = os.path.join(app.config["UPLOAD_FOLDER"], pdf_filename)
        pdf_file.save(pdf_path)
        print(f"Saved PDF to: {pdf_path}")

    try:
        docs = load_documents(csv_path, pdf_path)
        if not docs:
            return jsonify({"success": False, "message": "No valid documents loaded."}), 400
        split_docs = split_documents(docs)
        vector_store = setup_vector_store(split_docs)
        rag_chain = setup_rag_chain(vector_store)
        return jsonify({"success": True, "message": "Files uploaded and processed successfully."})
    except Exception as e:
        return jsonify({"success": False, "message": f"Error processing files: {str(e)}"}), 500


@app.route("/api/query", methods=["POST"])
def query():
    global rag_chain
    data = request.get_json()
    query = data.get("query", "").strip()

    if not query:
        return jsonify({"success": False, "message": "Query cannot be empty."}), 400
    if not rag_chain:
        return jsonify({"success": False, "message": "No files uploaded yet."}), 400

    try:
        response = rag_chain.invoke(query)
        return jsonify({"success": True, "response": response["result"]})
    except Exception as e:
        return jsonify({"success": False, "message": f"Error querying: {str(e)}"}), 500


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=True)
