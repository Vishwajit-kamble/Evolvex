import os
from flask import Flask, request, render_template, flash
from werkzeug.utils import secure_filename
from langchain_community.document_loaders import CSVLoader, PyPDFLoader
from langchain.text_splitter import RecursiveCharacterTextSplitter
from langchain_community.embeddings import HuggingFaceEmbeddings
from langchain_community.vectorstores import FAISS
from langchain.chains import RetrievalQA
from langchain_together import Together
from dotenv import load_dotenv

from langchain_core.documents import Document
load_dotenv()
app.secret_key = os.getenv("FLASK_SECRET_KEY", "supersecretkey")
app = Flask(__name__)
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
    print("TOGETHER_API_KEY:", os.environ.get("TOGETHER_API_KEY"))
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


if __name__ == "__main__":
    app.run(debug=True)
