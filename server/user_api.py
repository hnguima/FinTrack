"""
Flask API for FinTrack user management and authentication.
Provides OAuth login, user management, RESTful API endpoints, and user-based token authentication.
"""

from flask import Flask, request, jsonify, send_file, session, Response
from flask_cors import CORS
from werkzeug.utils import secure_filename
from werkzeug.middleware.proxy_fix import ProxyFix
from flask_session import Session
import os
import json
import logging
import sqlite3
from functools import wraps

# Import our custom modules
from oauth import create_google_oauth_blueprint, setup_oauth_handlers, create_oauth_routes, get_current_user_info
from database import initialize_database, get_db_connection, get_user_by_username, get_user_keypair
from crypto_utils import create_user_token, verify_user_token, KeypairError

# Configure logging
logging.basicConfig(level=logging.INFO)
os.environ["OAUTHLIB_INSECURE_TRANSPORT"] = "1"
os.environ["OAUTHLIB_RELAX_TOKEN_SCOPE"] = "1"

# Database path
DB_PATH = os.environ.get('DB_PATH', 'db/user.db')

# Constants for error messages
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

def token_required(f):
    """Decorator to require user-specific JWT token or valid session for endpoints"""
    @wraps(f)
    def decorated(*args, **kwargs):
        token = None
        
        # Check for token in Authorization header
        if 'Authorization' in request.headers:
            auth_header = request.headers['Authorization']
            if auth_header.startswith('Bearer '):
                token = auth_header.split(" ")[1]
                logging.info("[AUTH] Found Bearer token in request")
        
        if not token:
            logging.info("[AUTH] No Bearer token found, trying session-based auth")
            # Check for session-based authentication (web fallback)
            try:
                user_info_result, error = get_current_user_info(lambda: get_db_connection(DB_PATH), DB_PATH)
                if user_info_result and not error:
                    # Create temporary token for session-based user
                    username = user_info_result.get('username')
                    user_data = get_user_by_username(DB_PATH, username)
                    if user_data and user_data['private_key']:
                        token = create_user_token(
                            user_data['private_key'], 
                            user_data['username'],
                            expires_hours=1  # Short-lived for session fallback
                        )
                        logging.info(f"[AUTH] Created temporary token for session user: {username}")
                else:
                    logging.info(f"[AUTH] Session-based auth failed: {error}")
            except Exception as e:
                logging.warning(f"Could not create session-based token: {e}")
        
        if not token:
            logging.error("[AUTH] No token found - returning 401")
            return jsonify({'message': ERROR_TOKEN_MISSING}), 401
            
        current_user_id, error = get_user_from_token(token)
        if error:
            logging.error(f"[AUTH] Token validation failed: {error}")
            return jsonify({'message': error}), 401
            
        logging.info(f"[AUTH] Authentication successful for user: {current_user_id}")
        return f(current_user_id, *args, **kwargs)
    return decorated

# Create Flask app
app = Flask(__name__)
app.secret_key = os.environ.get('SECRET_KEY', 'your-secret-key-change-in-production')

# CORS configuration for mobile and web - restored from backup
CORS(app, origins=[
    "http://127.0.0.1:5173", 
    "https://fintrack-api.the-cube-lab.com", 
    "capacitor://localhost", 
    "http://localhost",
    "https://localhost",
    "ionic://localhost",
    "http://localhost:*",
    "https://localhost:*",
    'http://localhost:3000',
    'http://127.0.0.1:3000', 
    'http://localhost:8100',
    'http://127.0.0.1:8100',
    'http://127.0.0.1:5173',
    'http://10.0.2.2:3001'  # Android emulator
], supports_credentials=True, allow_headers=['Content-Type', 'Authorization', 'Accept', 'Origin', 'X-Requested-With'])

# Session configuration - restored from backup
app.config['SESSION_COOKIE_SECURE'] = True
app.config['SESSION_COOKIE_SAMESITE'] = 'None'
app.config['SESSION_COOKIE_PATH'] = '/'
app.config['SESSION_TYPE'] = 'filesystem'
app.config['SESSION_FILE_DIR'] = os.path.join(os.path.dirname(__file__), 'flask_session')
app.config['SESSION_PERMANENT'] = False

# Initialize extensions
Session(app)
app.wsgi_app = ProxyFix(app.wsgi_app, x_for=1, x_proto=1, x_host=1, x_port=1)

