# Initialize the Pinecone client
pc = Pinecone(api_key="pcsk_6HASJD_EvrwAc1RT3sjNDS9BQErzCt864vK1M77sCmFxxSX5f8qTq1U2VBhZJ2cwwtYou1")
index = pc.Index('pinecone-datacamp')

batch_limit = 100

for batch in np.array_split(youtube_df, len(youtube_df) / batch_limit):
    
    # Extract the metadata from each row
    metadatas = [{
        "text_id": row['id'],
        "text": row['text'],
        "title": row['title'],
        "url": row['url'],
        "published": row['published']
    } for _, row in batch.iterrows()]
    
    texts = batch['text'].tolist()
    
    ids = [str(uuid4()) for _ in range(len(texts))]
    
    # Encode texts using OpenAI
    response = client.embeddings.create(
        input=texts,
        model="text-embedding-3-small"
    )
    embeds = [np.array(x.embedding) for x in response.data]
    
    # Upsert vectors to the correct namespace
    index.upsert(
        vectors=zip(ids, embeds, metadatas),
        namespace='youtube_rag_dataset'
    )
    
print(index.describe_index_stats())


# Initialize the Pinecone client
pc = Pinecone(api_key="pcsk_6HASJD_EvrwAc1RT3sjNDS9BQErzCt864vK1M77sCmFxxSX5f8qTq1U2VBhZJ2cwwtYou1")
index = pc.Index('pinecone-datacamp')

# Define a retrieve function that takes four arguments: query, top_k, namespace, and emb_model
def retrieve(query, top_k, namespace, emb_model):
    # Encode the input query using OpenAI
    query_response = client.embeddings.create(
        input=query,
        model=emb_model
    )
    
    query_emb = query_response.data[0].embedding
    
    # Query the index using the query_emb
    docs = index.query(vector=query_emb, top_k=top_k, namespace=namespace, include_metadata=True)
    
    retrieved_docs = []
    sources = []
    for doc in docs['matches']:
        retrieved_docs.append(doc['metadata']['text'])
        sources.append((doc['metadata']['title'], doc['metadata']['url']))
    
    return retrieved_docs, sources

documents, sources = retrieve(
  query="How to build next-level Q&A with OpenAI",
  top_k=3,
  namespace='youtube_rag_dataset',
  emb_model="text-embedding-3-small"
)
print(documents)
print(sources)


# Initialize the Pinecone client
pc = Pinecone(api_key="pcsk_6HASJD_EvrwAc1RT3sjNDS9BQErzCt864vK1M77sCmFxxSX5f8qTq1U2VBhZJ2cwwtYou1")
index = pc.Index('pinecone-datacamp')

query = "How to build next-level Q&A with OpenAI"

# Retrieve the top three most similar documents and their sources
documents, sources = retrieve(query, top_k=3, namespace='youtube_rag_dataset', emb_model="text-embedding-3-small")

prompt_with_context = prompt_with_context_builder(query, documents)
print(prompt_with_context)

def question_answering(prompt, sources, chat_model):
    sys_prompt = "You are a helpful assistant that always answers questions."
    
    # Use OpenAI chat completions to generate a response
    res = client.chat.completions.create(
        model=chat_model,
        messages=[
            {"role": "system", "content": sys_prompt},
            {"role": "user", "content": prompt}
        ],
        temperature=0
    )
    answer = res.choices[0].message.content.strip()
    answer += "\n\nSources:"
    for source in sources:
        answer += "\n" + source[0] + ": " + source[1]
    
    return answer

answer = question_answering(
  prompt=prompt_with_context,
  sources=sources,
  chat_model='gpt-4o-mini')
print(answer)