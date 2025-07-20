"""
Unified Database Management for FinTrack.
Handles both user database and financial data database schemas and operations.
"""

import sqlite3
import logging
import os
from cryptography.hazmat.primitives import serialization
from cryptography.hazmat.primitives.asymmetric import rsa
from cryptography.hazmat.backends import default_backend

# =====================================
# CONFIGURATION
# =====================================

# Default database paths - handle empty environment variables
USER_DB_PATH = os.environ.get('DB_PATH') or 'db/user.db'
DATA_DB_PATH = os.environ.get('DATA_DB_PATH') or 'db/data.db'


class DatabaseError(Exception):
    """Custom exception for database operations."""
    pass


# =====================================
# CONNECTION MANAGEMENT
# =====================================
def get_db_connection(db_path):
  """Create database connection with row factory."""
  try:
    conn = sqlite3.connect(db_path)
    conn.row_factory = sqlite3.Row
    return conn
  except sqlite3.Error as e:
    logging.error("Database connection error for %s: %s", db_path, str(e))
    raise DatabaseError(f"Failed to connect to database: {str(e)}") from e

def get_user_db_connection():
  """Get a connection to the user database using the configured path."""
  db_path = USER_DB_PATH or 'db/user.db'
  return get_db_connection(db_path)

def get_data_db_connection():
  """Get a connection to the financial data database using the configured path."""
  db_path = DATA_DB_PATH or 'db/data.db'
  return get_db_connection(db_path)


# =====================================
# KEYPAIR GENERATION
# =====================================

def generate_user_keypair():
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
        raise DatabaseError(f"Failed to generate keypair: {str(e)}") from e


# =====================================
# USER DATABASE SCHEMA & OPERATIONS
# =====================================

