"""Configuration for the LLM Council."""

import os
from dotenv import load_dotenv

load_dotenv()

# Groq API key
GROQ_API_KEY = os.getenv("GROQ_API_KEY")

# Tavily API key for internet research
TAVILY_API_KEY = os.getenv("TAVILY_API_KEY")

# Council members - list of Groq model identifiers
COUNCIL_MODELS = [
    "llama-3.3-70b-versatile",
    "llama-3.1-70b-versatile",
    "mixtral-8x7b-32768",
    "gemma-7b-it",
]

# Chairman model - synthesizes final response
CHAIRMAN_MODEL = "llama-3.3-70b-versatile"

# Groq API endpoint
GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions"

# CORS settings - stored as string, parsed to list when needed
CORS_ORIGINS = os.getenv(
    "CORS_ORIGINS",
    "http://localhost:5173,http://localhost:3000"
)

# Data directory for conversation storage
DATA_DIR = "data/conversations"
