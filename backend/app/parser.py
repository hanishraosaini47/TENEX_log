"""
ZScaler-style web proxy log parser.

Expected format: one record per line, space-separated key=value pairs,
with a leading ISO timestamp. Example:

  2026-04-22T14:32:11Z user=alice.chen src_ip=10.0.2.15 dst=example.com \\
      bytes=4829 status=200 category=Search action=Allowed

Design:
  - `parse_line` is a pure function: str -> dict | None.
    Returns None on malformed input so the caller can skip gracefully.
  - `parse_file` is a generator that streams a file-like object.
"""
from datetime import datetime
from typing import Iterator, Optional, IO

from dateutil import parser as date_parser


REQUIRED_FIELDS = {"user", "src_ip", "dst", "bytes", "status", "category", "action"}


def parse_line(line: str) -> Optional[dict]:
    """Parse one ZScaler log line into a structured dict.

    Returns None if the line is blank, a comment, or malformed.
    """
    line = line.strip()
    if not line or line.startswith("#"):
        return None

    tokens = line.split()
    if len(tokens) < 2:
        return None

    # First token is the timestamp
    try:
        ts = date_parser.parse(tokens[0])
    except (ValueError, TypeError):
        return None

    # Remaining tokens are key=value
    fields: dict = {}
    for tok in tokens[1:]:
        if "=" not in tok:
            continue
        key, _, value = tok.partition("=")
        fields[key.strip()] = value.strip()

    if not REQUIRED_FIELDS.issubset(fields.keys()):
        return None

    # Normalize numeric fields
    try:
        bytes_val = int(fields.get("bytes", 0))
    except ValueError:
        bytes_val = 0
    try:
        status_val = int(fields.get("status", 0))
    except ValueError:
        status_val = 0

    return {
        "timestamp": ts,
        "username": fields.get("user"),
        "src_ip": fields.get("src_ip"),
        "dst": fields.get("dst"),
        "bytes_transferred": bytes_val,
        "status": status_val,
        "category": fields.get("category"),
        "action": fields.get("action"),
    }


def parse_file(fileobj: IO) -> Iterator[dict]:
    """Stream-parse a file-like object, yielding one dict per valid line.

    Malformed lines are silently skipped — logs are noisy in practice and
    one bad line shouldn't abort an upload.
    """
    for raw in fileobj:
        # raw may be bytes if file is opened in binary mode
        if isinstance(raw, bytes):
            try:
                raw = raw.decode("utf-8", errors="replace")
            except Exception:
                continue
        parsed = parse_line(raw)
        if parsed is not None:
            yield parsed
