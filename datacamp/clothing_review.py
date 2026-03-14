# Start coding here
# Use as many cells as you need.
import json
from openai import OpenAI
import numpy as np
from sklearn.manifold import TSNE
import matplotlib.pyplot as plt 
import chromadb
from scipy.spatial import distance
from chromadb.utils.embedding_functions import OpenAIEmbeddingFunction
import os

client = OpenAI()
clothing_reviews = reviews['Review Text'].dropna()
review_texts = clothing_reviews.to_list()  # Fixed variable name to be consistent

response = client.embeddings.create(
    model="text-embedding-3-small",
    input=review_texts
)
response_dict = response.model_dump()
embeddings = [item["embedding"] for item in response_dict["data"]]

def apply_tsne(embeddings):
    tsne = TSNE(n_components=2, random_state=0)
    return tsne.fit_transform(embeddings)

embeddings_2d = apply_tsne(np.array(embeddings))

# Plotting the results of t-SNE
def plot_tsne(tsne_results):
    plt.figure(figsize=(12, 8))
    for i, point in enumerate(tsne_results):
        plt.scatter(point[0], point[1], alpha=0.5)
        plt.text(point[0], point[1], str(i), fontsize=8, verticalalignment='center')
    plt.title("t-SNE Visualization of Review Embeddings")
    plt.xlabel("t-SNE feature 1")
    plt.ylabel("t-SNE feature 2")
    plt.show()

plot_tsne(embeddings_2d)

categories = ['quality', 'fit', 'style','comfort']
categories_response = client.embeddings.create(
    model="text-embedding-3-small",
    input=categories
).model_dump()
category_embeddings = [cat_response["embedding"] for cat_response in categories_response["data"]]

def categorize_feedback(text_embedding, category_embeddings):
    similarities = [{"distance": distance.cosine(text_embedding, cat_emb), "index":i}
                     for i, cat_emb in enumerate(category_embeddings)]
    closest = min(similarities, key=lambda x: x["distance"])  # Fixed: use "distance" not "index"
    return categories[closest["index"]]

# Categorize feedback
feedback_categories = [categorize_feedback(embedding, category_embeddings) for embedding in embeddings]

# Initialize Chromadb instance for vector storage
chroma_client = chromadb.PersistentClient()

# Check if collection exists, if so, get it; otherwise, create it
collection_name = "review_embeddings"
if collection_name in [col.name for col in chroma_client.list_collections()]:
    review_embeddings_db = chroma_client.get_collection(
        name=collection_name,
        embedding_function=OpenAIEmbeddingFunction(model_name="text-embedding-3-small", api_key=os.environ["OPENAI_API_KEY"])
    )
else:
    review_embeddings_db = chroma_client.create_collection(
        name=collection_name,
        embedding_function=OpenAIEmbeddingFunction(model_name="text-embedding-3-small", api_key=os.environ["OPENAI_API_KEY"])
    )

# Store embeddings inside vector database
review_embeddings_db.add(
    documents=review_texts,
    ids=[str(i) for i in range(len(review_texts))]
)

# Function for similarity search using vector db query function
def find_similar_reviews(input_text, vector_db, n=3):
    # Use the passed-in vector_db, not the global client
    results = vector_db.query(
        query_texts=[input_text],
        n_results=n
    )
    return results

# Example feedback and finding similar feedback
example_review = "Absolutely wonderful - silky and sexy and comfortable"
most_similar_reviews = find_similar_reviews(example_review, review_embeddings_db, 3)["documents"][0]
print(most_similar_reviews)

# Clean up
chroma_client.delete_collection(name=collection_name)