# Create Google OAuth blueprint and setup handlers
google_blueprint = create_google_oauth_blueprint(
    client_id=os.environ.get('GOOGLE_CLIENT_ID'),
    client_secret=os.environ.get('GOOGLE_CLIENT_SECRET')
)
app.register_blueprint(google_blueprint, url_prefix='/auth')

# Setup OAuth handlers
setup_oauth_handlers(google_blueprint, lambda: get_db_connection(DB_PATH), DB_PATH)

# Setup OAuth routes
create_oauth_routes(app, google_blueprint)

# Initialize database
initialize_database(DB_PATH)

UPLOAD_FOLDER = os.path.join(os.path.dirname(__file__), 'uploads')
os.makedirs(UPLOAD_FOLDER, exist_ok=True)
app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER

# RESTful API Routes

@app.route('/api/auth/token', methods=['POST'])
def create_token():
    """Create JWT token for authenticated user (for mobile clients)"""
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

@app.route('/api/auth/session', methods=['GET'])
def get_session_info():
    """Get session info and create token if session exists"""
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

@app.route('/api/auth/clear-session', methods=['POST'])
def clear_session():
    """Clear user session and cookies (for debugging invalid tokens)"""
    session.clear()
    response = jsonify({'message': 'Session cleared'})
    response.set_cookie('session', '', expires=0)
    return response, 200

