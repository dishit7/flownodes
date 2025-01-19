
# Flownodes
##  Project Description

Flownodes is a low-code node-based tool for building **GenAI**-powered agentic workflows. It allows users to design workflows through an intuitive UI with minimal code. This is a basic version of the tool, designed to simplify the creation of intelligent workflows for both developers and non-technical users. With Flownodes, you can visually create powerful workflows and automate tasks with ease, leveraging the potential of AI.

## Project Overview

- **Frontend**: Built with Next.js +TS
- **Backend**: Python FastApi  for handling logic and workflows
- **Purpose**: Allows users to create workflows with a simple UI and a backend that handles the logic of node execution.

## Prerequisites

- **Node.js** (LTS version recommended)
- **Python 3.x** (Ensure it's installed)
- **Gemini API Key** (For Gemini API integration)

## Getting Started

### 1. Frontend Setup
1. Clone the repository:
    ```bash
    git clone https://github.com/your-repository/flownodes.git
    cd flownodes
    ```

2. Install the frontend dependencies:
    ```bash
    npm install
    ```

3. Start the frontend development server:
    ```bash
    npm run dev
    ```

   The app should now be running at `http://localhost:3000`.

### 2. Backend Setup

1. Navigate to the backend directory:
    ```bash
    cd backend
    ```

2. Install Python dependencies (You can use a virtual environment if needed):
    ```bash
    pip install -r requirements.txt
    ```

3. Start the backend server:
    ```bash
    python main.py
    ```

   The backend will start running on `http://localhost:5000`.

### 3. Configuration
 
1. Add your **Gemini API Key** to the `.env` file:
    ```env
    GEMINI_API_KEY=your-api-key-here
    ```

 ## Architecture Overview

The architecture of Flownodes is designed for performance, scalability, and ease of use.

- **Frontend**: 
    - Hosted on **Vercel**, the frontend is built using **Next.js** and **TypeScript** for a modern, robust, and scalable user experience.
    - **ReactFlow** is utilized for the drag-and-drop node interface, enabling users to design workflows visually.
    - The app uses **Zustand** for centralized state management, allowing for seamless synchronization of workflow logic and UI components.

- **Backend**:
    - The backend is powered by **FastAPI**, an asynchronous web framework for Python, ensuring high-performance API endpoints.
    - The backend is hosted on an **AWS EC2 instance**, providing a reliable and scalable environment for the execution of workflows and API requests.

- **Data Flow**:
    - The frontend sends user requests to the backend, where the workflow logic is processed.
    - The **Gemini API** is integrated into the backend to provide AI-driven functionality for various tasks, such as text generation or task automation.
    - The workflow states are managed centrally using **Zustand**, allowing the frontend to reactively update based on user interactions.


## Workflow Demo

Below is a screenshot of a workflow demo created using Flownodes:

![Workflow Demo](./public/WorkflowDemo2.png)


