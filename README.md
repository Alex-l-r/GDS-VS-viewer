# GDS VS-Viewer

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![VS Code](https://img.shields.io/badge/VS%20Code-Extension-blue.svg)](https://code.visualstudio.com/)

View GDS and OAS chip layout files directly in Visual Studio Code using an implementation of [kweb](https://github.com/gdsfactory/kweb).

![GDS VS-Viewer Screenshot](media/screenshot.png)

## Features

- 📁 **Direct File Viewing**: Open `.gds` and `.oas` files directly in VS Code
- 🔍 **Interactive Viewer**: Pan, zoom, and navigate through chip layouts
- 📊 **Layer Management**: Toggle visibility, explore layer hierarchies
- 🏗️ **Cell Navigation**: Browse and switch between cells
- ⚡ **Powered by KLayout**: Industry-standard rendering engine
- 🎨 **Dark Mode**: Seamless VS Code theme integration

## Installation

### Prerequisites

- **Python 3.11+** with the following packages:
  ```bash
  pip install klayout>=0.29.4 fastapi uvicorn[standard] jinja2 pydantic_extra_types>=2.6.0
  ```
  Or simply: `pip install -e .`

### Install Extension

1. Download the `.vsix` file from releases
2. In VS Code: Extensions → "..." menu → Install from VSIX
3. Or build from source (see Development section)

## Usage

1. **Open a GDS file** - Just open any `.gds` or `.oas` file in VS Code
2. **The viewer appears automatically** with your layout rendered
3. **Interact with the layout:**
   - **Pan**: Click and drag on canvas
   - **Zoom**: Mouse wheel
   - **Layers**: Toggle visibility in right panel
   - **Cells**: Navigate hierarchy in Cells tab
   - **Zoom Fit**: Click button to fit layout to view

### Commands

- Press `Ctrl+Shift+P` → Type "GDS VS-Viewer: Open GDS File" to browse for a file

## Configuration

Configure the extension in VS Code settings (`Ctrl+,`):

| Setting | Default | Description |
|---------|---------|-------------|
| `gdsViewer.pythonPath` | `""` | Path to Python executable. Leave empty to auto-detect. |
| `gdsViewer.serverTimeout` | `10000` | Timeout in ms to wait for Python server to start. |
| `gdsViewer.hideEmptyLayers` | `true` | Hide empty layers by default in the layer panel. |
| `gdsViewer.autoReload` | `false` | Automatically reload layout when file changes on disk. |

Example settings.json:
```json
{
  "gdsViewer.pythonPath": "C:/Python311/python.exe",
  "gdsViewer.serverTimeout": 15000
}
```

## Development

### Build from Source

```bash
# Install dependencies
pip install -e .
npm install

# Build
npm run compile

# Run
# Press F5 in VS Code to launch Extension Development Host
```

### Watch Mode

```bash
npm run watch  # Auto-recompile on changes
# Press F5, then Ctrl+R to reload after changes
```

### Package

```bash
npm install -g @vscode/vsce
vsce package
# Creates: gds-vs-viewer-x.x.x.vsix
```

## Architecture

- **TypeScript Extension**: Manages VS Code integration
- **Python Backend**: FastAPI server with KLayout for rendering
- **Communication**: WebSocket between webview and Python server
- **Multi-file**: Each GDS file gets its own server instance (auto port allocation)

## Troubleshooting

**Python/KLayout not found:**
```bash
python --version  # Should be 3.11+
pip install klayout
python -c "import klayout.db; print('OK')"
```

**Server won't start:**
- Check Output panel: View → Output → "GDS VS-Viewer"
- Verify Python dependencies installed
- Check firewall isn't blocking localhost

**Extension errors:**
- Reload window: Ctrl+Shift+P → "Developer: Reload Window"
- Check for TypeScript errors: `npm run compile`

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## Credits

Based on [kweb](https://github.com/gdsfactory/kweb) by the gdsfactory community.
- **KLayout**: Layout viewer by Matthias Köfferlein

## License

MIT License - See [LICENSE](LICENSE) file

## Author

**Alejandro Lorenzo Ruiz** - [GitHub](https://github.com/alejandrolorenzo)
