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
load_dotenv()



app = FastAPI()
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
if not GEMINI_API_KEY:
    raise ValueError("GOOGLE_API_KEY is not set in the environment variables.")
genai.configure(api_key=GEMINI_API_KEY)
model = genai.GenerativeModel('gemini-pro')
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],  # Add your frontend URL
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure Gmail OAuth
CLIENT_SECRETS_FILE = "client_secret_863038160732-ddq9eij6rqa6h3e5oc8s4uubacm8j26f.apps.googleusercontent.com.json"
SCOPES = ['https://www.googleapis.com/auth/gmail.readonly']

flow = Flow.from_client_secrets_file(
    CLIENT_SECRETS_FILE,
    scopes=SCOPES,
    redirect_uri="http://localhost:8000/api/auth/callback"
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

# Pipeline processing logic
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
                    
                    if not next_node:
                        raise HTTPException(status_code=400, detail=f"Node with ID {next_id} not found")

                    if next_node.type == 'llm':
                        # Example for LLM node processing
                        if 'model' not in globals():
                            raise HTTPException(
                                status_code=500, 
                                detail="The 'model' for LLM processing is not defined"
                            )
                        response = model.generate_content(node_values[current_id])
                        node_values[next_id] = response.text
                    
                    elif next_node.type == 'mail':
                        # Gmail search node
                        credentials = get_credentials(next_node.id)  # Replace with actual credential retrieval logic
                        if not credentials:
                            raise HTTPException(status_code=400, detail="Gmail not authorized for this node")
                        
                        # Build Gmail service
                        service = build('gmail', 'v1', credentials=credentials)
                        
                        # Perform Gmail search
                        results = service.users().messages().list(
                            userId='me',
                            q=next_node.data.get('searchQuery', ''),
                            maxResults=next_node.data.get('maxResults', 5)
                        ).execute()
                        
                        # Parse email messages
                        messages = []
                        for msg in results.get('messages', []):
                            message = service.users().messages().get(
                                userId='me',
                                id=msg['id'],
                                format='metadata'
                            ).execute()
                            
                            headers = message['payload']['headers']
                            subject = next((h['value'] for h in headers if h['name'] == 'Subject'), '')
                            from_email = next((h['value'] for h in headers if h['name'] == 'From'), '')
                            
                            messages.append({
                                'id': msg['id'],
                                'subject': subject,
                                'from': from_email,
                                'date': message['internalDate']
                            })
                        
                        node_values[next_id] = messages
                    
                    elif next_node.type == 'output':
                        # Pass through to output
                        node_values[next_id] = node_values.get(current_id, '')

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
