"""Groq API client for making LLM requests with tool support."""

import httpx
import json
from typing import List, Dict, Any, Optional, Callable
from .config import GROQ_API_KEY, GROQ_API_URL


async def query_model(
    model: str,
    messages: List[Dict[str, str]],
    tools: Optional[List[Dict]] = None,
    tool_choice: Optional[str] = None,
    timeout: float = 120.0
) -> Optional[Dict[str, Any]]:
    """
    Query a single model via Groq API with optional tool support.

    Args:
        model: Groq model identifier (e.g., "llama-3.3-70b-versatile")
        messages: List of message dicts with 'role' and 'content'
        tools: Optional list of tool definitions for function calling
        tool_choice: Optional tool choice ("auto", "none", or specific tool)
        timeout: Request timeout in seconds

    Returns:
        Response dict with 'content' and optional 'tool_calls', or None if failed
    """
    headers = {
        "Authorization": f"Bearer {GROQ_API_KEY}",
        "Content-Type": "application/json",
    }

    payload = {
        "model": model,
        "messages": messages,
    }
    
    if tools:
        payload["tools"] = tools
    if tool_choice:
        payload["tool_choice"] = tool_choice

    try:
        async with httpx.AsyncClient(timeout=timeout) as client:
            response = await client.post(
                GROQ_API_URL,
                headers=headers,
                json=payload
            )
            response.raise_for_status()

            data = response.json()
            message = data['choices'][0]['message']

            return {
                'content': message.get('content'),
                'tool_calls': message.get('tool_calls'),
            }

    except Exception as e:
        print(f"Error querying model {model}: {e}")
        return None


async def query_model_with_tools(
    model: str,
    messages: List[Dict[str, str]],
    tools: List[Dict],
    tool_executor: Callable[[str, Dict[str, Any]], str],
    max_iterations: int = 5,
    timeout: float = 120.0
) -> Optional[Dict[str, Any]]:
    """
    Query model with tool calling support. Handles tool execution loop.
    
    Args:
        model: Groq model identifier
        messages: List of message dicts
        tools: List of tool definitions
        tool_executor: Function to execute tools (tool_name, arguments) -> result
        max_iterations: Maximum number of tool call iterations
        timeout: Request timeout
        
    Returns:
        Final response dict with 'content'
    """
    for iteration in range(max_iterations):
        response = await query_model(
            model=model,
            messages=messages,
            tools=tools,
            tool_choice="auto",
            timeout=timeout
        )
        
        if not response:
            return None
        
        # Check if model wants to use a tool
        tool_calls = response.get('tool_calls')
        if tool_calls:
            # Add assistant message with tool calls
            assistant_message = {
                "role": "assistant",
                "content": response.get('content'),
                "tool_calls": tool_calls
            }
            messages.append(assistant_message)
            
            # Execute each tool call
            for tool_call in tool_calls:
                function_name = tool_call['function']['name']
                try:
                    arguments = json.loads(tool_call['function']['arguments'])
                except json.JSONDecodeError:
                    arguments = {}
                
                # Execute tool
                tool_result = tool_executor(function_name, arguments)
                
                # Add tool result to messages
                messages.append({
                    "role": "tool",
                    "tool_call_id": tool_call['id'],
                    "content": str(tool_result)
                })
        else:
            # Model returned final answer (no more tool calls)
            return response
    
    # Max iterations reached
    return response


async def query_models_parallel(
    models: List[str],
    messages: List[Dict[str, str]],
    tools: Optional[List[Dict]] = None,
    tool_executor: Optional[Callable[[str, Dict[str, Any]], str]] = None
) -> Dict[str, Optional[Dict[str, Any]]]:
    """
    Query multiple models in parallel with optional tool support.

    Args:
        models: List of Groq model identifiers
        messages: List of message dicts to send to each model
        tools: Optional list of tool definitions
        tool_executor: Optional function to execute tools

    Returns:
        Dict mapping model identifier to response dict (or None if failed)
    """
    import asyncio

    async def query_with_tools(model):
        if tools and tool_executor:
            return await query_model_with_tools(model, messages.copy(), tools, tool_executor)
        else:
            return await query_model(model, messages)

    # Create tasks for all models
    tasks = [query_with_tools(model) for model in models]

    # Wait for all to complete
    responses = await asyncio.gather(*tasks)

    # Map models to their responses
    return {model: response for model, response in zip(models, responses)}

