import os
from pymongo import MongoClient

# Make sure dotenv is loaded so os.getenv retrieves the variables
from dotenv import load_dotenv
load_dotenv()

MONGO_URI = os.getenv("MONGO_URI", "mongodb://localhost:27017/")

client = MongoClient(MONGO_URI)

db = client["vectordb"]

collection = db["llm-documents-30per-overlap"]