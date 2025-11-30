from __future__ import annotations

from pathlib import Path

import pydantic

# Check Pydantic version and use appropriate base class
_PYDANTIC_V2 = int(pydantic.__version__.split(".")[0]) >= 2

if _PYDANTIC_V2:
    from pydantic import field_validator
    from pydantic_settings import BaseSettings, SettingsConfigDict

    class Config(BaseSettings):
        """Configuration for the GDS Viewer backend."""
        
        model_config = SettingsConfigDict(
            env_prefix="kweb_",
            env_nested_delimiter="_",
        )

        fileslocation: Path
        meta_splitter: str = ":"
        editable: bool = False
        add_missing_layers: bool = True
        max_rdb_limit: int = 100
        """Maximum rdb errors the client can request."""

        @field_validator("fileslocation", mode="before")
        @classmethod
        def resolvefileslocation(cls, v: Path | str) -> Path:
            return Path(v).expanduser().resolve()

else:
    # Fallback for Pydantic v1
    class Config(pydantic.BaseSettings):  # type: ignore[no-redef, misc]
        class Config:
            env_prefix = "kweb_"
            env_nested_delimiter = "_"

        fileslocation: Path
        meta_splitter: str = ":"
        editable: bool = False
        add_missing_layers: bool = True
        max_rdb_limit: int = 100

        @pydantic.validator("fileslocation", pre=True)
        @classmethod
        def resolvefileslocation(cls, v: Path | str) -> Path:
            return Path(v).expanduser().resolve()
