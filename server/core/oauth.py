"""
Google OAuth authentication module for Flask application.
Handles OAuth login, user creation, and session management.
"""

import base64
import json
import logging
import os
import sqlite3
import urllib.parse
from secrets import token_urlsafe

import requests
from flask import session, request, jsonify
from flask_dance.contrib.google import make_google_blueprint, google
from flask_dance.consumer.storage.session import SessionStorage
from flask_dance.consumer import oauth_authorized
from requests_oauthlib import OAuth2Session

# Import our custom modules
from core.db_manager import get_db_connection, create_user

# Default database path (for backward compatibility)

def create_google_oauth_blueprint(client_id, client_secret):
    """Create and configure Google OAuth blueprint."""
    google_bp = make_google_blueprint(
        client_id=client_id,
        client_secret=client_secret,
        scope=["profile", "email"],
        storage=SessionStorage(key="google_oauth_token"),
        redirect_url="/api/auth/callback"  # Match the Google Console configuration
    )
    return google_bp


def setup_oauth_handlers(google_bp, get_db_connection_func):
    """Set up OAuth signal handlers."""
    
    @oauth_authorized.connect_via(google_bp)
    def google_logged_in(blueprint, token):
        """Handle successful OAuth authentication."""
        if not token:
            logging.error("[OAUTH] Failed to log in with Google")
            return False

        try:
            # Fetch user info from Google
            resp = blueprint.session.get("/oauth2/v2/userinfo")
            if not resp.ok:
                logging.error(f"[OAUTH] Failed to fetch user info: {resp.status_code} {resp.text}")
                return False
                
            info = resp.json()
            username = info.get("email")
            email = info.get("email")
            provider = "google"
            name = info.get("name")
            photo_url = info.get("picture")
            photo_bytes = None
            if photo_url:
                try:
                    resp_img = requests.get(photo_url, timeout=10)
                    if resp_img.ok:
                        photo_bytes = resp_img.content
                        logging.debug(f"[OAUTH] Downloaded photo for {username}, {len(photo_bytes)} bytes")
                    else:
                        logging.warning(f"[OAUTH] Failed to download photo for {username}: {resp_img.status_code}")
                except Exception as e:
                    logging.warning(f"[OAUTH] Exception downloading photo: {e}")

            # Save or update user in DB - don't overwrite existing user data
            with get_db_connection_func() as conn:
                user = conn.execute(
                    'SELECT * FROM users WHERE username = ?', (username,)
                ).fetchone()
                if not user:
                    # Create new user with keypair generation and default preferences
                    default_preferences = json.dumps({
                        "theme": "light",
                        "language": "en"
                    })
                    
                    # Use the database create_user function that generates keypairs
                    create_user(
                        username,
                        password=None,
                        email=email,
                        provider=provider,
                        name=name,
                        db_path=db_path
                    )
                    
                    # Update the newly created user with photo and preferences
                    conn.execute(
                        'UPDATE users SET photo = ?, preferences = ? WHERE username = ?',
                        (photo_bytes, default_preferences, username)
                    )
                    conn.commit()
                    logging.debug(f"[OAUTH] Created new user: {username}")
                else:
                    # For existing users, only update if fields are empty or provider info changed
                    # Don't overwrite existing data, only fill in missing data
                    update_fields = []
                    update_values = []
                    
                    if not user['email']:
                        update_fields.append('email = ?')
                        update_values.append(email)
                    if not user['name']:
                        update_fields.append('name = ?')
                        update_values.append(name)
                    if not user['photo'] and photo_bytes:
                        update_fields.append('photo = ?')
                        update_values.append(photo_bytes)
                    if not user.get('preferences'):
                        # Add default preferences if none exist
                        default_preferences = json.dumps({
                            "theme": "light",
                            "language": "en"
                        })
                        update_fields.append('preferences = ?')
                        update_values.append(default_preferences)
                    # Always update provider to reflect the login method used
                    update_fields.append('provider = ?')
                    update_values.append(provider)
                    
                    if update_fields:
                        update_values.append(username)  # for WHERE clause
                        conn.execute(
                            f'UPDATE users SET {", ".join(update_fields)} WHERE username = ?',
                            update_values
                        )
                        conn.commit()
                        logging.debug(f"[OAUTH] Updated user {username} fields: {update_fields}")
                    else:
                        logging.debug(f"[OAUTH] No updates needed for existing user: {username}")
            
            logging.debug(f"[OAUTH] Successfully processed OAuth login for {username}")
            return True
            
        except Exception as e:
            logging.error(f"[OAUTH] Error in OAuth signal handler: {e}")
            return False


