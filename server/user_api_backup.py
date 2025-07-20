"""
Flask API for FinTrack user management and authentication.
Provides OAuth login, user management, and session handling.
"""

from flask_cors import CORS
from flask import Flask, request, jsonify, Response
import os
import json
import logging
import jwt
import datetime
from flask import Flask, request, jsonify, send_file, session
from flask_cors import CORS
from werkzeug.utils import secure_filename
from werkzeug.middleware.proxy_fix import ProxyFix
from flask_session import Session
import sqlite3
from functools import wraps

# Import our custom modules
from oauth import create_google_oauth_blueprint, setup_oauth_handlers, create_oauth_routes, get_current_user_info
from database import initialize_database, get_db_connection, get_user_by_username

# JWT secret key - in production, use a more secure method
JWT_SECRET = os.environ.get('JWT_SECRET', 'your-super-secret-key-change-in-production')

def token_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        token = None
        
        # Check for token in Authorization header
        if 'Authorization' in request.headers:
            token = request.headers['Authorization'].split(" ")[1]  # Bearer <token>
        
        # Check for token in session (web fallback)
        if not token and 'user' in session:
            # For web clients, we'll temporarily create a token
            user = get_current_user_info()
            if user:
                token = jwt.encode({
                    'user_id': user.get('username', ''),
                    'exp': datetime.datetime.utcnow() + datetime.timedelta(hours=24)
                }, JWT_SECRET, algorithm='HS256')
        
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

# Configure logging
logging.basicConfig(level=logging.DEBUG)
os.environ["OAUTHLIB_INSECURE_TRANSPORT"] = "1"
os.environ["OAUTHLIB_RELAX_TOKEN_SCOPE"] = "1"
os.environ["OAUTHLIB_OAUTH2_DEBUG"] = "1"

# Initialize Flask app
app = Flask(__name__)


# Enable CORS for local frontend development and mobile apps
CORS(app, origins=[
    "http://127.0.0.1:5173", 
    "https://fintrack-api.the-cube-lab.com", 
    "capacitor://localhost", 
    "http://localhost",
    "https://localhost",
    "ionic://localhost",
    "http://localhost:*",
    "https://localhost:*"
], supports_credentials=True, allow_headers=['Content-Type', 'Authorization', 'Accept', 'Origin', 'X-Requested-With'])

# Configuration
app.secret_key = os.environ.get("FLASK_SECRET_KEY") or "dev-secret-key-change-in-production"
app.config['SESSION_COOKIE_SECURE'] = True
app.config['SESSION_COOKIE_SAMESITE'] = 'None'
app.config['SESSION_COOKIE_PATH'] = '/'
app.config['SESSION_TYPE'] = 'filesystem'
app.config['SESSION_FILE_DIR'] = os.path.join(os.path.dirname(__file__), 'flask_session')
app.config['SESSION_PERMANENT'] = False

# Initialize extensions
Session(app)
app.wsgi_app = ProxyFix(app.wsgi_app, x_for=1, x_proto=1, x_host=1, x_port=1)

# Database setup
DB_PATH = os.path.join(os.path.dirname(__file__), 'db', 'user.db')
initialize_database(DB_PATH)

# OAuth setup
GOOGLE_CLIENT_ID = os.environ.get("GOOGLE_CLIENT_ID", "your-google-client-id")
GOOGLE_CLIENT_SECRET = os.environ.get("GOOGLE_CLIENT_SECRET", "your-google-client-secret")

google_bp = create_google_oauth_blueprint(GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET)
app.register_blueprint(google_bp, url_prefix="/login")  # Register but don't use the callback

# Set up OAuth handlers
def get_db_connection_wrapper():
    return get_db_connection(DB_PATH)

# Store DB_PATH in app config for OAuth routes
app.config['DB_PATH'] = DB_PATH

setup_oauth_handlers(google_bp, get_db_connection_wrapper)
create_oauth_routes(app, google_bp)


# API Routes
@app.route("/api/health")
def health_check():
    """Simple health check endpoint for testing connectivity."""
    return jsonify({
        "status": "healthy",
        "message": "FinTrack API is running",
        "timestamp": str(os.times()),
        "cors_headers": dict(request.headers)
    }), 200


@app.route("/api/user/profile", methods=["PUT"])
def update_user_profile():
    """Update user profile data (name, preferences, photo)."""
    user_info, error = get_current_user_info(get_db_connection_wrapper)
    if error:
        return jsonify({"error": error}), 401 if "Not authenticated" in error else 400
    
    try:
        data = request.get_json()
        username = user_info["username"]
        
        update_fields = []
        update_values = []
        
        # Update name if provided
        if 'name' in data:
            update_fields.append('name = ?')
            update_values.append(data['name'])
        
        # Update preferences if provided
        if 'preferences' in data:
            preferences_json = json.dumps(data['preferences'])
            update_fields.append('preferences = ?')
            update_values.append(preferences_json)
        
        # Handle photo upload (base64 encoded)
        if 'photo' in data and data['photo']:
            import base64
            try:
                # Assume photo is base64 encoded
                photo_data = data['photo']
                if photo_data.startswith('data:image'):
                    # Remove data URL prefix
                    photo_data = photo_data.split(',')[1]
                photo_bytes = base64.b64decode(photo_data)
                update_fields.append('photo = ?')
                update_values.append(photo_bytes)
            except Exception as e:
                logging.error(f"Error processing photo upload: {e}")
                return jsonify({"error": "Invalid photo data"}), 400
        
        if update_fields:
            update_values.append(username)  # for WHERE clause
            with get_db_connection(DB_PATH) as conn:
                conn.execute(
                    f'UPDATE users SET {", ".join(update_fields)} WHERE username = ?',
                    update_values
                )
                conn.commit()
            
            # Return updated user info
            updated_user_info, error = get_current_user_info(get_db_connection_wrapper)
            if error:
                return jsonify({"error": error}), 500
            
            return jsonify({"message": "Profile updated successfully", "user": updated_user_info}), 200
        else:
            return jsonify({"message": "No updates provided"}), 400
            
    except Exception as e:
        logging.error(f"Error updating user profile: {e}")
        return jsonify({"error": "Failed to update profile"}), 500


@app.route("/api/me")
def api_get_current_user():
    """Get current authenticated user information."""
    user_info, error = get_current_user_info(get_db_connection_wrapper)
    if error:
        return jsonify({"error": error}), 401 if "Not authenticated" in error else 400
    
    return jsonify({
        "message": "User authenticated", 
        "user": user_info
    })


@app.route('/api/users/<username>', methods=['GET'])
def api_get_user(username):
    """Get user by username."""
    user = get_user_by_username(DB_PATH, username)
    if user:
        return jsonify(user), 200
    else:
        return jsonify({'error': 'User not found'}), 404


@app.route("/api/user/photo/<username>", methods=["GET"])
def get_user_photo(username):
    """Get user photo by username."""
    try:
        with get_db_connection(DB_PATH) as conn:
            user = conn.execute(
                'SELECT photo FROM users WHERE username = ?', (username,)
            ).fetchone()
            
            if user and user['photo']:
                return Response(user['photo'], mimetype='image/jpeg')
            else:
                return jsonify({"error": "Photo not found"}), 404
    except Exception as e:
        logging.error(f"[API] Error getting user photo: {e}")
        return jsonify({"error": "Failed to get user photo"}), 500


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
