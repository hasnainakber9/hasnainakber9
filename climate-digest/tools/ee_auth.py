"""Earth Engine login from environment variables.

The key can be given as:
  EE_SERVICE_ACCOUNT_KEY            the whole JSON key (or base64 of it), or
  EE_SERVICE_ACCOUNT_KEY_1, _2, ... consecutive pieces of it, if the settings
                                    field truncates long values (~1 KB limit seen).
Plus EE_PROJECT = the Cloud project id registered for Earth Engine.
"""
import base64
import json
import os


def load_key():
    parts = []
    i = 1
    while os.environ.get(f"EE_SERVICE_ACCOUNT_KEY_{i}") is not None:
        parts.append(os.environ[f"EE_SERVICE_ACCOUNT_KEY_{i}"])
        i += 1
    raw = "".join(parts) if parts else os.environ.get("EE_SERVICE_ACCOUNT_KEY", "")
    raw = raw.strip()
    if not raw:
        return None, None
    try:
        info = json.loads(raw)
    except json.JSONDecodeError:
        try:
            raw = base64.b64decode(raw + "=" * (-len(raw) % 4)).decode()
            info = json.loads(raw)
        except Exception as e:  # noqa: BLE001
            raise ValueError(f"key is neither valid JSON nor base64 JSON ({len(raw)} chars received; "
                             "a full key is ~2,300 chars, so it may be truncated)") from e
    return raw, info


def init():
    import ee  # type: ignore
    raw, info = load_key()
    if not raw:
        raise RuntimeError("EE_SERVICE_ACCOUNT_KEY not set")
    ee.Initialize(ee.ServiceAccountCredentials(info["client_email"], key_data=raw),
                  project=os.environ["EE_PROJECT"])
    return ee
