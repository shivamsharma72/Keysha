"""
Vector Store Service

Handles MongoDB Vector Search operations for RAG (Retrieval-Augmented Generation).
"""
from motor.motor_asyncio import AsyncIOMotorClient
from typing import List, Dict, Optional
import logging

logger = logging.getLogger(__name__)


class VectorStore:
    """
    MongoDB Vector Search wrapper
    
    Stores and retrieves user context/preferences for RAG.
    """
    
    def __init__(self, mongodb_uri: str, database_name: str = "keysha"):
        self.client = AsyncIOMotorClient(mongodb_uri)
        self.db = self.client[database_name]
        self.collection = self.db["user_context"]
    
    async def initialize(self):
        """Initialize vector store (check connection)"""
        try:
            await self.client.admin.command('ping')
            logger.info("✅ Connected to MongoDB")
            
            # Check if vector search index exists
            indexes = await self.collection.list_indexes().to_list(length=100)
            vector_index_exists = any(
                idx.get("name") == "vector_index" for idx in indexes
            )
            
            if not vector_index_exists:
                logger.warning("⚠️ Vector search index not found. Create it in MongoDB Atlas:")
                logger.warning("   Collection: user_context")
                logger.warning("   Index name: vector_index")
                logger.warning("   Type: Vector Search")
                logger.warning("   Field: embedding")
                logger.warning("   Dimensions: 768 (for text-embedding-004)")
            
        except Exception as e:
            logger.error(f"❌ Failed to connect to MongoDB: {e}")
            raise
    
    async def search(
        self,
        query_embedding: List[float],
        user_id: str,
        limit: int = 5,
        filter_type: Optional[str] = None
    ) -> List[Dict]:
        """
        Search for similar context using vector search
        
        Args:
            query_embedding: The embedding vector of the query
            user_id: User ID to filter results
            limit: Maximum number of results
            filter_type: Optional filter by metadata.type
        
        Returns:
            List of matching context documents
        """
        try:
            # Build aggregation pipeline for vector search
            pipeline = [
                {
                    "$vectorSearch": {
                        "index": "vector_index",
                        "path": "embedding",
                        "queryVector": query_embedding,
                        "numCandidates": limit * 10,  # MongoDB recommendation
                        "limit": limit,
                    }
                },
                {
                    "$match": {
                        "userId": user_id,
                        **({"metadata.type": filter_type} if filter_type else {})
                    }
                },
                {
                    "$project": {
                        "text": 1,
                        "metadata": 1,
                        "score": {"$meta": "vectorSearchScore"}
                    }
                }
            ]
            
            results = await self.collection.aggregate(pipeline).to_list(length=limit)
            return results
            
        except Exception as e:
            logger.error(f"Vector search failed: {e}")
            return []
    
    async def store(
        self,
        user_id: str,
        text: str,
        embedding: List[float],
        metadata: Optional[Dict] = None
    ):
        """
        Store user context with embedding
        
        Args:
            user_id: User ID
            text: The text content
            embedding: The embedding vector
            metadata: Optional metadata (type, timestamp, etc.)
        """
        try:
            document = {
                "userId": user_id,
                "text": text,
                "embedding": embedding,
                "metadata": metadata or {}
            }
            
            await self.collection.insert_one(document)
            logger.debug(f"Stored context for user {user_id}")
            
        except Exception as e:
            logger.error(f"Failed to store context: {e}")
            raise
    
    async def close(self):
        """Close MongoDB connection"""
        self.client.close()
