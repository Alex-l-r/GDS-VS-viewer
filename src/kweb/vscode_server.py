"""
VS Code GDS Viewer Server

This script starts a minimal FastAPI server for viewing a single GDS file in VS Code.
"""
import argparse
import sys
from pathlib import Path
from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
import uvicorn

# Add the parent directory to the path so we can import kweb modules
sys.path.insert(0, str(Path(__file__).parent.parent))

from kweb.layout_server import LayoutViewServerEndpoint
from kweb import config as kweb_config


def create_app(file_path: Path) -> FastAPI:
    """Create a FastAPI app for viewing a single GDS file."""
    
    # Get the directory containing the file
    file_dir = file_path.parent
    
    # Create config
    _settings = kweb_config.Config(
        fileslocation=file_dir,
        editable=False,
        add_missing_layers=True,
        meta_splitter=":",
        max_rdb_limit=100
    )
    
    # Create the layout view server endpoint
    class VSCodeLayoutViewServerEndpoint(
        LayoutViewServerEndpoint,
        root=_settings.fileslocation,
        editable=False,
        add_missing_layers=_settings.add_missing_layers,
        meta_splitter=_settings.meta_splitter,
        max_rdb_limit=_settings.max_rdb_limit,
    ):
        pass
    
    # Create FastAPI app
    app = FastAPI(title="GDS Viewer for VS Code")
    
    # Add WebSocket route
    app.add_websocket_route("/ws", VSCodeLayoutViewServerEndpoint)
    
    # Mount static files
    static_dir = Path(__file__).parent / "static"
    if static_dir.exists():
        app.mount("/static", StaticFiles(directory=str(static_dir)), name="static")
    
    return app


def main():
    parser = argparse.ArgumentParser(description="Start GDS viewer server for VS Code")
    parser.add_argument("--file", required=True, help="Path to the GDS file to view")
    parser.add_argument("--port", type=int, default=8765, help="Port to run the server on")
    parser.add_argument("--host", default="127.0.0.1", help="Host to bind to")
    
    args = parser.parse_args()
    
    file_path = Path(args.file).resolve()
    
    if not file_path.exists():
        print(f"Error: File not found: {file_path}", file=sys.stderr)
        sys.exit(1)
    
    if not file_path.is_file():
        print(f"Error: Not a file: {file_path}", file=sys.stderr)
        sys.exit(1)
    
    print(f"Starting GDS viewer server for file: {file_path}")
    print(f"Server will be available at http://{args.host}:{args.port}")
    
    # Create the app
    app = create_app(file_path)
    
    # Run the server
    uvicorn.run(
        app,
        host=args.host,
        port=args.port,
        log_level="info",
        access_log=False
    )


if __name__ == "__main__":
    main()
