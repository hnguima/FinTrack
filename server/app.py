"""
Main Flask application for FinTrack.
Integrates user management, financial data, OAuth, and serves as the unified API server.
"""
import os
import logging
import datetime
from flask import Flask, jsonify
from flask_cors import CORS
from flask_session import Session
from werkzeug.middleware.proxy_fix import ProxyFix

# Import our modules
from core.oauth import create_google_oauth_blueprint, setup_oauth_handlers, create_oauth_routes
from core.db_manager import initialize_all_databases, get_user_db_connection
from api.users import users_bp
from api.finance import finance_bp

def create_app():
    """Flask application factory."""
    app = Flask(__name__)
    app.secret_key = os.environ.get('SECRET_KEY', 'your-secret-key-change-in-production')

    # Configure logging
    logging.basicConfig(level=logging.INFO)
    
    # Environment variables for OAuth
    os.environ["OAUTHLIB_INSECURE_TRANSPORT"] = "1"
    os.environ["OAUTHLIB_RELAX_TOKEN_SCOPE"] = "1"
    
    # Database paths
    user_db_path = os.environ.get('DB_PATH', 'db/user.db')
    
    # CORS configuration for cross-origin requests
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

    # Session configuration
    app.config['SESSION_COOKIE_SECURE'] = True
    app.config['SESSION_COOKIE_SAMESITE'] = 'None'
    app.config['SESSION_COOKIE_PATH'] = '/'
    app.config['SESSION_TYPE'] = 'filesystem'
    app.config['SESSION_FILE_DIR'] = os.path.join(os.path.dirname(__file__), 'flask_session')
    app.config['SESSION_PERMANENT'] = False

    # Initialize extensions
    Session(app)
    app.wsgi_app = ProxyFix(app.wsgi_app, x_for=1, x_proto=1, x_host=1, x_port=1)

    # Create and register Google OAuth blueprint
    google_blueprint = create_google_oauth_blueprint(
        client_id=os.environ.get('GOOGLE_CLIENT_ID'),
        client_secret=os.environ.get('GOOGLE_CLIENT_SECRET')
    )
    app.register_blueprint(google_blueprint, url_prefix='/auth')

    # Setup OAuth handlers and routes
    setup_oauth_handlers(google_blueprint, lambda: get_user_db_connection())
    create_oauth_routes(app, google_blueprint)

    # Initialize databases
    initialize_all_databases()

    # Register API blueprints
    app.register_blueprint(users_bp)
    app.register_blueprint(finance_bp)
    

    # Health check endpoints
    @app.route('/api/health', methods=['GET'])
    def health_check():
        """Health check endpoint."""
        return jsonify({
            'status': 'healthy', 
            'timestamp': datetime.datetime.now(datetime.timezone.utc).isoformat()
        })

    return app

def main():
    """Main entry point for the application."""
    app = create_app()
    
    # Run with HTTPS if certificates are available
    cert_path = os.path.join(os.path.dirname(__file__), 'certs', 'cert.pem')
    key_path = os.path.join(os.path.dirname(__file__), 'certs', 'key.pem')
    
    print(f'Cert exists: {os.path.exists(cert_path)} - {cert_path}')
    print(f'Key exists: {os.path.exists(key_path)} - {key_path}')
    
    try:
        if os.path.exists(cert_path) and os.path.exists(key_path):
            app.run(host="0.0.0.0", debug=True, ssl_context=(cert_path, key_path))
        else:
            print('SSL certificates not found, running without SSL')
            app.run(host="0.0.0.0", debug=True)
    except Exception as e:
        print(f'SSL error: {e}')
        print('Falling back to HTTP')
        app.run(host="0.0.0.0", debug=True)

if __name__ == '__main__':
    main()
