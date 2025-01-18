# main.py
from fastapi import FastAPI, HTTPException, Request
from fastapi.responses import RedirectResponse
from pydantic import BaseModel
from typing import List, Dict, Any,Optional
from fastapi.middleware.cors import CORSMiddleware
from google.oauth2.credentials import Credentials
from google_auth_oauthlib.flow import Flow
from googleapiclient.discovery import build
import google.generativeai as genai
import os
from dotenv import load_dotenv  
from email.mime.text import MIMEText
import base64

class SendMailRequest(BaseModel):
    to: str
    subject: str
    body: str


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
    allow_origins=["http://localhost:3000"],  # Add your frontend URL
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure Gmail OAuth
CLIENT_SECRETS_FILE = "client_secret_863038160732-ddq9eij6rqa6h3e5oc8s4uubacm8j26f.apps.googleusercontent.com.json"
SCOPES = [
    'https://www.googleapis.com/auth/gmail.readonly',
    'https://www.googleapis.com/auth/gmail.send'
]
flow = Flow.from_client_secrets_file(
    CLIENT_SECRETS_FILE,
    scopes=SCOPES,
    redirect_uri="https://flownodes.api.dishit.dev/api/auth/callback"
)

# Data models
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

class GmailSearchRequest(BaseModel):
    query: str
    max_results: int = 5

# Gmail Auth Routes
    

# In-memory storage for demo (replace with database in production)
credentials_store: Dict[str, Dict] = {}

def store_credentials(node_id: str, credentials: Credentials) -> None:
    """Store credentials for a node"""
    credentials_dict = {
        'token': credentials.token,
        'refresh_token': credentials.refresh_token,
        'token_uri': credentials.token_uri,
        'client_id': credentials.client_id,
        'client_secret': credentials.client_secret,
        'scopes': credentials.scopes
    }
    print(f"[store_credentials] Storing credentials for node_id: {node_id}")
    credentials_store[node_id] = credentials_dict
    print(f"[store_credentials] Updated credential store: {credentials_store}")

def get_credentials(node_id: str) -> Optional[Credentials]: 
    """Retrieve credentials for a node"""
    print(f"credential store is {credentials_store}")
    credentials = credentials_store.get(node_id)
    print(credentials)
    if node_id not in credentials_store:
        return None
    
    creds_dict = credentials_store[node_id]
    return Credentials(
        token=creds_dict['token'],
        refresh_token=creds_dict['refresh_token'],
        token_uri=creds_dict['token_uri'],
        client_id=creds_dict['client_id'],
        client_secret=creds_dict['client_secret'],
        scopes=creds_dict['scopes']
    )


pending_node_id = None

@app.get("/")
def read_root():
    return {"message": "Hello, world!"}

@app.get("/api/auth/gmail")
async def gmail_auth(nodeId: str):
    global pending_node_id
    pending_node_id = nodeId  # Store the nodeId we want to use
    print(f"Storing pending nodeId: {nodeId}")
    auth_url, _ = flow.authorization_url(prompt='consent')
    return {"url": auth_url}

@app.get("/api/auth/callback")
async def auth_callback(request: Request):
    global pending_node_id
    query_params = request.query_params
    code = query_params.get('code')

    if not code or not pending_node_id:
        raise HTTPException(status_code=400, detail="Missing code or no pending auth")

    try:
        flow.fetch_token(code=code)
        credentials = flow.credentials
        
        # Use our stored nodeId instead of the state
        store_credentials(pending_node_id, credentials)
        print(f"Stored credentials for nodeId: {pending_node_id}")
        
        redirect_url = f"http://localhost:3000?nodeId={pending_node_id}&authSuccess=true"
        pending_node_id = None  # Clear the stored nodeId
        return RedirectResponse(url=redirect_url)
    
    except Exception as e:
        pending_node_id = None  # Clear on error too
        raise HTTPException(status_code=500, detail=str(e))

# Gmail Search Route
@app.post("/api/gmail/search")
async def search_gmail(request: GmailSearchRequest, nodeId: str):
    print(f"Search requested for nodeId: {nodeId}")
    print(f"Available credentials: {list(credentials_store.keys())}")
    
    try:
        credentials = get_credentials(nodeId)
        if not credentials:
            raise HTTPException(
                status_code=400, 
                detail=f"No credentials found for node {nodeId}. Available nodes: {list(credentials_store.keys())}"
            )

        # Build Gmail service
        service = build('gmail', 'v1', credentials=credentials)
        
        # Search emails
        results = service.users().messages().list(
            userId='me',
            q=request.query,
            maxResults=request.max_results
        ).execute()

        messages = []
        for msg in results.get('messages', []):
            message = service.users().messages().get(
                userId='me',
                id=msg['id'],
                format='metadata'
            ).execute()
            
            headers = message['payload']['headers']
            subject = next(h['value'] for h in headers if h['name'] == 'Subject')
            from_email = next(h['value'] for h in headers if h['name'] == 'From')
            
            messages.append({
                'id': msg['id'],
                'subject': subject,
                'from': from_email,
                'date': message['internalDate']
            })

        return {"messages": messages}
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/gmail/send")
async def send_gmail(request: SendMailRequest, nodeId: str):
    try:
        credentials = get_credentials(nodeId)
        if not credentials:
            raise HTTPException(status_code=400, detail="Gmail not authorized for this node")
        
        service = build('gmail', 'v1', credentials=credentials)
        
        # Create message
        message = MIMEText(request.body)
        message['to'] = request.to
        message['subject'] = request.subject
        
        # Encode the message
        raw = base64.urlsafe_b64encode(message.as_bytes())
        raw = raw.decode()
        
        # Send message
        try:
            service.users().messages().send(
                userId='me',
                body={'raw': raw}
            ).execute()
            return {"message": "Email sent successfully"}
        except Exception as e:
            raise HTTPException(status_code=400, detail=f"Failed to send email: {str(e)}")
            
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    
@app.post("/api/process")
async def process_pipeline(request: PipelineRequest):
    try:
        # Existing graph creation code remains the same
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
                  print(f"Debug - Node data for mail-search: {node.data}")  # See what's in node.data
    
    # Try different possible locations of the search results
                  search_results = node.data.get('value', '')  # Try 'value'
                  if not search_results:
                      search_results = node.data.get('searchResults', '')  # Try 'searchResults'
                  if not search_results:
                      search_results = node.data.get('messages', '')  # Try 'messages'
        
                  print(f"Debug - Search results found: {search_results}")
    
                  node_values[node_id] = search_results
                  print(f"Debug - Node values after setting: {node_values}")
                    
                     

                elif node.type == 'llm':
                    # Existing LLM logic remains the same
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

                # Rest of your existing node type handling remains the same
                elif node.type == 'file':
                    file_data = node.data
                    file_content = file_data.get('fileContent', '')
                    node_values[node_id] = file_content
                
                elif node.type == 'mail-send':
                   # Get the email body from incoming edge, similar to output node
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