def initialize_user_database(db_path=None):
    """Initialize the user database with required tables."""
    if db_path is None or db_path == '':
        db_path = USER_DB_PATH
    
    # Ensure path is not empty after resolution    
    if not db_path:
        db_path = 'db/user.db'
        
    # Ensure directory exists (only if path has a directory component)
    db_dir = os.path.dirname(db_path)
    if db_dir:
        os.makedirs(db_dir, exist_ok=True)
        
    with get_db_connection(db_path) as conn:
        # Check if users table exists and has the correct schema
        cursor = conn.execute("PRAGMA table_info(users)")
        columns = [column[1] for column in cursor.fetchall()]
        
        # Required columns for the current schema
        required_columns = [
            'id', 'username', 'password', 'email', 'provider', 
            'name', 'photo', 'preferences', 'private_key', 'public_key', 'created_at', 'updated_at'
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
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
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
            
            if 'updated_at' not in columns:
                conn.execute('ALTER TABLE users ADD COLUMN updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP')
                logging.info("Added updated_at column")
            
            conn.commit()
            logging.info("Users table schema updated successfully")
            
            # Generate keypairs for existing users who don't have them
            users_without_keypairs = conn.execute(
                'SELECT username FROM users WHERE private_key IS NULL OR public_key IS NULL'
            ).fetchall()
            
            if users_without_keypairs:
                logging.info("Generating keypairs for %d existing users", len(users_without_keypairs))
                for user in users_without_keypairs:
                    try:
                        private_key, public_key = generate_user_keypair()
                        conn.execute(
                            'UPDATE users SET private_key = ?, public_key = ? WHERE username = ?',
                            (private_key, public_key, user['username'])
                        )
                        logging.info("Generated keypair for user: %s", user['username'])
                    except DatabaseError as e:
                        logging.error("Failed to generate keypair for user %s: %s", user['username'], str(e))
                conn.commit()
        else:
            logging.info("Users table already exists with correct schema")


def create_user(username, password=None, email=None, provider=None, name=None, db_path=None):
    """Create a new user in the database with keypair generation."""
    if db_path is None or db_path == '':
        db_path = USER_DB_PATH or 'db/user.db'
        
    try:
        # Generate unique keypair for this user
        private_key, public_key = generate_user_keypair()
        
        with get_db_connection(db_path) as conn:
            conn.execute(
                '''INSERT INTO users (username, password, email, provider, name, private_key, public_key) 
                   VALUES (?, ?, ?, ?, ?, ?, ?)''',
                (username, password, email, provider, name, private_key, public_key)
            )
            conn.commit()
            logging.info("Created user %s with unique keypair", username)
            
    except DatabaseError:
        raise
    except sqlite3.IntegrityError as e:
        if 'UNIQUE constraint failed' in str(e):
            raise DatabaseError(f"User {username} already exists")
        raise DatabaseError(f"Database constraint error: {str(e)}")
    except Exception as e:
        logging.error("Error creating user %s: %s", username, str(e))
        raise DatabaseError(f"Failed to create user: {str(e)}") from e


def get_user_by_username(username, db_path=None):
    """Get user by username with all fields including keypair."""
    if db_path is None or db_path == '':
        db_path = USER_DB_PATH or 'db/user.db'
        
    with get_db_connection(db_path) as conn:
        user = conn.execute(
            '''SELECT id, username, email, provider, name, photo, preferences, 
                      private_key, public_key, created_at, updated_at 
               FROM users WHERE username = ?''', 
            (username,)
        ).fetchone()
    return dict(user) if user else None


def get_user_keypair(username, db_path=None):
    """Get user's keypair for token operations."""
    if db_path is None or db_path == '':
        db_path = USER_DB_PATH or 'db/user.db'
        
    with get_db_connection(db_path) as conn:
        keypair = conn.execute(
            'SELECT private_key, public_key FROM users WHERE username = ?',
            (username,)
        ).fetchone()
    return dict(keypair) if keypair else None


def update_user_field(username, field_name, field_value, db_path=None):
    """Update a specific field for a user."""
    if db_path is None or db_path == '':
        db_path = USER_DB_PATH or 'db/user.db'
        
    allowed_fields = ['email', 'name', 'photo', 'preferences']
    if field_name not in allowed_fields:
        raise DatabaseError(f"Field {field_name} is not allowed to be updated")
        
    with get_db_connection(db_path) as conn:
        cursor = conn.execute(
            f'UPDATE users SET {field_name} = ? WHERE username = ?',
            (field_value, username)
        )
        conn.commit()
        if cursor.rowcount == 0:
            raise DatabaseError(f"User {username} not found")


# =====================================
# FINANCIAL DATA SCHEMA & OPERATIONS
# =====================================

def initialize_finance_database(db_path=None):
    """Initialize the financial data database with required tables."""
    if db_path is None or db_path == '':
        db_path = DATA_DB_PATH
        
    # Ensure path is not empty after resolution
    if not db_path:
        db_path = 'db/data.db'
        
    # Ensure directory exists (only if path has a directory component)
    db_dir = os.path.dirname(db_path)
    if db_dir:
        os.makedirs(db_dir, exist_ok=True)
        
    with get_db_connection(db_path) as conn:
        cursor = conn.cursor()
        
        # Accounts table
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS accounts (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id TEXT NOT NULL,  -- Username instead of integer ID for consistency
                name TEXT NOT NULL,
                type TEXT,
                currency TEXT,
                institution TEXT,
                metadata TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        ''')
        
        # Entries (transactions) table
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS entries (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id TEXT NOT NULL,
                from_account_id INTEGER,
                to_account_id INTEGER,
                amount REAL NOT NULL,
                currency TEXT NOT NULL,
                category TEXT,
                description TEXT,
                notes TEXT,
                timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY(from_account_id) REFERENCES accounts(id),
                FOREIGN KEY(to_account_id) REFERENCES accounts(id)
            )
        ''')
        
        # Investments table
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS investments (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id TEXT NOT NULL,
                account_id INTEGER,
                asset_type TEXT,
                symbol TEXT,
                quantity REAL,
                value REAL,
                currency TEXT,
                timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY(account_id) REFERENCES accounts(id)
            )
        ''')
        
        # Budgets/Goals table
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS budgets (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id TEXT NOT NULL,
                name TEXT,
                category TEXT,
                account_id INTEGER,
                amount REAL NOT NULL,
                period TEXT,
                start_date DATE,
                end_date DATE,
                goal_type TEXT,
                description TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY(account_id) REFERENCES accounts(id)
            )
        ''')
        
        # Tags table (user-based)
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS tags (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id TEXT NOT NULL,
                name TEXT NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(user_id, name)
            )
        ''')
        
        # Entry-Tags junction table (many-to-many, user-based)
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS entry_tags (
                entry_id INTEGER NOT NULL,
                tag_id INTEGER NOT NULL,
                user_id TEXT NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY(entry_id) REFERENCES entries(id) ON DELETE CASCADE,
                FOREIGN KEY(tag_id) REFERENCES tags(id) ON DELETE CASCADE,
                PRIMARY KEY(entry_id, tag_id, user_id)
            )
        ''')
        
        # Create indexes for better performance
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_accounts_user_id ON accounts(user_id)')
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_entries_user_id ON entries(user_id)')
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_investments_user_id ON investments(user_id)')
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_budgets_user_id ON budgets(user_id)')
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_tags_user_id ON tags(user_id)')
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_entry_tags_user_id ON entry_tags(user_id)')
        
        conn.commit()
        logging.info("Financial data tables created/updated successfully")