@app.route('/api/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    import datetime
    return jsonify({'status': 'healthy', 'timestamp': datetime.datetime.now(datetime.timezone.utc).isoformat()})

@app.route('/api/users/profile', methods=['GET'])
@token_required
def get_user_profile(current_user_id):
    """Get current user's profile"""
    try:
        user = get_user_by_username(DB_PATH, current_user_id)
        if user:
            # Generate photo URL if user has photo BLOB - add timestamp for cache busting
            photo_url = None
            if user['photo']:
                import time
                timestamp = int(time.time())
                photo_url = f"https://fintrack-api.the-cube-lab.com/api/users/{current_user_id}/photo?t={timestamp}"
            
            user_data = {
                'id': user['id'],
                'username': user['username'],
                'name': user['name'],  # Use 'name' to match frontend expectations
                'email': user['email'],
                'photo': photo_url,   # Use 'photo' to match frontend expectations  
                'created_at': user['created_at'],
                'preferences': json.loads(user['preferences']) if user['preferences'] else {}
            }
            return jsonify(user_data), 200
        else:
            return jsonify({'message': ERROR_USER_NOT_FOUND}), 404
    except Exception as e:
        logging.error("Error fetching user profile: %s", str(e))
        return jsonify({'message': ERROR_INTERNAL_SERVER}), 500

@app.route('/api/users/profile', methods=['PUT'])
@token_required  
def update_user_profile_put(current_user_id):
    """Update current user's profile"""
    try:
        data = request.get_json() if request.is_json else {}
        
        # Get existing user
        user = get_user_by_username(DB_PATH, current_user_id)
        if not user:
            return jsonify({'message': ERROR_USER_NOT_FOUND}), 404
        
        # Parse existing preferences
        current_preferences = json.loads(user['preferences']) if user['preferences'] else {}
        
        # Build update query dynamically - handle both 'name' and 'display_name' for backwards compatibility
        updates = []
        params = []
        
        if 'name' in data or 'display_name' in data:
            updates.append("name = ?")
            params.append(data.get('name', data.get('display_name')))
        
        if 'preferences' in data:
            # Merge preferences instead of replacing completely
            new_preferences = current_preferences.copy()
            new_preferences.update(data['preferences'])
            updates.append("preferences = ?")
            params.append(json.dumps(new_preferences))
        
        if not updates:
            return jsonify({'message': 'No valid fields to update'}), 400
        
        # Add username for WHERE clause
        params.append(current_user_id)
        
        # Execute update
        conn = get_db_connection(DB_PATH)
        cursor = conn.cursor()
        
        query = f"UPDATE users SET {', '.join(updates)} WHERE username = ?"
        cursor.execute(query, params)
        conn.commit()
        
        if cursor.rowcount == 0:
            conn.close()
            return jsonify({'message': 'No changes made'}), 400
        
        # Fetch updated user
        updated_user = get_user_by_username(DB_PATH, current_user_id)
        conn.close()
        
        if updated_user:
            # Generate photo URL if user has photo BLOB - add timestamp for cache busting
            photo_url = None
            if updated_user['photo']:
                import time
                timestamp = int(time.time())
                photo_url = f"https://fintrack-api.the-cube-lab.com/api/users/{current_user_id}/photo?t={timestamp}"
            
            user_data = {
                'id': updated_user['id'],
                'username': updated_user['username'], 
                'name': updated_user['name'],  # Use 'name' to match frontend expectations
                'email': updated_user['email'],
                'photo': photo_url,           # Use 'photo' to match frontend expectations
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

@app.route('/api/users/profile/photo', methods=['POST'])
@token_required
def upload_profile_photo(current_user_id):
    """Upload user profile photo - stores BLOB data directly in database"""
    try:
        photo_bytes = None
        
        # Check if this is JSON data (mobile) or form data (web)
        if request.is_json:
            # Mobile JSON upload with base64 data
            logging.info(f"[PHOTO] Processing mobile JSON photo upload for user {current_user_id}")
            data = request.get_json()
            if not data or 'photo' not in data:
                return jsonify({'message': 'No photo data provided'}), 400
            
            import base64
            photo_base64 = data['photo']
            
            # Decode base64 data
            try:
                photo_bytes = base64.b64decode(photo_base64)
            except Exception:
                return jsonify({'message': 'Invalid photo data'}), 400
        else:
            # Web FormData upload
            logging.info(f"[PHOTO] Processing web FormData photo upload for user {current_user_id}")
            if 'photo' not in request.files:
                return jsonify({'message': 'No photo file provided'}), 400
            
            file = request.files['photo']
            if file.filename == '':
                return jsonify({'message': 'No file selected'}), 400
            
            if file and file.filename:
                # Read file data as bytes
                photo_bytes = file.read()
        
        if photo_bytes:
            # Store photo BLOB directly in database
            conn = get_db_connection(DB_PATH)
            cursor = conn.cursor()
            cursor.execute("UPDATE users SET photo = ? WHERE username = ?", 
                         (photo_bytes, current_user_id))
            conn.commit()
            conn.close()
            
            logging.info(f"[PHOTO] Photo BLOB stored successfully in database for user {current_user_id}")
            return jsonify({'message': 'Photo uploaded successfully'}), 200
        else:
            return jsonify({'message': 'Failed to process photo'}), 400
            
    except Exception as e:
        logging.error("Error uploading photo: %s", str(e))
        return jsonify({'message': ERROR_INTERNAL_SERVER}), 500

@app.route('/api/users/profile/photo/<filename>', methods=['GET'])
def get_profile_photo(filename):
    """Legacy file-based photo endpoint - now returns 404 since we use BLOB storage"""
    return jsonify({'message': 'File-based photos no longer supported. Use /api/users/{username}/photo instead.'}), 404

@app.route('/api/users/<username>/photo', methods=['GET'])
def get_user_photo_by_username(username):
    """Get user profile photo by username - serves BLOB data from database"""
    try:
        user = get_user_by_username(DB_PATH, username)
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
        logging.error("[API] Error getting user photo by username: %s", str(e))
        return jsonify({'message': 'Internal server error'}), 500

# Legacy endpoints for backward compatibility
@app.route('/update_user_profile', methods=['POST'])
@token_required
def legacy_update_profile(current_user_id):
    """Legacy endpoint - provides backward compatibility"""
    try:
        data = request.get_json() if request.is_json else {}
        
        # Get existing user
        user = get_user_by_username(DB_PATH, current_user_id)
        if not user:
            return jsonify({'success': False, 'message': ERROR_USER_NOT_FOUND}), 404
        
        # Handle photo upload
        photo_bytes = None
        if 'photo' in request.files:
            photo_file = request.files['photo']
            if photo_file and photo_file.filename != '':
                try:
                    photo_bytes = photo_file.read()
                    logging.info("Photo read as BLOB data")
                except Exception as e:
                    logging.error("Error processing photo upload: %s", str(e))
                    return jsonify({'success': False, 'message': 'Error uploading photo'}), 500
        
        # Parse existing preferences
        current_preferences = json.loads(user['preferences']) if user['preferences'] else {}
        
        # Build update query dynamically
        updates = []
        params = []
        
        if 'display_name' in data:
            updates.append("name = ?")
            params.append(data['display_name'])
        
        if photo_bytes:
            updates.append("photo = ?")
            params.append(photo_bytes)
        
        if 'preferences' in data:
            # Merge preferences instead of replacing completely
            new_preferences = current_preferences.copy()
            new_preferences.update(data['preferences'])
            updates.append("preferences = ?")
            params.append(json.dumps(new_preferences))
        
        if not updates:
            return jsonify({'success': True, 'message': 'No changes to update'})
        
        # Add username for WHERE clause
        params.append(current_user_id)
        
        # Execute update
        conn = get_db_connection(DB_PATH)
        cursor = conn.cursor()
        
        query = f"UPDATE users SET {', '.join(updates)} WHERE username = ?"
        cursor.execute(query, params)
        conn.commit()
        conn.close()
        
        # Fetch updated user data
        updated_user = get_user_by_username(DB_PATH, current_user_id)
        
        if updated_user:
            # Generate photo URL if user has photo BLOB
            photo_url = None
            if updated_user['photo']:
                photo_url = f"https://fintrack-api.the-cube-lab.com/api/users/{current_user_id}/photo"
            
            user_data = {
                'id': updated_user['id'],
                'username': updated_user['username'], 
                'name': updated_user['name'],    # Use 'name' for consistency
                'email': updated_user['email'],
                'photo': photo_url,             # Use 'photo' for consistency
                'created_at': updated_user['created_at'],
                'preferences': json.loads(updated_user['preferences']) if updated_user['preferences'] else {}
            }
            return jsonify({'success': True, 'user': user_data})
        else:
            return jsonify({'success': False, 'message': 'Error retrieving updated user'}), 500
            
    except json.JSONDecodeError:
        return jsonify({'success': False, 'message': 'Invalid JSON in preferences'}), 400
    except Exception as e:
        logging.error("Error updating user profile: %s", str(e))
        return jsonify({'success': False, 'message': ERROR_INTERNAL_SERVER}), 500

@app.route('/get_user_info', methods=['GET'])
@token_required
def legacy_get_user_info(current_user_id):
    """Legacy endpoint - provides backward compatibility"""
    try:
        user = get_user_by_username(DB_PATH, current_user_id)
        if user:
            # Generate photo URL if user has photo BLOB
            photo_url = None
            if user['photo']:
                photo_url = f"https://fintrack-api.the-cube-lab.com/api/users/{current_user_id}/photo"
            
            user_data = {
                'id': user['id'],
                'username': user['username'],
                'name': user['name'],      # Use 'name' for consistency
                'email': user['email'],
                'photo': photo_url,       # Use 'photo' for consistency
                'created_at': user['created_at'],
                'preferences': json.loads(user['preferences']) if user['preferences'] else {}
            }
            return jsonify({'success': True, 'user': user_data})
        else:
            return jsonify({'success': False, 'message': 'User not authenticated'}), 401
    except Exception as e:
        logging.error("Error getting user info: %s", str(e))
        return jsonify({'success': False, 'message': ERROR_INTERNAL_SERVER}), 500

@app.route('/get_user_photo/<filename>')
def legacy_get_photo(filename):
    """Legacy endpoint - redirects to RESTful endpoint"""
    return get_profile_photo(filename)

@app.route('/get_user_preferences', methods=['GET'])
@token_required
def legacy_get_user_preferences(current_user_id):
    """Legacy endpoint - provides backward compatibility"""
    try:
        user = get_user_by_username(DB_PATH, current_user_id)
        if user:
            preferences = json.loads(user['preferences']) if user['preferences'] else {}
            return jsonify({'success': True, 'preferences': preferences})
        else:
            return jsonify({'success': False, 'message': 'User not authenticated'}), 401
    except Exception as e:
        logging.error("Error getting user preferences: %s", str(e))
        return jsonify({'success': False, 'message': ERROR_INTERNAL_SERVER}), 500

# Legacy health endpoint
@app.route('/health', methods=['GET'])
def legacy_health_check():
    """Legacy health check endpoint"""
    return jsonify({'status': 'healthy'})

if __name__ == '__main__':
    # Run with HTTPS using self-signed certs for development
    cert_path = os.path.join(os.path.dirname(__file__), 'certs', 'cert.pem')
    key_path = os.path.join(os.path.dirname(__file__), 'certs', 'key.pem')
    print('Cert exists:', os.path.exists(cert_path), cert_path)
    print('Key exists:', os.path.exists(key_path), key_path)
    try:
        app.run(host="0.0.0.0", debug=True, ssl_context=(cert_path, key_path))
    except Exception as e:
        print('SSL error:', e)
        app.run(host="0.0.0.0", debug=True)