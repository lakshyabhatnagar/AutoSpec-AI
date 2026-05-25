from utils.mongodb import collection
doc = collection.find_one({})
print("Keys in doc:", doc.keys() if doc else "No doc")
print("Total doc count:", collection.count_documents({}))