# =====================================
# FINANCIAL DATA OPERATIONS
# =====================================

# --- ACCOUNTS ---
def get_user_accounts(user_id, db_path=None):
    """Get all accounts for a user."""
    if db_path is None or db_path == '':
        db_path = DATA_DB_PATH or 'db/data.db'
    
    with get_db_connection(db_path) as conn:
        accounts = conn.execute(
            'SELECT id, name, type, currency, institution, metadata FROM accounts WHERE user_id = ?', 
            (user_id,)
        ).fetchall()
        return [dict(account) for account in accounts]


def create_user_account(user_id, name, account_type=None, currency=None, institution=None, metadata=None, db_path=None):
    """Create a new account for a user."""
    if db_path is None or db_path == '':
        db_path = DATA_DB_PATH or 'db/data.db'
    
    with get_db_connection(db_path) as conn:
        cursor = conn.execute(
            'INSERT INTO accounts (user_id, name, type, currency, institution, metadata) VALUES (?, ?, ?, ?, ?, ?)',
            (user_id, name, account_type, currency, institution, metadata)
        )
        conn.commit()
        return cursor.lastrowid


def get_user_account_by_id(user_id, account_id, db_path=None):
    """Get a specific account by ID for a user."""
    if db_path is None or db_path == '':
        db_path = DATA_DB_PATH or 'db/data.db'
    
    with get_db_connection(db_path) as conn:
        account = conn.execute(
            'SELECT id, name, type, currency, institution, metadata FROM accounts WHERE id = ? AND user_id = ?',
            (account_id, user_id)
        ).fetchone()
        return dict(account) if account else None


# --- ENTRIES ---
def get_user_entries(user_id, db_path=None):
    """Get all entries for a user."""
    if db_path is None or db_path == '':
        db_path = DATA_DB_PATH or 'db/data.db'
    
    with get_db_connection(db_path) as conn:
        entries = conn.execute(
            '''SELECT id, from_account_id, to_account_id, amount, currency, category, 
               description, notes, timestamp FROM entries WHERE user_id = ? ORDER BY timestamp DESC''',
            (user_id,)
        ).fetchall()
        return [dict(entry) for entry in entries]


def create_user_entry(user_id, amount, currency, from_account_id=None, to_account_id=None, 
                     category=None, description=None, notes=None, db_path=None):
    """Create a new entry for a user."""
    if db_path is None or db_path == '':
        db_path = DATA_DB_PATH or 'db/data.db'
    
    with get_db_connection(db_path) as conn:
        cursor = conn.execute(
            '''INSERT INTO entries (user_id, from_account_id, to_account_id, amount, currency, 
               category, description, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?)''',
            (user_id, from_account_id, to_account_id, amount, currency, category, description, notes)
        )
        conn.commit()
        return cursor.lastrowid


# --- INVESTMENTS ---
def get_user_investments(user_id, db_path=None):
    """Get all investments for a user."""
    if db_path is None or db_path == '':
        db_path = DATA_DB_PATH or 'db/data.db'
    
    with get_db_connection(db_path) as conn:
        investments = conn.execute(
            '''SELECT id, account_id, asset_type, symbol, quantity, value, currency, timestamp 
               FROM investments WHERE user_id = ?''',
            (user_id,)
        ).fetchall()
        return [dict(investment) for investment in investments]


def create_user_investment(user_id, account_id=None, asset_type=None, symbol=None, 
                          quantity=None, value=None, currency=None, db_path=None):
    """Create a new investment for a user."""
    if db_path is None or db_path == '':
        db_path = DATA_DB_PATH or 'db/data.db'
    
    with get_db_connection(db_path) as conn:
        cursor = conn.execute(
            '''INSERT INTO investments (user_id, account_id, asset_type, symbol, quantity, value, currency)
               VALUES (?, ?, ?, ?, ?, ?, ?)''',
            (user_id, account_id, asset_type, symbol, quantity, value, currency)
        )
        conn.commit()
        return cursor.lastrowid


# --- BUDGETS ---
def get_user_budgets(user_id, db_path=None):
    """Get all budgets for a user."""
    if db_path is None or db_path == '':
        db_path = DATA_DB_PATH or 'db/data.db'
    
    with get_db_connection(db_path) as conn:
        budgets = conn.execute(
            '''SELECT id, name, category, account_id, amount, period, start_date, 
               end_date, goal_type, description FROM budgets WHERE user_id = ?''',
            (user_id,)
        ).fetchall()
        return [dict(budget) for budget in budgets]


