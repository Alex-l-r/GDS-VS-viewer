"""Tests for the GDS Viewer backend."""
import sys
from pathlib import Path

import pytest

# Add src to path for imports
sys.path.insert(0, str(Path(__file__).parent.parent / "src"))

from kweb.config import Config


class TestConfig:
    """Tests for the Config class."""

    def test_config_with_valid_path(self, tmp_path: Path) -> None:
        """Test config creation with a valid path."""
        config = Config(fileslocation=tmp_path)
        assert config.fileslocation == tmp_path.resolve()
        assert config.editable is False
        assert config.add_missing_layers is True
        assert config.meta_splitter == ":"
        assert config.max_rdb_limit == 100

    def test_config_resolves_path(self, tmp_path: Path) -> None:
        """Test that config resolves relative paths."""
        config = Config(fileslocation=str(tmp_path))
        assert config.fileslocation.is_absolute()

    def test_config_custom_values(self, tmp_path: Path) -> None:
        """Test config with custom values."""
        config = Config(
            fileslocation=tmp_path,
            editable=True,
            add_missing_layers=False,
            meta_splitter="|",
            max_rdb_limit=50,
        )
        assert config.editable is True
        assert config.add_missing_layers is False
        assert config.meta_splitter == "|"
        assert config.max_rdb_limit == 50


class TestLayoutServer:
    """Tests for layout server functionality."""

    def test_marker_category_default(self) -> None:
        """Test MarkerCategory with default values."""
        from kweb.layout_server import MarkerCategory
        
        category = MarkerCategory()
        assert category.dither_pattern == 5
        assert category.line_width == 1
        assert category.halo == -1

    def test_marker_category_custom_color(self) -> None:
        """Test MarkerCategory with custom color."""
        from kweb.layout_server import MarkerCategory
        
        category = MarkerCategory(color="blue", line_width=2)
        assert category.line_width == 2

    def test_item_marker_group_clear(self) -> None:
        """Test ItemMarkerGroup clear method."""
        from kweb.layout_server import ItemMarkerGroup
        
        group = ItemMarkerGroup()
        group.markers = ["marker1", "marker2"]  # type: ignore
        group.clear()
        assert group.markers == []


class TestVSCodeServer:
    """Tests for VS Code server module."""

    def test_create_app_with_nonexistent_file(self, tmp_path: Path) -> None:
        """Test that create_app handles file validation."""
        from kweb.vscode_server import create_app
        
        # Create a dummy GDS file
        gds_file = tmp_path / "test.gds"
        gds_file.touch()
        
        app = create_app(gds_file)
        assert app is not None
        assert app.title == "GDS Viewer for VS Code"


# Integration test placeholder
class TestIntegration:
    """Integration tests (require full environment)."""

    @pytest.mark.skip(reason="Requires KLayout GUI environment")
    def test_websocket_connection(self) -> None:
        """Test WebSocket connection to server."""
        pass

    @pytest.mark.skip(reason="Requires KLayout GUI environment")
    def test_load_gds_file(self) -> None:
        """Test loading a GDS file."""
        pass
