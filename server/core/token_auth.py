"""
Unified Token Authentication for FinTrack.
Combines JWT token operations with Flask authentication decorators.
Simplified architecture focused on token-based authentication as used by frontend.
"""
import jwt  # This is PyJWT
import datetime
import logging
from functools import wraps
from flask import request, jsonify
from cryptography.hazmat.primitives import serialization
from cryptography.hazmat.primitives.asymmetric import rsa
from cryptography.hazmat.backends import default_backend

from core.db_manager import get_user_db_connection, get_user_by_username, get_user_keypair, generate_user_keypair
from core.oauth import get_current_user_info

# Error constants
ERROR_USER_NOT_FOUND = 'User not found'
ERROR_TOKEN_MISSING = 'Token is missing'
ERROR_TOKEN_INVALID = 'Token is invalid'


class TokenError(Exception):
    """Custom exception for token operations."""
    pass


# =====================================
# LOW-LEVEL CRYPTO OPERATIONS
# =====================================

def create_jwt_token(private_key_pem, user_id, expires_hours=24):
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
        logging.error("Error creating JWT token: %s", str(e))
        raise TokenError(f"Failed to create token: {str(e)}") from e


def verify_jwt_token(token, public_key_pem):
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
        raise TokenError("Token has expired")
    except jwt.InvalidTokenError as e:
        logging.warning("Invalid token: %s", str(e))
        raise TokenError(f"Invalid token: {str(e)}")
    except Exception as e:
        logging.error("Error verifying token: %s", str(e))
        raise TokenError(f"Failed to verify token: {str(e)}") from e


# =====================================
# HIGH-LEVEL AUTH OPERATIONS  
# =====================================

def extract_user_from_token(token):
    """Extract and verify user ID from JWT token."""
    try:
        # Get unverified payload to extract username from sub claim
        unverified_payload = jwt.decode(token, options={"verify_signature": False})
        username = unverified_payload.get('sub')
        
        logging.info("[TOKEN] Verifying token for user: %s", username)
        
        if not username:
            raise TokenError('Invalid token format')
        
        # Get user's public key for verification
        keypair = get_user_keypair(username)
        if not keypair:
            logging.error("[TOKEN] No keypair found for user: %s", username)
            raise TokenError(ERROR_USER_NOT_FOUND)
        
        # Verify token with user's public key
        payload = verify_jwt_token(token, keypair['public_key'])
        logging.info("[TOKEN] Token verified successfully for user: %s", username)
        return payload['sub']
        
    except TokenError:
        raise
    except Exception as e:
        logging.warning("[TOKEN] Token verification error: %s", str(e))
        raise TokenError('Token verification failed')


def create_token_for_user(username):
    """Create JWT token for authenticated user."""
    try:
        user_data = get_user_by_username(username)
        
        if not user_data or not user_data.get('private_key'):
            raise TokenError(ERROR_USER_NOT_FOUND)
            
        token = create_jwt_token(
            user_data['private_key'], 
            username,
            expires_hours=24
        )
        
        return token
    except TokenError:
        raise
    except Exception as e:
        logging.error("Error creating token: %s", str(e))
        raise TokenError(f"Token creation failed: {str(e)}")


# =====================================
# FLASK AUTHENTICATION DECORATORS
# =====================================

def token_required(f):
    """Decorator to require JWT token for endpoints. Includes session fallback for web."""
    @wraps(f)
    def decorated(*args, **kwargs):
        token = None
        
        # Check for token in Authorization header
        if 'Authorization' in request.headers:
            auth_header = request.headers['Authorization']
            if auth_header.startswith('Bearer '):
                token = auth_header.split(" ")[1]
                logging.info("[AUTH] Found Bearer token in request")
        
        # Session fallback for web browsers
        if not token:
            logging.info("[AUTH] No Bearer token found, trying session-based auth")
            try:
                user_info_result, error = get_current_user_info(lambda: get_user_db_connection())
                if user_info_result and not error:
                    # Create temporary token for session-based user
                    username = user_info_result.get('username')
                    try:
                        token = create_token_for_user(username)
                        logging.info("[AUTH] Created temporary token for session user: %s", username)
                    except TokenError as e:
                        logging.warning("[AUTH] Could not create session token: %s", str(e))
                else:
                    logging.info("[AUTH] Session-based auth failed: %s", error)
            except Exception as e:
                logging.warning("[AUTH] Session fallback error: %s", str(e))
        
        if not token:
            logging.error("[AUTH] No token found - returning 401")
            return jsonify({'message': ERROR_TOKEN_MISSING}), 401
            
        try:
            current_user_id = extract_user_from_token(token)
            logging.info("[AUTH] Authentication successful for user: %s", current_user_id)
            return f(current_user_id, *args, **kwargs)
        except TokenError as e:
            logging.error("[AUTH] Token validation failed: %s", str(e))
            return jsonify({'message': str(e)}), 401
            
    return decorated


# =====================================
# USER KEYPAIR MANAGEMENT (Optional)
# =====================================

def refresh_user_keypair(user_id, db_connection):
    """Generate new keypair for user and update in database. (Optional - not used by frontend)"""
    try:
        private_key, public_key = generate_user_keypair()
        
        cursor = db_connection.cursor()
        cursor.execute(
            "UPDATE users SET private_key = ?, public_key = ? WHERE username = ?",
            (private_key, public_key, user_id)
        )
        db_connection.commit()
        
        if cursor.rowcount == 0:
            raise TokenError(f"User {user_id} not found for keypair update")
        
        logging.info("Refreshed keypair for user: %s", user_id)
        return private_key, public_key
        
    except TokenError:
        raise
    except Exception as e:
        logging.error("Error refreshing keypair for user %s: %s", user_id, str(e))
        raise TokenError(f"Failed to refresh keypair: {str(e)}") from e
