"""
Flask API for FinTrack user management and authentication.
Provides OAuth login, user management, RESTful API endpoints, and token-based authentication.
"""

from flask import Flask, request, jsonify, send_file, session
from flask_cors import CORS
from werkzeug.utils import secure_filename
import os
import json
import logging
import jwt
import datetime
import sqlite3
from functools import wraps

# Import our custom modules
from oauth import create_google_oauth_blueprint, setup_oauth_handlers, create_oauth_routes, get_current_user_info
from database import initialize_database, get_db_connection, get_user_by_username

# Configure logging
logging.basicConfig(level=logging.INFO)
os.environ["OAUTHLIB_INSECURE_TRANSPORT"] = "1"
os.environ["OAUTHLIB_RELAX_TOKEN_SCOPE"] = "1"

# JWT secret key - in production, use a more secure method
JWT_SECRET = os.environ.get('JWT_SECRET', 'your-super-secret-key-change-in-production')

def token_required(f):
    """Decorator to require JWT token or valid session for endpoints"""
    @wraps(f)
    def decorated(*args, **kwargs):
        token = None
        
        # Check for token in Authorization header
        if 'Authorization' in request.headers:
            auth_header = request.headers['Authorization']
            if auth_header.startswith('Bearer '):
                token = auth_header.split(" ")[1]
        
        # Check for token in session (web fallback)
        if not token and 'user' in session:
            # For web clients, we'll temporarily create a token
            try:
                user = get_current_user_info(get_db_connection)
                if user and len(user) > 0:
                    token = jwt.encode({
                        'user_id': user[1],  # username is at index 1
                        'exp': datetime.datetime.utcnow() + datetime.timedelta(hours=24)
                    }, JWT_SECRET, algorithm='HS256')
            except Exception as e:
                logging.warning("Could not create temporary token: %s", str(e))
        
        if not token:
            return jsonify({'message': 'Token is missing'}), 401
            
        try:
            data = jwt.decode(token, JWT_SECRET, algorithms=['HS256'])
            current_user_id = data['user_id']
        except jwt.ExpiredSignatureError:
            return jsonify({'message': 'Token has expired'}), 401
        except jwt.InvalidTokenError:
            return jsonify({'message': 'Token is invalid'}), 401
            
        return f(current_user_id, *args, **kwargs)
    return decorated

# Create Flask app
app = Flask(__name__)
app.secret_key = os.environ.get('SECRET_KEY', 'your-secret-key-change-in-production')

# CORS configuration for mobile and web
CORS(app, supports_credentials=True, origins=[
    'http://localhost:3000',
    'http://127.0.0.1:3000', 
    'http://localhost:8100',
    'http://127.0.0.1:8100',
    'http://127.0.0.1:5173',
    'capacitor://localhost',
    'http://localhost',
    'https://localhost',
    'ionic://localhost',
    'http://10.0.2.2:3001'  # Android emulator
], allow_headers=['Content-Type', 'Authorization', 'Accept', 'Origin', 'X-Requested-With'])

# Session configuration
app.config['SESSION_TYPE'] = 'filesystem'
app.config['SESSION_PERMANENT'] = False
app.config['SESSION_USE_SIGNER'] = True
app.config['SESSION_KEY_PREFIX'] = 'fintrack:'

# Create Google OAuth blueprint and setup handlers
google_blueprint = create_google_oauth_blueprint()
app.register_blueprint(google_blueprint, url_prefix='/auth')

# Setup OAuth handlers
setup_oauth_handlers(google_blueprint)

# Setup OAuth routes
create_oauth_routes(app, google_blueprint)

# Initialize database
initialize_database()

UPLOAD_FOLDER = os.path.join(os.path.dirname(__file__), 'uploads')
os.makedirs(UPLOAD_FOLDER, exist_ok=True)
app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER

# RESTful API Routes

@app.route('/api/auth/token', methods=['POST'])
def create_token():
    """Create JWT token for authenticated user (for mobile clients)"""
    try:
        user = get_current_user_info(get_db_connection)
        if not user or len(user) == 0:
            return jsonify({'message': 'Not authenticated'}), 401
            
        token = jwt.encode({
            'user_id': user[1],  # username is at index 1
            'exp': datetime.datetime.utcnow() + datetime.timedelta(hours=24)
        }, JWT_SECRET, algorithm='HS256')
        
        return jsonify({'token': token}), 200
    except Exception as e:
        logging.error("Error creating token: %s", str(e))
        return jsonify({'message': 'Internal server error'}), 500

