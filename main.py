import os
import sys
import uvicorn

if __name__ == "__main__":
    print("Starting FastAPI backend...")
    
    # Get absolute path to backend
    backend_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "backend")
    
    # Add backend to sys.path so 'main' refers to 'backend/main.py'
    sys.path.insert(0, backend_path)
    
    # Change working directory to 'backend'
    os.chdir(backend_path)
    
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
    