def create_user_budget(user_id, amount, name=None, category=None, account_id=None, period=None,
                      start_date=None, end_date=None, goal_type=None, description=None, db_path=None):
    """Create a new budget for a user."""
    if db_path is None or db_path == '':
        db_path = DATA_DB_PATH or 'db/data.db'
    
    with get_db_connection(db_path) as conn:
        cursor = conn.execute(
            '''INSERT INTO budgets (user_id, name, category, account_id, amount, period, 
               start_date, end_date, goal_type, description) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)''',
            (user_id, name, category, account_id, amount, period, start_date, end_date, goal_type, description)
        )
        conn.commit()
        return cursor.lastrowid


# --- TAGS ---
def get_user_tags(user_id, db_path=None):
    """Get all tags for a user."""
    if db_path is None or db_path == '':
        db_path = DATA_DB_PATH or 'db/data.db'
    
    with get_db_connection(db_path) as conn:
        tags = conn.execute(
            'SELECT id, name FROM tags WHERE user_id = ?',
            (user_id,)
        ).fetchall()
        return [dict(tag) for tag in tags]


def create_user_tag(user_id, name, db_path=None):
    """Create a new tag for a user."""
    if db_path is None or db_path == '':
        db_path = DATA_DB_PATH or 'db/data.db'
    
    try:
        with get_db_connection(db_path) as conn:
            cursor = conn.execute(
                'INSERT INTO tags (user_id, name) VALUES (?, ?)',
                (user_id, name)
            )
            conn.commit()
            return cursor.lastrowid
    except sqlite3.IntegrityError as e:
        if 'UNIQUE constraint failed' in str(e):
            raise DatabaseError(f"Tag '{name}' already exists for this user")
        raise DatabaseError(f"Database constraint error: {str(e)}")


# --- ENTRY TAGS ---
def add_user_entry_tag(user_id, entry_id, tag_id, db_path=None):
    """Add a tag to an entry for a user."""
    if db_path is None or db_path == '':
        db_path = DATA_DB_PATH or 'db/data.db'
    
    with get_db_connection(db_path) as conn:
        # Verify entry belongs to user
        entry = conn.execute('SELECT id FROM entries WHERE id = ? AND user_id = ?', (entry_id, user_id)).fetchone()
        if not entry:
            raise DatabaseError('Entry not found')
        
        # Verify tag belongs to user
        tag = conn.execute('SELECT id FROM tags WHERE id = ? AND user_id = ?', (tag_id, user_id)).fetchone()
        if not tag:
            raise DatabaseError('Tag not found')
        
        # Add the association
        conn.execute(
            'INSERT OR IGNORE INTO entry_tags (entry_id, tag_id, user_id) VALUES (?, ?, ?)',
            (entry_id, tag_id, user_id)
        )
        conn.commit()


def remove_user_entry_tag(user_id, entry_id, tag_id, db_path=None):
    """Remove a tag from an entry for a user."""
    if db_path is None or db_path == '':
        db_path = DATA_DB_PATH or 'db/data.db'
    
    with get_db_connection(db_path) as conn:
        cursor = conn.execute(
            'DELETE FROM entry_tags WHERE entry_id = ? AND tag_id = ? AND user_id = ?',
            (entry_id, tag_id, user_id)
        )
        conn.commit()
        
        if cursor.rowcount == 0:
            raise DatabaseError('Tag association not found')


# =====================================
# UNIFIED INITIALIZATION
# =====================================

def initialize_all_databases(user_db_path=None, finance_db_path=None):
    """Initialize both user and financial databases."""
    try:
        # Resolve database paths with proper defaults
        if user_db_path is None or user_db_path == '':
            user_db_path = USER_DB_PATH
        if finance_db_path is None or finance_db_path == '':
            finance_db_path = DATA_DB_PATH
            
        # Ensure paths are not empty after resolution
        if not user_db_path:
            user_db_path = 'db/user.db'
        if not finance_db_path:
            finance_db_path = 'db/data.db'
            
        # Ensure both paths have proper directory structure
        if user_db_path and os.path.dirname(user_db_path):
            os.makedirs(os.path.dirname(user_db_path), exist_ok=True)
        if finance_db_path and os.path.dirname(finance_db_path):
            os.makedirs(os.path.dirname(finance_db_path), exist_ok=True)
            
        initialize_user_database(user_db_path)
        initialize_finance_database(finance_db_path)
        logging.info("All databases initialized successfully")
    except DatabaseError:
        raise
    except Exception as e:
        logging.error("Error initializing databases: %s", str(e))
        raise DatabaseError(f"Failed to initialize databases: {str(e)}") from e


# Backward compatibility aliases
initialize_database = initialize_user_database  # For existing code
