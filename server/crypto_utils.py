"""
Cryptography utilities for user-based JWT token generation.
"""

import jwt
import datetime
import logging
from cryptography.hazmat.primitives import serialization
from cryptography.hazmat.primitives.asymmetric import rsa
from cryptography.hazmat.backends import default_backend


class KeypairError(Exception):
    """Custom exception for keypair operations."""
    pass


def generate_keypair():
    """Generate RSA keypair for JWT signing."""
    try:
        # Generate private key
        private_key = rsa.generate_private_key(
            public_exponent=65537,
            key_size=2048,
            backend=default_backend()
        )
        
        # Get public key
        public_key = private_key.public_key()
        
        # Serialize keys to PEM format
        private_pem = private_key.private_bytes(
            encoding=serialization.Encoding.PEM,
            format=serialization.PrivateFormat.PKCS8,
            encryption_algorithm=serialization.NoEncryption()
        ).decode('utf-8')
        
        public_pem = public_key.public_bytes(
            encoding=serialization.Encoding.PEM,
            format=serialization.PublicFormat.SubjectPublicKeyInfo
        ).decode('utf-8')
        
        return private_pem, public_pem
        
    except Exception as e:
        logging.error("Error generating keypair: %s", str(e))
        raise KeypairError(f"Failed to generate keypair: {str(e)}") from e


def create_user_token(private_key_pem, user_id, expires_hours=24):
    """Create JWT token for user using their private key."""
    try:
        # Load private key
        private_key = serialization.load_pem_private_key(
            private_key_pem.encode('utf-8'),
            password=None,
            backend=default_backend()
        )
        
        # Create token payload using timezone-aware datetime
        now = datetime.datetime.now(datetime.timezone.utc)
        payload = {
            'user_id': user_id,
            'iat': now,
            'exp': now + datetime.timedelta(hours=expires_hours)
        }
        
        # Sign token with private key
        token = jwt.encode(payload, private_key, algorithm='RS256')
        return token
        
    except Exception as e:
        logging.error("Error creating user token: %s", str(e))
        raise KeypairError(f"Failed to create token: {str(e)}") from e


def verify_user_token(token, public_key_pem):
    """Verify JWT token using user's public key."""
    try:
        # Load public key
        public_key = serialization.load_pem_public_key(
            public_key_pem.encode('utf-8'),
            backend=default_backend()
        )
        
        # Verify token
        payload = jwt.decode(token, public_key, algorithms=['RS256'])
        return payload
        
    except jwt.ExpiredSignatureError:
        logging.warning("Token has expired")
        raise
    except jwt.InvalidTokenError as e:
        logging.warning("Invalid token: %s", str(e))
        raise
    except Exception as e:
        logging.error("Error verifying token: %s", str(e))
        raise KeypairError(f"Failed to verify token: {str(e)}") from e


def refresh_user_keypair(user_id, db_connection):
    """Generate new keypair for user and update in database."""
    try:
        private_key, public_key = generate_keypair()
        
        cursor = db_connection.cursor()
        cursor.execute(
            "UPDATE users SET private_key = ?, public_key = ? WHERE username = ?",
            (private_key, public_key, user_id)
        )
        db_connection.commit()
        
        if cursor.rowcount == 0:
            raise KeypairError(f"User {user_id} not found for keypair update")
        
        logging.info("Refreshed keypair for user: %s", user_id)
        return private_key, public_key
        
    except KeypairError:
        raise
    except Exception as e:
        logging.error("Error refreshing keypair for user %s: %s", user_id, str(e))
        raise KeypairError(f"Failed to refresh keypair: {str(e)}") from e
