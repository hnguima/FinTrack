"""
Database utilities for user management.
"""

import sqlite3
import logging
from crypto_utils import generate_keypair


def get_db_connection(db_path):
    """Create database connection with row factory."""
    conn = sqlite3.connect(db_path)
    conn.row_factory = sqlite3.Row
    return conn


def initialize_database(db_path):
    """Initialize the database with required tables."""
    with get_db_connection(db_path) as conn:
        # Check if users table exists and has the correct schema
        cursor = conn.execute("PRAGMA table_info(users)")
        columns = [column[1] for column in cursor.fetchall()]
        
        # Required columns for the current schema
        required_columns = [
            'id', 'username', 'password', 'email', 'provider', 
            'name', 'photo', 'preferences', 'private_key', 'public_key', 'created_at'
        ]
        
        # Check if table needs to be created or updated
        table_exists = len(columns) > 0
        has_all_columns = all(col in columns for col in required_columns)
        
        if not table_exists:
            # Create table for the first time
            logging.info("Creating users table for the first time")
            conn.execute('''
                CREATE TABLE users (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    username TEXT UNIQUE NOT NULL,
                    password TEXT,  -- Nullable for OAuth users
                    email TEXT,
                    provider TEXT,
                    name TEXT,
                    photo BLOB,
                    preferences TEXT,  -- JSON string for user preferences (theme, language, etc.)
                    private_key TEXT NOT NULL,  -- RSA private key for JWT signing
                    public_key TEXT NOT NULL,   -- RSA public key for JWT verification
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            ''')
            conn.commit()
            logging.info("Users table created successfully")
        elif not has_all_columns:
            # Add missing columns to existing table (preserves existing data)
            logging.info("Updating users table schema to add missing columns")
            
            if 'photo' not in columns:
                conn.execute('ALTER TABLE users ADD COLUMN photo BLOB')
                logging.info("Added photo BLOB column")
            
            if 'preferences' not in columns:
                conn.execute('ALTER TABLE users ADD COLUMN preferences TEXT')
                logging.info("Added preferences column")
                
            if 'private_key' not in columns:
                conn.execute('ALTER TABLE users ADD COLUMN private_key TEXT')
                logging.info("Added private_key column")
                
            if 'public_key' not in columns:
                conn.execute('ALTER TABLE users ADD COLUMN public_key TEXT')
                logging.info("Added public_key column")
                
            if 'name' not in columns:
                conn.execute('ALTER TABLE users ADD COLUMN name TEXT')
                logging.info("Added name column")
            
            conn.commit()
            logging.info("Users table schema updated successfully")
            
            # Generate keypairs for existing users who don't have them
            users_without_keypairs = conn.execute(
                'SELECT username FROM users WHERE private_key IS NULL OR public_key IS NULL'
            ).fetchall()
            
            if users_without_keypairs:
                logging.info(f"Generating keypairs for {len(users_without_keypairs)} existing users")
                for user in users_without_keypairs:
                    try:
                        private_key, public_key = generate_keypair()
                        conn.execute(
                            'UPDATE users SET private_key = ?, public_key = ? WHERE username = ?',
                            (private_key, public_key, user['username'])
                        )
                        logging.info(f"Generated keypair for user: {user['username']}")
                    except Exception as e:
                        logging.error(f"Failed to generate keypair for user {user['username']}: {e}")
                conn.commit()
        else:
            logging.info("Users table already exists with correct schema")


def create_user(db_path, username, password=None, email=None, provider=None, name=None):
    """Create a new user in the database with keypair generation."""
    try:
        # Generate unique keypair for this user
        private_key, public_key = generate_keypair()
        
        with get_db_connection(db_path) as conn:
            conn.execute(
                '''INSERT INTO users (username, password, email, provider, name, private_key, public_key) 
                   VALUES (?, ?, ?, ?, ?, ?, ?)''',
                (username, password, email, provider, name, private_key, public_key)
            )
            conn.commit()
            logging.info("Created user %s with unique keypair", username)
            
    except Exception as e:
        logging.error("Error creating user %s: %s", username, str(e))
        raise


def get_user_by_username(db_path, username):
    """Get user by username with all fields including keypair."""
    with get_db_connection(db_path) as conn:
        user = conn.execute(
            '''SELECT id, username, email, provider, name, photo, preferences, 
                      private_key, public_key, created_at 
               FROM users WHERE username = ?''', 
            (username,)
        ).fetchone()
    return dict(user) if user else None


def get_user_keypair(db_path, username):
    """Get user's keypair for token operations."""
    with get_db_connection(db_path) as conn:
        keypair = conn.execute(
            'SELECT private_key, public_key FROM users WHERE username = ?',
            (username,)
        ).fetchone()
    return dict(keypair) if keypair else None
