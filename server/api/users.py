"""
RESTful User Management API for FinTrack.
"""
from flask import Blueprint, request, jsonify, Response
from werkzeug.utils import secure_filename
import os
import logging
import json
import base64

from core.db_manager import get_user_by_username, update_user_field, get_user_db_connection
from core.token_auth import token_required, create_token_for_user, TokenError
from core.oauth import get_current_user_info

# Create Blueprint
users_bp = Blueprint('users', __name__)

# Error constants
ERROR_USER_NOT_FOUND = 'User not found'
ERROR_INTERNAL_SERVER = 'Internal server error'

@users_bp.route('/api/auth/token', methods=['POST'])
def create_auth_token():
    """Create JWT token for authenticated user (for mobile clients)."""
    try:
        user_info_result, error = get_current_user_info(lambda: get_user_db_connection())
        if not user_info_result or error:
            return jsonify({'message': 'Not authenticated'}), 401
        
        username = user_info_result.get('username')
        
        # Simple token generation to avoid circular import
        try:
            import jwt
            from datetime import datetime, timedelta
            
            user_data = get_user_by_username(username)
            
            if user_data and user_data.get('private_key'):
                # Create JWT token
                payload = {
                    'sub': username,
                    'iat': datetime.utcnow(),
                    'exp': datetime.utcnow() + timedelta(hours=24)
                }
                token = jwt.encode(payload, user_data['private_key'], algorithm='RS256')
                return jsonify({'token': token}), 200
            else:
                logging.error("No keypair found for user: %s", username)
                return jsonify({'message': 'User keypair not found'}), 500
        except Exception as e:
            logging.error("Error generating JWT token: %s", str(e))
            return jsonify({'message': 'Error generating token'}), 500
            
    except Exception as e:
        logging.error("Error creating token: %s", str(e))
        return jsonify({'message': ERROR_INTERNAL_SERVER}), 500

@users_bp.route('/api/auth/session', methods=['GET'])
def get_session_info():
    """Get session info and create token if session exists."""
    try:
        user_info_result, error = get_current_user_info(lambda: get_user_db_connection())
        if not user_info_result or error:
            return jsonify({'message': 'Not authenticated', 'session': False}), 401
        
        username = user_info_result.get('username')
        token, token_error = create_token_for_user(username)
        
        if token_error:
            return jsonify({'message': token_error}), 404 if token_error == ERROR_USER_NOT_FOUND else 500
        
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

@users_bp.route('/api/users/profile', methods=['GET'])
@token_required
def get_user_profile(current_user_id):
    """Get current user's profile."""
    try:
        user = get_user_by_username(current_user_id)
        if user:
            # Generate photo URL if user has photo BLOB
            photo_url = None
            if user['photo']:
                photo_url = f"https://fintrack-api.the-cube-lab.com/api/users/{current_user_id}/photo"
            
            user_data = {
                'id': user['id'],
                'username': user['username'],
                'name': user['name'],
                'email': user['email'],
                'photo': photo_url,
                'created_at': user['created_at'],
                'updated_at': user['updated_at'],
                'preferences': json.loads(user['preferences']) if user['preferences'] else {}
            }
            return jsonify(user_data), 200
        else:
            return jsonify({'message': ERROR_USER_NOT_FOUND}), 404
    except Exception as e:
        logging.error("Error fetching user profile: %s", str(e))
        return jsonify({'message': ERROR_INTERNAL_SERVER}), 500

@users_bp.route('/api/users/profile/timestamp', methods=['GET'])
@token_required
def get_user_profile_timestamp(current_user_id):
    """Get current user's profile timestamp for cache validation."""
    try:
        user = get_user_by_username(current_user_id)
        if user:
            return jsonify({
                'updated_at': user['updated_at'],
                'created_at': user['created_at']
            }), 200
        else:
            return jsonify({'message': ERROR_USER_NOT_FOUND}), 404
    except Exception as e:
        logging.error("Error fetching user profile timestamp: %s", str(e))
        return jsonify({'message': ERROR_INTERNAL_SERVER}), 500

