from fastapi import APIRouter, HTTPException, Request
from fastapi.responses import RedirectResponse
from pydantic import BaseModel
from google.oauth2.credentials import Credentials
from google_auth_oauthlib.flow import Flow
from googleapiclient.discovery import build
from typing import Dict, Optional
from email.mime.text import MIMEText
import base64

router = APIRouter()

class SendMailRequest(BaseModel):
    to: str
    subject: str
    body: str

class GmailSearchRequest(BaseModel):
    query: str
    max_results: int = 5

# Gmail configuration
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

# In-memory storage
credentials_store: Dict[str, Dict] = {}
pending_node_id = None

def store_credentials(node_id: str, credentials: Credentials) -> None:
    credentials_dict = {
        'token': credentials.token,
        'refresh_token': credentials.refresh_token,
        'token_uri': credentials.token_uri,
        'client_id': credentials.client_id,
        'client_secret': credentials.client_secret,
        'scopes': credentials.scopes
    }
    credentials_store[node_id] = credentials_dict

def get_credentials(node_id: str) -> Optional[Credentials]:
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

@router.get("/auth/gmail")
async def gmail_auth(nodeId: str):
    global pending_node_id
    pending_node_id = nodeId
    auth_url, _ = flow.authorization_url(prompt='consent')
    return {"url": auth_url}

@router.get("/auth/callback")
async def auth_callback(request: Request):
    global pending_node_id
    query_params = request.query_params
    code = query_params.get('code')

    if not code or not pending_node_id:
        raise HTTPException(status_code=400, detail="Missing code or no pending auth")

    try:
        flow.fetch_token(code=code)
        credentials = flow.credentials
        store_credentials(pending_node_id, credentials)
        redirect_url = f"https://flownodes.dishit.dev/?nodeId={pending_node_id}&authSuccess=true"
        pending_node_id = None
        return RedirectResponse(url=redirect_url)
    except Exception as e:
        pending_node_id = None
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/gmail/search")
async def search_gmail(request: GmailSearchRequest, nodeId: str):
    try:
        credentials = get_credentials(nodeId)
        if not credentials:
            raise HTTPException(status_code=400, detail=f"No credentials found for node {nodeId}")

        service = build('gmail', 'v1', credentials=credentials)
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

@router.post("/gmail/send")
async def send_gmail(request: SendMailRequest, nodeId: str):
    try:
        credentials = get_credentials(nodeId)
        if not credentials:
            raise HTTPException(status_code=400, detail="Gmail not authorized for this node")
        
        service = build('gmail', 'v1', credentials=credentials)
        message = MIMEText(request.body)
        message['to'] = request.to
        message['subject'] = request.subject
        
        raw = base64.urlsafe_b64encode(message.as_bytes()).decode()
        
        service.users().messages().send(
            userId='me',
            body={'raw': raw}
        ).execute()
        return {"message": "Email sent successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))