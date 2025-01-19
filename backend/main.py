# main.py
from fastapi import  FastAPI, HTTPException, Request
from fastapi.responses import RedirectResponse
from pydantic import BaseModel
from typing import List, Dict, Any,Optional
from fastapi.middleware.cors import CORSMiddleware
import google.generativeai as genai
import os
from dotenv import load_dotenv  
import base64
from mail_routes import router as gmail_router

load_dotenv()

app = FastAPI()

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
if not GEMINI_API_KEY:
    raise ValueError("GOOGLE_API_KEY is not set in the environment variables.")
genai.configure(api_key=GEMINI_API_KEY)
generation_config = {
  "temperature": 1,
  "top_p": 0.95,
  "top_k": 40,
  "max_output_tokens": 2048,
  "response_mime_type": "text/plain",
}

model = genai.GenerativeModel(
  model_name="gemini-1.5-flash",
  generation_config=generation_config,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000","https://flownodes-ten.vercel.app","https://flownodes.dishit.dev"],  # Add your frontend URL
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

 
class Node(BaseModel):
    id: str
    type: str
    data: Dict[str, Any]

class Edge(BaseModel):
    id: str
    source: str
    target: str
    target_handle:str

class InputValue(BaseModel):
    id: str
    value: str

class PipelineRequest(BaseModel):
    nodes: List[Node]
    edges: List[Edge]
    inputs: List[InputValue]

 

app.include_router(gmail_router, prefix="/api")

@app.get("/")
def read_root():
    return {"message": "Hello, world!"}

  
@app.post("/api/process")
async def process_pipeline(request: PipelineRequest):
    try:
        graph = {}
        for edge in request.edges:
            if edge.source not in graph:
                graph[edge.source] = []
            graph[edge.source].append(edge.target)

        node_values = {input_value.id: input_value.value for input_value in request.inputs}

        #print(f"Edge from {edge.source} to {edge.target} with variable name: {variable_name}")
       # print(f"Source value for edge: {source_value}")
        
        # Update source nodes to include mail-search nodes
        
        source_nodes = [node for node in request.nodes if node.type in ['input', 'file', 'mail-search']]
        current_layer = [node.id for node in source_nodes]
        processed = set()

        while current_layer:
            next_layer = []
            
            for node_id in current_layer:
                if node_id in processed:
                    continue
                    
                node = next(n for n in request.nodes if n.id == node_id)
                print(f"Processing node: {node.type} {node_id}")

                if node.type == 'mail-search':
                  print(f"Debug - Node data for mail-search: {node.data}")  
    
                  search_results = node.data.get('value', '')   
                  if not search_results:
                      search_results = node.data.get('searchResults', '')  
                  if not search_results:
                      search_results = node.data.get('messages', '')   
        
                  print(f"Debug - Search results found: {search_results}")
    
                  node_values[node_id] = search_results
                  print(f"Debug - Node values after setting: {node_values}")
                
                elif node.type == 'llm':
                 
                    prompt_template = node.data.get('promptTemplate', '')
                    system_instructions = node.data.get('systemInstructions', '')
                    
                    variable_values = {}
                    for edge in request.edges:
                        if edge.target == node_id:
                            variable_name = edge.target_handle.replace('var-', '') if edge.target_handle else None
                            if variable_name:
                                source_value = node_values.get(edge.source, '')
                                if source_value:
                                    variable_values[variable_name] = source_value
                                    print(f"Variable {variable_name} set from {edge.source}: {source_value[:100]}...")
                    
                    final_prompt = prompt_template
                    for var_name, value in variable_values.items():
                        final_prompt = final_prompt.replace(f"{{{var_name}}}", str(value))
                    
                    combined_input = f"{system_instructions}\n\n{final_prompt}"
                    print(f"LLM input: {combined_input}")
                    
                    prompt = {"parts": [{"text": combined_input}]}
                    response = model.generate_content(prompt)
                    node_values[node_id] = response.text
                    print(f"LLM output: {response.text}")

                elif node.type == 'file':
                    file_data = node.data
                    file_content = file_data.get('fileContent', '')
                    node_values[node_id] = file_content
                
                elif node.type == 'mail-send':
                  
                   print("inside the send mail if condition")
                   for edge in request.edges:
                       if edge.target == node_id:
                           node_values[node_id] = node_values.get(edge.source, '')
                           print(f"Mail send node body set: {node_values[node_id]}")                                                                         
                
                elif node.type == 'output':
                    for edge in request.edges:
                        if edge.target == node_id:
                            node_values[node_id] = node_values.get(edge.source, '')
                
                processed.add(node_id)
                
                if node_id in graph:
                    next_layer.extend(graph[node_id])
            
            current_layer = next_layer
        
        return {
            node.id: node_values.get(node.id, '')
            for node in request.nodes
            if node.type in ['output', 'mail-send']
        }

    except Exception as e:
        print(f"Error in processing: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)