def create_oauth_routes(app, google_bp):
    """Create OAuth-related routes."""
    
    @app.route("/api/auth/logout", methods=["POST"])
    def logout():
        """Logout user."""
        try:
            session.clear()
            return jsonify({"success": True}), 200
        except Exception as e:
            logging.error(f"[API] Error during logout: {e}")
            return jsonify({"error": "Failed to logout"}), 500

    @app.route("/api/auth/clear-session", methods=["POST"])
    def clear_session():
        """Clear user session and cookies (for debugging)."""
        try:
            session.clear()
            response = jsonify({'message': 'Session cleared'})
            response.set_cookie('session', '', expires=0)
            return response, 200
        except Exception as e:
            logging.error(f"[API] Error clearing session: {e}")
            return jsonify({"error": "Failed to clear session"}), 500

    @app.route("/api/auth/google/url", methods=["GET"])
    def get_google_oauth_url():
        """Get the Google OAuth URL for frontend to redirect to."""
        try:
            # Log request details for debugging
            target_redirect = request.args.get('target_redirect', 'web')
            logging.debug(f"[OAUTH] Request headers: {dict(request.headers)}")
            logging.debug(f"[OAUTH] Request args: {dict(request.args)}")
            logging.debug(f"[OAUTH] Session before processing: {dict(session)}")
            logging.debug(f"[OAUTH] Target redirect: {target_redirect}")
            logging.debug(f"[OAUTH] Request remote address: {request.remote_addr}")
            logging.debug(f"[OAUTH] Request user agent: {request.headers.get('User-Agent', 'Unknown')}")
            
            # Clear any existing OAuth state
            session.pop('google_oauth_state', None)

            # Get the target redirect URL (where to send user after auth)
            web_redirect_url = request.args.get('web_redirect_url', 'http://127.0.0.1:5173')
            
            session['target_redirect'] = target_redirect
            session['web_redirect_url'] = web_redirect_url

            # Create OAuth URL manually with all required parameters
            # Generate a state parameter for security that includes the target platform
            state_data = {
                'random': token_urlsafe(24),
                'target_redirect': target_redirect,
                'web_redirect_url': web_redirect_url
            }
            state = base64.urlsafe_b64encode(json.dumps(state_data).encode()).decode()
            session['oauth_state'] = state
            
            logging.debug(f"[OAUTH] Generated and stored state: {state}")
            logging.debug(f"[OAUTH] State data: {state_data}")
            logging.debug(f"[OAUTH] Session after storing state: {dict(session)}")
            
            # Build OAuth URL with all required parameters
            oauth_params = {
                'client_id': google_bp.client_id,
                'response_type': 'code',
                'scope': 'openid profile email',
                'redirect_uri': 'https://fintrack-api.the-cube-lab.com/api/auth/callback',
                'state': state,
                'access_type': 'offline',
                'prompt': 'consent'
            }
            
            authorization_url = 'https://accounts.google.com/o/oauth2/v2/auth?' + urllib.parse.urlencode(oauth_params)
            
            return jsonify({
                "auth_url": authorization_url,
                "state": state
            }), 200
        except Exception as e:
            logging.error(f"[OAUTH] Error generating OAuth URL: {e}")
            return jsonify({"error": "Failed to generate OAuth URL"}), 500

    @app.route("/api/auth/callback")
    def auth_callback():
        """Handle OAuth callback and redirect based on target."""
        try:
            # Log all request details for debugging
            logging.debug(f"[OAUTH] Callback request URL: {request.url}")
            logging.debug(f"[OAUTH] Callback request args: {dict(request.args)}")
            logging.debug(f"[OAUTH] Callback session before processing: {dict(session)}")
            
            # Get the authorization code from the callback
            code = request.args.get('code')
            state = request.args.get('state')
            error = request.args.get('error')
            
            # Check for OAuth errors first
            if error:
                logging.error(f"[OAUTH] OAuth error received: {error}")
                error_description = request.args.get('error_description', 'Unknown OAuth error')
                return f'''<html><head><title>OAuth Error</title></head><body>
                <p>Authentication failed: {error_description}</p>
                <script>
                    setTimeout(function() {{
                        window.location.href = "http://127.0.0.1:5173?error=oauth_{error}";
                    }}, 2000);
                </script>
                </body></html>'''
            
            if not code:
                logging.error("[OAUTH] No authorization code received in callback")
                raise ValueError("No authorization code received")
            
            # Verify state parameter for security - with debugging
            stored_state = session.get('oauth_state')
            logging.debug(f"[OAUTH] Received state: {state}")
            logging.debug(f"[OAUTH] Stored state: {stored_state}")
            logging.debug(f"[OAUTH] Session contents: {dict(session)}")
            
            # Decode state to get target platform info
            target_redirect = 'web'  # default
            web_redirect_url = 'http://127.0.0.1:5173'  # default
            
            try:
                if state:
                    state_data = json.loads(base64.urlsafe_b64decode(state.encode()).decode())
                    target_redirect = state_data.get('target_redirect', 'web')
                    web_redirect_url = state_data.get('web_redirect_url', 'http://127.0.0.1:5173')
                    logging.debug(f"[OAUTH] Decoded state data: {state_data}")
            except Exception as decode_error:
                logging.warning(f"[OAUTH] Failed to decode state parameter: {decode_error}")
            
            if state != stored_state:
                # Log session contents for debugging
                logging.error(f"[OAUTH] State mismatch. Session contents: {dict(session)}")
                # In incognito mode or when sessions are lost, we can't verify state
                # For production, you might want to be more strict here
                if not stored_state:
                    logging.warning("[OAUTH] No stored state found - session may have been lost (incognito mode?)")
                else:
                    logging.warning("[OAUTH] State mismatch but continuing for compatibility")
            else:
                logging.debug("[OAUTH] State parameter verified successfully")
            
            # Exchange the authorization code for tokens
            token_session = OAuth2Session(
                client_id=google_bp.client_id,
                redirect_uri="https://fintrack-api.the-cube-lab.com/api/auth/callback"
            )
            
            token = token_session.fetch_token(
                "https://oauth2.googleapis.com/token",
                authorization_response=request.url,
                client_secret=google_bp.client_secret
            )
            
            # Store the token in the session so Flask-Dance can use it
            session['google_oauth_token'] = token
            
            # Now google.authorized should be True and we can get user info
            if not google.authorized:
                raise ValueError("Failed to authorize with Google")
            
            # Get user info after successful OAuth
            db_path = app.config.get('DB_PATH') or os.path.join(os.path.dirname(__file__), 'db', 'user.db')
            user_info, error = get_current_user_info(lambda: get_db_connection(db_path), db_path)
            if error:
                logging.error(f"[OAUTH] Error getting user info: {error}")
                if target_redirect == 'mobile':
                    return f"""
                    <html><body>
                    <script>
                        window.location.href = 'fintrack://auth/callback?error=' + encodeURIComponent('Failed to fetch user information');
                    </script>
                    <p>Authentication failed: Failed to fetch user information</p>
                    </body></html>
                    """
                else:
                    return f'<script>window.location.href="{web_redirect_url}?error=Failed%20to%20fetch%20user%20information";</script>'
            
            # Success - redirect based on target platform (from decoded state)
            logging.debug(f"[OAUTH] Target redirect from state: {target_redirect}")
            logging.debug(f"[OAUTH] Full session contents: {dict(session)}")
            
            if target_redirect == 'mobile':
                # Generate JWT token for mobile client
                jwt_token = None
                try:
                    from db_manager import get_user_by_username
                    from token_auth import create_jwt_token
                    
                    username = user_info.get('username', '')
                    user_data = get_user_by_username(username, db_path)
                    
                    if user_data and user_data.get('private_key'):
                        jwt_token = create_jwt_token(
                            user_data['private_key'],
                            username,
                            expires_hours=24
                        )
                        logging.info(f"[OAUTH] Generated JWT token for mobile user: {username}")
                    else:
                        logging.error(f"[OAUTH] No keypair found for user: {username}")
                except Exception as e:
                    logging.error(f"[OAUTH] Error generating JWT token: {e}")
                
                # Mobile redirect with deep link including JWT token
                mobile_params = urllib.parse.urlencode({
                    'success': 'true',
                    'username': user_info["username"],
                    'email': user_info["email"],
                    'name': user_info["name"],
                    'provider': user_info["provider"],
                    'photo': user_info.get("photo", ""),
                    'token': jwt_token if jwt_token else ''
                })
                deep_link_url = f'fintrack://auth/callback?{mobile_params}'
                logging.debug(f"[OAUTH] Mobile deep link URL: {deep_link_url}")
                
                return f"""
                <html><head><title>Login Success - Mobile</title></head><body>
                <script>
                    console.log("Mobile OAuth callback: redirecting to app");
                    window.location.href = '{deep_link_url}';
                </script>
                <p>Login successful! Redirecting to app...</p>
                <p>If you're not redirected automatically, <a href="{deep_link_url}">click here</a></p>
                </body></html>
                """
            else:
                # Web redirect - pass user data as URL parameters to frontend
                user_json = json.dumps(user_info)
                web_redirect_url = session.get('web_redirect_url', 'http://127.0.0.1:5173')
                
                # Add debugging to see what user data is being stored
                logging.debug(f"[OAUTH] Passing user data to frontend: {user_json}")
                logging.debug(f"[OAUTH] Redirecting to: {web_redirect_url}")
                
                # Encode user data as URL parameters
                user_params = urllib.parse.urlencode({
                    'oauth_success': 'true',
                    'user_data': user_json
                })
                
                redirect_url = f"{web_redirect_url}?{user_params}"
                
                return f'''<html><head><title>Login Success</title></head><body>
                <p>Authentication successful! Redirecting...</p>
                <script>
                    console.log("OAuth callback: redirecting with user data to", "{redirect_url}");
                    window.location.href = "{redirect_url}";
                </script>
                </body></html>'''
            
        except Exception as e:
            logging.error(f"[OAUTH] Error in auth callback: {e}")
            if target_redirect == 'mobile':
                return """
                <html><body>
                <script>
                    window.location.href = 'fintrack://auth/callback?error=' + encodeURIComponent('Authentication failed');
                </script>
                <p>Authentication failed. Redirecting...</p>
                </body></html>
                """
            else:
                return f'<script>window.location.href="{web_redirect_url}?error=auth_failed";</script>'

    @app.route("/api/auth/mobile/callback")
    def mobile_auth_callback():
        """Handle mobile OAuth callback and return HTML that communicates with the app."""
        try:
            # Handle the OAuth callback like normal
            if not google.authorized:
                return f"""
                <html><body>
                <script>
                    window.location.href = 'fintrack://auth/callback?error=oauth_failed';
                </script>
                <p>Authentication failed. Redirecting...</p>
                </body></html>
                """, 401
            
            # Get user info after successful OAuth
            db_path = app.config.get('DB_PATH') or os.path.join(os.path.dirname(__file__), 'db', 'user.db')
            user_info, error = get_current_user_info(lambda: get_db_connection(db_path), db_path)
            
            if error:
                return f"""
                <html><body>
                <script>
                    window.location.href = 'fintrack://auth/callback?error=' + encodeURIComponent('{error}');
                </script>
                <p>Authentication failed: {error}. Redirecting...</p>
                </body></html>
                """, 400
            
            # Generate JWT token for mobile client
            jwt_token = None
            try:
                from db_manager import get_user_by_username
                from token_auth import create_jwt_token
                
                username = user_info.get('username', '')
                user_data = get_user_by_username(username, db_path)
                
                if user_data and user_data.get('private_key'):
                    jwt_token = create_jwt_token(
                        user_data['private_key'],
                        username,
                        expires_hours=24
                    )
                    logging.info(f"[OAUTH] Generated JWT token for mobile user: {username}")
                else:
                    logging.error(f"[OAUTH] No keypair found for user: {username}")
            except Exception as e:
                logging.error(f"[OAUTH] Error generating JWT token: {e}")
            
            # Encode user info as URL parameters including JWT token
            user_params = urllib.parse.urlencode({
                'success': 'true',
                'username': user_info.get('username', ''),
                'email': user_info.get('email', ''),
                'name': user_info.get('name', ''),
                'provider': user_info.get('provider', 'google'),
                'photo': user_info.get('photo', ''),
                'token': jwt_token if jwt_token else ''
            })
            
            return f"""
            <html><body>
            <script>
                window.location.href = 'fintrack://auth/callback?' + '{user_params}';
            </script>
            <p>Authentication successful! Redirecting to app...</p>
            </body></html>
            """
            
        except Exception as e:
            logging.error(f"[OAUTH] Error in mobile auth callback: {e}")
            return f"""
            <html><body>
            <script>
                window.location.href = 'fintrack://auth/callback?error=' + encodeURIComponent('Authentication failed');
            </script>
            <p>Authentication failed. Redirecting...</p>
            </body></html>
            """, 500




