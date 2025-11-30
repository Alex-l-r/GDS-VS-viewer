# Changelog

All notable changes to the GDS Viewer VS Code extension will be documented in this file.

## [1.0.0] - 2025-10-07

### Added
- Initial release of GDS Viewer for VS Code
- Custom editor for `.gds` and `.oas` files
- Interactive layout viewer with pan and zoom capabilities
- Layer visibility controls and hierarchy navigation
- Cell navigation and hierarchy tree view
- Multiple viewing modes (select, move, ruler)
- Support for multiple concurrent GDS files
- Automatic Python server management (one per file)
- WebSocket-based real-time rendering using KLayout
- Output channel for debugging and server logs
- Command: "GDS Viewer: Open File" for browsing files
- Configuration option for custom Python path
- RDB (DRC/LVS results) visualization support
- Cell metadata display
- Annotation and ruler tools

### Technical
- TypeScript extension with VS Code API integration
- Python backend using FastAPI and KLayout
- Dynamic port allocation (8765-8864) for multi-file support
- Automatic server lifecycle management
- CSP-compliant webview implementation
- Clean resource cleanup on editor close

### Credits
Based on [kweb 2.0.4](https://github.com/gdsfactory/kweb) by gdsfactory community