@app.route('/api/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return jsonify({'status': 'healthy', 'timestamp': datetime.datetime.utcnow().isoformat()})

@app.route('/api/users/profile', methods=['GET'])
@token_required
def get_user_profile(current_user_id):
    """Get current user's profile"""
    try:
        user = get_user_by_username(current_user_id)
        if user:
            user_data = {
                'id': user[0],
                'username': user[1],
                'display_name': user[2],
                'email': user[3],
                'profile_picture': user[4],
                'created_at': user[5],
                'preferences': json.loads(user[6]) if user[6] else {}
            }
            return jsonify(user_data), 200
        else:
            return jsonify({'message': 'User not found'}), 404
    except Exception as e:
        logging.error("Error fetching user profile: %s", str(e))
        return jsonify({'message': 'Internal server error'}), 500

@app.route('/api/users/profile', methods=['PUT'])
@token_required  
def update_user_profile_put(current_user_id):
    """Update current user's profile"""
    try:
        data = request.get_json() if request.is_json else {}
        
        # Get existing user
        user = get_user_by_username(current_user_id)
        if not user:
            return jsonify({'message': 'User not found'}), 404
        
        # Parse existing preferences
        current_preferences = json.loads(user[6]) if user[6] else {}
        
        # Build update query dynamically
        updates = []
        params = []
        
        if 'display_name' in data:
            updates.append("display_name = ?")
            params.append(data['display_name'])
        
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
        conn = get_db_connection()
        cursor = conn.cursor()
        
        query = f"UPDATE users SET {', '.join(updates)} WHERE username = ?"
        cursor.execute(query, params)
        conn.commit()
        
        if cursor.rowcount == 0:
            conn.close()
            return jsonify({'message': 'No changes made'}), 400
        
        # Fetch updated user
        cursor.execute("SELECT * FROM users WHERE username = ?", (current_user_id,))
        updated_user = cursor.fetchone()
        conn.close()
        
        if updated_user:
            user_data = {
                'id': updated_user[0],
                'username': updated_user[1], 
                'display_name': updated_user[2],
                'email': updated_user[3],
                'profile_picture': updated_user[4],
                'created_at': updated_user[5],
                'preferences': json.loads(updated_user[6]) if updated_user[6] else {}
            }
            return jsonify(user_data), 200
        else:
            return jsonify({'message': 'Error retrieving updated user'}), 500
            
    except json.JSONDecodeError:
        return jsonify({'message': 'Invalid JSON preferences'}), 400
    except Exception as e:
        logging.error("Error updating user profile: %s", str(e))
        return jsonify({'message': 'Internal server error'}), 500

@app.route('/api/users/profile/photo', methods=['POST'])
@token_required
def upload_profile_photo(current_user_id):
    """Upload user profile photo"""
    try:
        if 'photo' not in request.files:
            return jsonify({'message': 'No photo file provided'}), 400
        
        file = request.files['photo']
        if file.filename == '':
            return jsonify({'message': 'No file selected'}), 400
        
        if file and file.filename:
            # Secure the filename and save
            filename = secure_filename(f"{current_user_id}_{file.filename}")
            filepath = os.path.join(app.config['UPLOAD_FOLDER'], filename)
            file.save(filepath)
            
            # Update user's profile picture in database
            conn = get_db_connection()
            cursor = conn.cursor()
            cursor.execute("UPDATE users SET profile_picture = ? WHERE username = ?", 
                         (filename, current_user_id))
            conn.commit()
            conn.close()
            
            return jsonify({'message': 'Photo uploaded successfully', 'filename': filename}), 200
            
    except Exception as e:
        logging.error("Error uploading photo: %s", str(e))
        return jsonify({'message': 'Internal server error'}), 500

@app.route('/api/users/profile/photo/<filename>', methods=['GET'])
def get_profile_photo(filename):
    """Get user profile photo"""
    try:
        filepath = os.path.join(app.config['UPLOAD_FOLDER'], filename)
        if os.path.exists(filepath):
            return send_file(filepath)
        else:
            return jsonify({'message': 'Photo not found'}), 404
    except Exception as e:
        logging.error("[API] Error getting user photo: %s", str(e))
        return jsonify({'message': 'Internal server error'}), 500

# Legacy endpoints for backward compatibility
@app.route('/update_user_profile', methods=['POST'])
@token_required
def legacy_update_profile(current_user_id):
    """Legacy endpoint - provides backward compatibility"""
    try:
        data = request.get_json() if request.is_json else {}
        
        # Get existing user
        user = get_user_by_username(current_user_id)
        if not user:
            return jsonify({'success': False, 'message': 'User not found'}), 404
        
        # Handle photo upload
        photo_filename = None
        if 'photo' in request.files:
            photo_file = request.files['photo']
            if photo_file and photo_file.filename != '':
                try:
                    filename = secure_filename(f"{current_user_id}_{photo_file.filename}")
                    photo_path = os.path.join(app.config['UPLOAD_FOLDER'], filename)
                    photo_file.save(photo_path)
                    photo_filename = filename
                    logging.info("Photo saved: %s", photo_path)
                except Exception as e:
                    logging.error("Error processing photo upload: %s", str(e))
                    return jsonify({'success': False, 'message': 'Error uploading photo'}), 500
        
        # Parse existing preferences
        current_preferences = json.loads(user[6]) if user[6] else {}
        
        # Build update query dynamically
        updates = []
        params = []
        
        if 'display_name' in data:
            updates.append("display_name = ?")
            params.append(data['display_name'])
        
        if photo_filename:
            updates.append("profile_picture = ?")
            params.append(photo_filename)
        
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
        conn = get_db_connection()
        cursor = conn.cursor()
        
        query = f"UPDATE users SET {', '.join(updates)} WHERE username = ?"
        cursor.execute(query, params)
        conn.commit()
        
        # Fetch updated user data
        cursor.execute("SELECT * FROM users WHERE username = ?", (current_user_id,))
        updated_user = cursor.fetchone()
        conn.close()
        
        if updated_user:
            user_data = {
                'id': updated_user[0],
                'username': updated_user[1], 
                'display_name': updated_user[2],
                'email': updated_user[3],
                'profile_picture': updated_user[4],
                'created_at': updated_user[5],
                'preferences': json.loads(updated_user[6]) if updated_user[6] else {}
            }
            return jsonify({'success': True, 'user': user_data})
        else:
            return jsonify({'success': False, 'message': 'Error retrieving updated user'}), 500
            
    except json.JSONDecodeError:
        return jsonify({'success': False, 'message': 'Invalid JSON in preferences'}), 400
    except Exception as e:
        logging.error("Error updating user profile: %s", str(e))
        return jsonify({'success': False, 'message': 'Internal server error'}), 500

@app.route('/get_user_info', methods=['GET'])
@token_required
def legacy_get_user_info(current_user_id):
    """Legacy endpoint - provides backward compatibility"""
    try:
        user = get_user_by_username(current_user_id)
        if user:
            user_data = {
                'id': user[0],
                'username': user[1],
                'display_name': user[2],
                'email': user[3],
                'profile_picture': user[4],
                'created_at': user[5],
                'preferences': json.loads(user[6]) if user[6] else {}
            }
            return jsonify({'success': True, 'user': user_data})
        else:
            return jsonify({'success': False, 'message': 'User not authenticated'}), 401
    except Exception as e:
        logging.error("Error getting user info: %s", str(e))
        return jsonify({'success': False, 'message': 'Internal server error'}), 500

@app.route('/get_user_photo/<filename>')
def legacy_get_photo(filename):
    """Legacy endpoint - redirects to RESTful endpoint"""
    return get_profile_photo(filename)

@app.route('/get_user_preferences', methods=['GET'])
@token_required
def legacy_get_user_preferences(current_user_id):
    """Legacy endpoint - provides backward compatibility"""
    try:
        user = get_user_by_username(current_user_id)
        if user:
            preferences = json.loads(user[6]) if user[6] else {}
            return jsonify({'success': True, 'preferences': preferences})
        else:
            return jsonify({'success': False, 'message': 'User not authenticated'}), 401
    except Exception as e:
        logging.error("Error getting user preferences: %s", str(e))
        return jsonify({'success': False, 'message': 'Internal server error'}), 500

# Legacy health endpoint
@app.route('/health', methods=['GET'])
def legacy_health_check():
    """Legacy health check endpoint"""
    return jsonify({'status': 'healthy'})

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 3001))
    debug = os.environ.get('DEBUG', 'True').lower() == 'true'
    app.run(host='0.0.0.0', port=port, debug=debug)
