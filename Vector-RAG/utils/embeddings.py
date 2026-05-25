from google import genai
from dotenv import load_dotenv

load_dotenv()

client = genai.Client(
    vertexai=True,
    project="ppp-v4",
    location="us-central1"
)

def generate_embedding(text):

    result = client.models.embed_content(

        model="text-embedding-005",

        contents=text,

        config={
            "output_dimensionality": 768
        }
    )

    embedding = result.embeddings[0].values

    return embedding