def get_current_user_info(get_db_connection_func):
    """Get current authenticated user information."""
    if not google.authorized:
        return None, "Not authenticated"
    
    try:
        resp = google.get("/oauth2/v2/userinfo")
        if not resp.ok:
            return None, "Failed to fetch user info from Google"
            
        info = resp.json()
        username = info.get("email")
        email = info.get("email")
        provider = "google"
        name = info.get("name")
        photo_url = info.get("picture")

        # Get user from database first
        with get_db_connection_func() as conn:
            user = conn.execute(
                'SELECT username, email, provider, name, photo, preferences FROM users WHERE username = ?', (username,)
            ).fetchone()
            
            if not user:
                # New user - download photo and create user
                photo_bytes = None
                if photo_url:
                    try:
                        resp_img = requests.get(photo_url, timeout=10)
                        if resp_img.ok:
                            photo_bytes = resp_img.content
                        else:
                            photo_bytes = None
                    except Exception:
                        photo_bytes = None
                
                # Create new user with default preferences and keypair
                default_preferences = json.dumps({
                    "theme": "light",
                    "language": "en"
                })
                
                # Use the database create_user function that generates keypairs
                create_user(
                    username,
                    password=None,
                    email=email,
                    provider=provider,
                    name=name,
                    db_path=db_path
                )
                
                # Update the newly created user with photo and preferences
                conn.execute(
                    'UPDATE users SET photo = ?, preferences = ? WHERE username = ?',
                    (photo_bytes, default_preferences, username)
                )
                conn.commit()
                
                # Return new user info with database photo endpoint
                photo = f"https://fintrack-api.the-cube-lab.com/api/users/{username}/photo" if photo_bytes else None
                return {
                    "username": username, 
                    "email": email, 
                    "provider": provider, 
                    "name": name, 
                    "photo": photo,
                    "preferences": json.loads(default_preferences)
                }, None
            else:
                # Existing user - use database data, don't overwrite
                # If user has photo in DB (BLOB), use the database endpoint; otherwise use Google's photo URL as fallback
                if user['photo']:
                    # user['photo'] contains the BLOB data
                    photo = f"https://fintrack-api.the-cube-lab.com/api/users/{username}/photo"
                else:
                    photo = photo_url  # Fallback to Google's photo URL if no photo in DB
                
                # Parse preferences or use defaults
                preferences = {}
                if user['preferences']:
                    try:
                        preferences = json.loads(user['preferences'])
                    except json.JSONDecodeError:
                        preferences = {"theme": "light", "language": "en"}
                else:
                    preferences = {"theme": "light", "language": "en"}
                
                return {
                    "username": user['username'], 
                    "email": user['email'], 
                    "provider": user['provider'], 
                    "name": user['name'], 
                    "photo": photo,
                    "preferences": preferences
                }, None
        
    except Exception as e:
        logging.error(f"Error fetching user info: {e}")
        return None, "Failed to fetch user information"