@users_bp.route('/api/users/profile', methods=['PUT'])
@token_required  
def update_user_profile(current_user_id):
    """Update current user's profile."""
    try:
        data = request.get_json() if request.is_json else {}
        
        # Get existing user
        user = get_user_by_username(current_user_id)
        if not user:
            return jsonify({'message': ERROR_USER_NOT_FOUND}), 404
        
        # Parse existing preferences
        current_preferences = json.loads(user['preferences']) if user['preferences'] else {}
        
        # Build update query dynamically
        updates = []
        params = []
        
        if 'name' in data:
            updates.append("name = ?")
            params.append(data['name'])
        
        if 'preferences' in data:
            # Merge preferences instead of replacing completely
            new_preferences = current_preferences.copy()
            new_preferences.update(data['preferences'])
            updates.append("preferences = ?")
            params.append(json.dumps(new_preferences))
        
        if not updates:
            return jsonify({'message': 'No valid fields to update'}), 400
        
        # Add updated_at timestamp
        updates.append("updated_at = CURRENT_TIMESTAMP")
        
        # Add username for WHERE clause
        params.append(current_user_id)
        
        # Execute update
        conn = get_user_db_connection()
        cursor = conn.cursor()
        
        query = f"UPDATE users SET {', '.join(updates)} WHERE username = ?"
        cursor.execute(query, params)
        conn.commit()
        
        if cursor.rowcount == 0:
            conn.close()
            return jsonify({'message': 'No changes made'}), 400
        
        # Fetch updated user
        updated_user = get_user_by_username(current_user_id)
        conn.close()
        
        if updated_user:
            # Generate photo URL if user has photo BLOB
            photo_url = None
            if updated_user['photo']:
                photo_url = f"https://fintrack-api.the-cube-lab.com/api/users/{current_user_id}/photo"
            
            user_data = {
                'id': updated_user['id'],
                'username': updated_user['username'], 
                'name': updated_user['name'],
                'email': updated_user['email'],
                'photo': photo_url,
                'created_at': updated_user['created_at'],
                'preferences': json.loads(updated_user['preferences']) if updated_user['preferences'] else {}
            }
            return jsonify(user_data), 200
        else:
            return jsonify({'message': 'Error retrieving updated user'}), 500
            
    except json.JSONDecodeError:
        return jsonify({'message': 'Invalid JSON preferences'}), 400
    except Exception as e:
        logging.error("Error updating user profile: %s", str(e))
        return jsonify({'message': ERROR_INTERNAL_SERVER}), 500

@users_bp.route('/api/users/profile/photo', methods=['POST'])
@token_required
def upload_profile_photo(current_user_id):
    """Upload user profile photo - stores BLOB data directly in database."""
    try:
        photo_bytes = None
        
        # Check if this is JSON data (mobile) or form data (web)
        if request.is_json:
            # Mobile JSON upload with base64 data
            logging.info("Processing mobile JSON photo upload for user %s", current_user_id)
            data = request.get_json()
            if not data or 'photo' not in data:
                return jsonify({'message': 'No photo data provided'}), 400
            
            photo_base64 = data['photo']
            
            # Decode base64 data
            try:
                photo_bytes = base64.b64decode(photo_base64)
            except Exception:
                return jsonify({'message': 'Invalid photo data'}), 400
        else:
            # Web FormData upload
            logging.info("Processing web FormData photo upload for user %s", current_user_id)
            if 'photo' not in request.files:
                return jsonify({'message': 'No photo file provided'}), 400
            
            file = request.files['photo']
            if file.filename == '':
                return jsonify({'message': 'No file selected'}), 400
            
            if file and file.filename:
                # Read file data as bytes
                photo_bytes = file.read()
        
        if photo_bytes:
            # Store photo BLOB directly in database and update timestamp
            conn = get_user_db_connection()
            cursor = conn.cursor()
            cursor.execute("UPDATE users SET photo = ?, updated_at = CURRENT_TIMESTAMP WHERE username = ?", 
                         (photo_bytes, current_user_id))
            conn.commit()
            conn.close()
            
            logging.info("Photo BLOB stored successfully in database for user %s", current_user_id)
            return jsonify({'message': 'Photo uploaded successfully'}), 200
        else:
            return jsonify({'message': 'Failed to process photo'}), 400
            
    except Exception as e:
        logging.error("Error uploading photo: %s", str(e))
        return jsonify({'message': ERROR_INTERNAL_SERVER}), 500

@users_bp.route('/api/users/<username>/photo', methods=['GET'])
def get_user_photo(username):
    """Get user profile photo by username - serves BLOB data from database."""
    try:
        user = get_user_by_username(username)
        if not user or not user.get('photo'):
            return jsonify({'message': 'Photo not found'}), 404
        
        # user['photo'] now contains BLOB data
        photo_blob = user['photo']
        
        # Create response with appropriate content type
        response = Response(photo_blob, content_type='image/jpeg')
        response.headers['Cache-Control'] = 'no-cache, no-store, must-revalidate'
        response.headers['Pragma'] = 'no-cache'
        response.headers['Expires'] = '0'
        return response
    except Exception as e:
        logging.error("Error getting user photo: %s", str(e))
        return jsonify({'message': 'Internal server error'}), 500
