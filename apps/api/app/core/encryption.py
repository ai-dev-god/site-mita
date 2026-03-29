"""AES-256 field-level encryption for PII (email, phone)."""

import base64
import os

from cryptography.hazmat.primitives.ciphers.aead import AESGCM

from app.core.config import get_settings


def _get_key() -> bytes:
    raw = get_settings().pii_encryption_key.get_secret_value()
    # Pad/truncate to exactly 32 bytes for AES-256
    return raw.encode()[:32].ljust(32, b"\x00")


def encrypt_pii(plaintext: str) -> str:
    """Encrypt a PII string → base64-encoded ciphertext (nonce || ciphertext)."""
    key = _get_key()
    aesgcm = AESGCM(key)
    nonce = os.urandom(12)
    ciphertext = aesgcm.encrypt(nonce, plaintext.encode(), None)
    return base64.b64encode(nonce + ciphertext).decode()


def decrypt_pii(token: str) -> str:
    """Decrypt a base64-encoded PII token → plaintext."""
    key = _get_key()
    aesgcm = AESGCM(key)
    raw = base64.b64decode(token)
    nonce, ciphertext = raw[:12], raw[12:]
    return aesgcm.decrypt(nonce, ciphertext, None).decode()
