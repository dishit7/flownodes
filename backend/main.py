# main.py
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from typing import List, Dict, Any
import google.generativeai as genai
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI()

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],  # Add your frontend URL
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure Gemini
GOOGLE_API_KEY = "AIzaSyCQNW2RNfF8nGFfxXOGKXUk0VtREINOnto"
genai.configure(api_key=GOOGLE_API_KEY)
model = genai.GenerativeModel('gemini-pro')

class Node(BaseModel):
    id: str
    type: str
    data: Dict[str, Any]

class Edge(BaseModel):
    id: str
    source: str
    target: str

class InputValue(BaseModel):
    id: str
    value: str

class PipelineRequest(BaseModel):
    nodes: List[Node]
    edges: List[Edge]
    inputs: List[InputValue]

@app.post("/api/process")
async def process_pipeline(request: PipelineRequest):
    try:
        # Create a graph of node connections
        graph = {}
        for edge in request.edges:
            if edge.source not in graph:
                graph[edge.source] = []
            graph[edge.source].append(edge.target)

        # Create a mapping of node IDs to their values
        node_values = {input_value.id: input_value.value for input_value in request.inputs}
        
        # Process each path through the graph
        for input_node in (n for n in request.nodes if n.type == 'input'):
            current_id = input_node.id
            while current_id in graph:
                next_nodes = graph[current_id]
                for next_id in next_nodes:
                    next_node = next((n for n in request.nodes if n.id == next_id), None)
                    
                    if next_node.type == 'llm':
                        # Process through Gemini
                        response = model.generate_content(node_values[current_id])
                        node_values[next_id] = response.text
                    
                    elif next_node.type == 'output':
                        # Pass through to output
                        node_values[next_id] = node_values[current_id]
                
                current_id = next_id

        # Return values for output nodes
        return {
            node.id: node_values.get(node.id, '')
            for node in request.nodes
            if node.type == 'output'
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)