"""
Token and Authentication API for FinTrack.
Handles JWT token creation, validation, session management, and OAuth operations.
"""
import os
import logging
import json
from flask import Blueprint, request, jsonify, session
from core.oauth import get_current_user_info
from core.database import get_db_connection, get_user_by_username, get_user_keypair
from core.crypto_utils import create_user_token, verify_user_token, KeypairError

# Create blueprint
auth_bp = Blueprint('auth', __name__)

# Database path
DB_PATH = os.environ.get('DB_PATH', 'db/user.db')

# Error constants
ERROR_USER_NOT_FOUND = 'User not found'
ERROR_INTERNAL_SERVER = 'Internal server error'
ERROR_TOKEN_MISSING = 'Token is missing'
ERROR_TOKEN_INVALID = 'Token is invalid'

def get_user_from_token(token):
    """Extract user ID and verify token."""
    try:
        # Extract user_id without verification first (we need it to find the public key)
        import jwt
        unverified_payload = jwt.decode(token, options={"verify_signature": False})
        user_id = unverified_payload.get('user_id')
        
        logging.info(f"[AUTH] Token user_id: {user_id}")
        
        if not user_id:
            return None, 'Invalid token format'
        
        # Get user's public key
        keypair = get_user_keypair(DB_PATH, user_id)
        if not keypair:
            logging.error(f"[AUTH] No keypair found for user: {user_id}")
            return None, ERROR_USER_NOT_FOUND
        
        # Now verify token with user's public key
        payload = verify_user_token(token, keypair['public_key'])
        logging.info(f"[AUTH] Token verified successfully for user: {user_id}")
        return payload['user_id'], None
        
    except KeypairError as e:
        logging.warning(f"[AUTH] Token verification failed (possibly due to keypair regeneration): {str(e)}")
        return None, f'Token verification failed: {str(e)}'
    except Exception as e:
        logging.warning(f"[AUTH] Token verification error (possibly due to keypair regeneration): {str(e)}")
        return None, 'Token verification failed'

@auth_bp.route('/api/auth/token', methods=['POST'])
def create_token():
    """Create JWT token for authenticated user."""
    try:
        user_info_result, error = get_current_user_info(lambda: get_db_connection(DB_PATH), DB_PATH)
        if not user_info_result or error:
            return jsonify({'message': 'Not authenticated'}), 401
        
        username = user_info_result.get('username')
        user_data = get_user_by_username(DB_PATH, username)
        
        if not user_data or not user_data.get('private_key'):
            return jsonify({'message': ERROR_USER_NOT_FOUND}), 404
            
        token = create_user_token(
            user_data['private_key'], 
            username,
            expires_hours=24
        )
        
        return jsonify({'token': token}), 200
    except Exception as e:
        logging.error("Error creating token: %s", str(e))
        return jsonify({'message': ERROR_INTERNAL_SERVER}), 500

@auth_bp.route('/api/auth/verify', methods=['POST'])
def verify_token():
    """Verify a JWT token and return user info."""
    try:
        data = request.get_json()
        token = data.get('token')
        
        if not token:
            return jsonify({'message': ERROR_TOKEN_MISSING}), 400
            
        current_user_id, error = get_user_from_token(token)
        if error:
            return jsonify({'message': error}), 401
            
        return jsonify({
            'valid': True,
            'user_id': current_user_id
        }), 200
        
    except Exception as e:
        logging.error("Error verifying token: %s", str(e))
        return jsonify({'message': ERROR_INTERNAL_SERVER}), 500

@auth_bp.route('/api/auth/session', methods=['GET'])
def get_session_info():
    """Get session info and create token if session exists."""
    try:
        user_info_result, error = get_current_user_info(lambda: get_db_connection(DB_PATH), DB_PATH)
        if not user_info_result or error:
            return jsonify({'message': 'Not authenticated', 'session': False}), 401
        
        username = user_info_result.get('username')
        user_data = get_user_by_username(DB_PATH, username)
        
        if not user_data or not user_data.get('private_key'):
            return jsonify({'message': ERROR_USER_NOT_FOUND}), 404
            
        # Create token for session user
        token = create_user_token(
            user_data['private_key'], 
            username,
            expires_hours=24
        )
        
        # Return user data and token
        response_data = {
            'session': True,
            'token': token,
            'user': user_info_result
        }
        
        return jsonify(response_data), 200
    except Exception as e:
        logging.error("Error getting session info: %s", str(e))
        return jsonify({'message': ERROR_INTERNAL_SERVER}), 500

@auth_bp.route('/api/auth/logout', methods=['POST'])
def logout():
    """Logout user and clear session."""
    try:
        session.clear()
        return jsonify({'message': 'Logged out successfully'}), 200
    except Exception as e:
        logging.error("Error during logout: %s", str(e))
        return jsonify({'error': 'Failed to logout'}), 500

@auth_bp.route('/api/auth/clear-session', methods=['POST'])
def clear_session():
    """Clear user session and cookies (for debugging)."""
    session.clear()
    response = jsonify({'message': 'Session cleared'})
    response.set_cookie('session', '', expires=0)
    return response, 200
