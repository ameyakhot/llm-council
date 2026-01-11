"""Tavily integration for web research capabilities."""

from typing import Dict, Any
from tavily import TavilyClient
from .config import TAVILY_API_KEY


class TavilyTool:
    """Wrapper for Tavily search functionality."""
    
    def __init__(self):
        self.client = None
        if TAVILY_API_KEY:
            try:
                self.client = TavilyClient(api_key=TAVILY_API_KEY)
            except Exception as e:
                print(f"Warning: Failed to initialize Tavily client: {e}")
    
    def search(self, query: str, max_results: int = 5) -> str:
        """
        Search the web using Tavily.
        
        Args:
            query: Search query
            max_results: Maximum number of results to return
            
        Returns:
            Formatted string with search results
        """
        if not self.client:
            return "Error: Tavily API key not configured."
        
        try:
            response = self.client.search(
                query=query,
                max_results=max_results,
                search_depth="advanced"  # Use advanced search for better results
            )
            
            results = []
            for result in response.get('results', []):
                title = result.get('title', 'No title')
                url = result.get('url', 'No URL')
                content = result.get('content', 'No content')
                results.append(f"Title: {title}\nURL: {url}\nContent: {content}\n")
            
            if not results:
                return "No results found for this query."
            
            return "\n---\n".join(results)
        except Exception as e:
            return f"Error searching: {str(e)}"


# Global instance
tavily_tool = TavilyTool()


# Tool definition for Groq function calling
TAVILY_SEARCH_TOOL = {
    "type": "function",
    "function": {
        "name": "tavily_search",
        "description": "Search the web for current information, news, research, and real-time data. Use this when you need up-to-date information that might not be in your training data, or when you need to verify facts, find recent developments, or get current market data.",
        "parameters": {
            "type": "object",
            "properties": {
                "query": {
                    "type": "string",
                    "description": "The search query to look up on the web. Be specific and include relevant keywords."
                }
            },
            "required": ["query"]
        }
    }
}


def execute_tool(tool_name: str, arguments: Dict[str, Any]) -> str:
    """
    Execute a tool by name.
    
    Args:
        tool_name: Name of the tool to execute
        arguments: Tool arguments as a dictionary
        
    Returns:
        Tool execution result as a string
    """
    if tool_name == "tavily_search":
        query = arguments.get("query", "")
        return tavily_tool.search(query)
    else:
        return f"Unknown tool: {tool_name}"

