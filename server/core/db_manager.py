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
        logging.error("Error deleting user account: %s", str(e))
        raise DatabaseError(f"Failed to delete account: {str(e)}") from e

# =====================================
# FINANCIAL DATA CACHE MANAGEMENT
# =====================================

def update_finance_metadata(user_id, db_path=None):
    """Update the last_updated timestamp for user's financial data."""
    if db_path is None or db_path == '':
        db_path = DATA_DB_PATH or 'db/data.db'
        
    try:
        with get_db_connection(db_path) as conn:
            cursor = conn.cursor()
            cursor.execute('''
                INSERT OR REPLACE INTO finance_metadata (user_id, last_updated)
                VALUES (?, CURRENT_TIMESTAMP)
            ''', (user_id,))
            conn.commit()
    except sqlite3.Error as e:
        logging.error("Error updating finance metadata: %s", str(e))
        raise DatabaseError(f"Failed to update finance metadata: {str(e)}") from e

def get_finance_last_updated(user_id, db_path=None):
    """Get the last_updated timestamp for user's financial data."""
    if db_path is None or db_path == '':
        db_path = DATA_DB_PATH or 'db/data.db'
        
    try:
        with get_db_connection(db_path) as conn:
            cursor = conn.cursor()
            cursor.execute('''
                SELECT last_updated FROM finance_metadata WHERE user_id = ?
            ''', (user_id,))
            
            result = cursor.fetchone()
            return result['last_updated'] if result else None
    except sqlite3.Error as e:
        logging.error("Error getting finance metadata: %s", str(e))
        return None

# =====================================
# ADVANCED TRANSACTION MANAGEMENT
# =====================================

def get_transactions_with_search(user_id, search_params=None, db_path=None):
    """Get transactions with advanced search and filtering capabilities."""
    if db_path is None or db_path == '':
        db_path = DATA_DB_PATH or 'db/data.db'
        
    try:
        with get_db_connection(db_path) as conn:
            cursor = conn.cursor()
            
            # Base query
            query = '''
                SELECT e.*, 
                       fa.name as from_account_name,
                       ta.name as to_account_name
                FROM entries e
                LEFT JOIN accounts fa ON e.from_account_id = fa.id
                LEFT JOIN accounts ta ON e.to_account_id = ta.id
                WHERE e.user_id = ?
            '''
            
            params = [user_id]
            
            # Apply search filters if provided
            if search_params:
                if search_params.get('category'):
                    query += ' AND e.category LIKE ?'
                    params.append(f"%{search_params['category']}%")
                
                if search_params.get('entry_type'):
                    query += ' AND e.entry_type = ?'
                    params.append(search_params['entry_type'])
                
                if search_params.get('description'):
                    query += ' AND (e.description LIKE ? OR e.notes LIKE ?)'
                    search_term = f"%{search_params['description']}%"
                    params.extend([search_term, search_term])
                
                if search_params.get('amount_min'):
                    query += ' AND e.amount >= ?'
                    params.append(search_params['amount_min'])
                
                if search_params.get('amount_max'):
                    query += ' AND e.amount <= ?'
                    params.append(search_params['amount_max'])
                
                if search_params.get('date_from'):
                    query += ' AND (e.date >= ? OR (e.date IS NULL AND DATE(e.timestamp) >= ?))'
                    params.extend([search_params['date_from'], search_params['date_from']])
                
                if search_params.get('date_to'):
                    query += ' AND (e.date <= ? OR (e.date IS NULL AND DATE(e.timestamp) <= ?))'
                    params.extend([search_params['date_to'], search_params['date_to']])
                
                if search_params.get('account_id'):
                    query += ' AND (e.from_account_id = ? OR e.to_account_id = ?)'
                    params.extend([search_params['account_id'], search_params['account_id']])
            
            # Add ordering and pagination
            query += ' ORDER BY e.timestamp DESC'
            
            if search_params and search_params.get('limit'):
                query += ' LIMIT ?'
                params.append(search_params['limit'])
                
                if search_params.get('offset'):
                    query += ' OFFSET ?'
                    params.append(search_params['offset'])
            
            cursor.execute(query, params)
            rows = cursor.fetchall()
            
            # Convert to dictionaries
            columns = [description[0] for description in cursor.description]
            return [dict(zip(columns, row)) for row in rows]
            
    except Exception as e:
        logging.error("Error getting transactions with search: %s", str(e))
        raise DatabaseError(f"Failed to search transactions: {str(e)}") from e

def get_transaction_categories(user_id, db_path=None):
    """Get all unique categories used by the user."""
    if db_path is None or db_path == '':
        db_path = DATA_DB_PATH or 'db/data.db'
        
    try:
        with get_db_connection(db_path) as conn:
            cursor = conn.cursor()
            cursor.execute('''
                SELECT DISTINCT category, COUNT(*) as usage_count
                FROM entries 
                WHERE user_id = ? AND category IS NOT NULL AND category != ''
                GROUP BY category
                ORDER BY usage_count DESC, category
            ''', (user_id,))
            
            rows = cursor.fetchall()
            return [{'name': row[0], 'usage_count': row[1]} for row in rows]
            
    except Exception as e:
        logging.error("Error getting transaction categories: %s", str(e))
        raise DatabaseError(f"Failed to get categories: {str(e)}") from e

def create_transaction(user_id, transaction_data, db_path=None):
    """Create a new transaction with enhanced data."""
    if db_path is None or db_path == '':
        db_path = DATA_DB_PATH or 'db/data.db'
        
    try:
        with get_db_connection(db_path) as conn:
            cursor = conn.cursor()
            
            # Handle date field - use provided date or current timestamp
            date_value = transaction_data.get('date')
            timestamp_value = transaction_data.get('timestamp')
            
            # If date is provided but no timestamp, use date for timestamp too
            if date_value and not timestamp_value:
                timestamp_value = date_value
            # If no date provided, extract date from timestamp
            elif not date_value and timestamp_value:
                date_value = timestamp_value.split('T')[0] if 'T' in timestamp_value else timestamp_value.split(' ')[0]
            # If neither provided, use current date/time
            elif not date_value and not timestamp_value:
                from datetime import datetime
                now = datetime.now()
                date_value = now.strftime('%Y-%m-%d')
                timestamp_value = now.isoformat()
            
            cursor.execute('''
                INSERT INTO entries (
                    user_id, from_account_id, to_account_id, amount, currency,
                    category, description, notes, entry_type, 
                    recurring_id, attachment_url, location, date, timestamp
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ''', (
                user_id,
                transaction_data.get('from_account_id') or transaction_data.get('account_id'),
                transaction_data.get('to_account_id'),
                transaction_data['amount'],
                transaction_data.get('currency', 'USD'),
                transaction_data.get('category'),
                transaction_data.get('description'),
                transaction_data.get('notes'),
                transaction_data.get('entry_type', 'expense'),
                transaction_data.get('recurring_id'),
                transaction_data.get('attachment_url'),
                transaction_data.get('location'),
                date_value,
                timestamp_value
            ))
            
            conn.commit()
            
            # Update finance metadata timestamp
            update_finance_metadata(user_id, db_path)
            
            return cursor.lastrowid
            
    except Exception as e:
        logging.error("Error creating transaction: %s", str(e))
        raise DatabaseError(f"Failed to create transaction: {str(e)}") from e

def update_transaction(user_id, transaction_id, update_data, db_path=None):
    """Update an existing transaction."""
    if db_path is None or db_path == '':
        db_path = DATA_DB_PATH or 'db/data.db'
        
    try:
        with get_db_connection(db_path) as conn:
            cursor = conn.cursor()
            
            # First verify the transaction belongs to the user
            cursor.execute('SELECT id FROM entries WHERE id = ? AND user_id = ?', 
                         (transaction_id, user_id))
            if not cursor.fetchone():
                raise DatabaseError("Transaction not found or access denied")
            
            # Build dynamic update query
            update_fields = []
            params = []
            
            allowed_fields = ['from_account_id', 'to_account_id', 'amount', 'currency', 
                            'category', 'description', 'notes', 'entry_type',
                            'attachment_url', 'location', 'date', 'timestamp']
            
            for field in allowed_fields:
                if field in update_data:
                    update_fields.append(f"{field} = ?")
                    params.append(update_data[field])
            
            if not update_fields:
                raise DatabaseError("No valid fields to update")
            
            params.extend([transaction_id, user_id])
            
            query = f'''
                UPDATE entries 
                SET {', '.join(update_fields)}
                WHERE id = ? AND user_id = ?
            '''
            
            cursor.execute(query, params)
            conn.commit()
            
            if cursor.rowcount == 0:
                raise DatabaseError("No transaction was updated")
            
            # Update finance metadata timestamp
            update_finance_metadata(user_id, db_path)
                
            return True
            
    except Exception as e:
        logging.error("Error updating transaction: %s", str(e))
        raise DatabaseError(f"Failed to update transaction: {str(e)}") from e

def delete_transaction(user_id, transaction_id, db_path=None):
    """Delete a transaction (with user verification)."""
    if db_path is None or db_path == '':
        db_path = DATA_DB_PATH or 'db/data.db'
        
    try:
        with get_db_connection(db_path) as conn:
            cursor = conn.cursor()
            cursor.execute('''
                DELETE FROM entries 
                WHERE id = ? AND user_id = ?
            ''', (transaction_id, user_id))
            
            conn.commit()
            
            if cursor.rowcount == 0:
                raise DatabaseError("Transaction not found or access denied")
            
            # Update finance metadata timestamp
            update_finance_metadata(user_id, db_path)
                
            return True
            
    except Exception as e:
        logging.error("Error deleting transaction: %s", str(e))
        raise DatabaseError(f"Failed to delete transaction: {str(e)}") from e

def get_spending_by_category(user_id, date_range=None, db_path=None):
    """Get spending analysis by category."""
    if db_path is None or db_path == '':
        db_path = DATA_DB_PATH or 'db/data.db'
        
    try:
        with get_db_connection(db_path) as conn:
            cursor = conn.cursor()
            
            query = '''
                SELECT 
                    COALESCE(category, 'Uncategorized') as category,
                    SUM(ABS(amount)) as amount,
                    COUNT(*) as count,
                    AVG(ABS(amount)) as average_amount
                FROM entries 
                WHERE user_id = ? AND entry_type IN ('expense', 'bill')
            '''
            
            params = [user_id]
            
            if date_range and date_range.get('start_date'):
                query += ' AND DATE(COALESCE(date, timestamp)) >= ?'
                params.append(date_range['start_date'])
            
            if date_range and date_range.get('end_date'):
                query += ' AND DATE(COALESCE(date, timestamp)) <= ?'
                params.append(date_range['end_date'])
            
            query += '''
                GROUP BY COALESCE(category, 'Uncategorized')
                ORDER BY amount DESC
            '''
            
            cursor.execute(query, params)
            rows = cursor.fetchall()
            
            categories = []
            total_amount = 0
            
            for row in rows:
                category_data = {
                    'category': row[0],
                    'amount': float(row[1]),
                    'count': row[2],
                    'average_amount': float(row[3])
                }
                categories.append(category_data)
                total_amount += category_data['amount']
            
            # Add percentage calculation
            for category in categories:
                category['percentage'] = (category['amount'] / total_amount * 100) if total_amount > 0 else 0
                
            return {
                'categories': categories,
                'total_spending': total_amount,
                'total_transactions': sum(cat['count'] for cat in categories)
            }
            
    except Exception as e:
        logging.error("Error getting spending by category: %s", str(e))
        raise DatabaseError(f"Failed to get spending analysis: {str(e)}") from e

# =====================================


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
                entry_type TEXT DEFAULT 'expense', -- 'income', 'expense', 'transfer', 'investment', 'bill'
                recurring_id INTEGER, -- Link to recurring transaction
                attachment_url TEXT, -- Receipt/document storage
                location TEXT, -- Transaction location
                timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY(from_account_id) REFERENCES accounts(id),
                FOREIGN KEY(to_account_id) REFERENCES accounts(id)
            )
        ''')
        
        # Remove status column if it exists (migration)
        try:
            cursor.execute("SELECT status FROM entries LIMIT 1")
            # Status column exists, need to migrate
            logging.info("Removing status column from entries table")
            cursor.execute('''
                CREATE TABLE entries_new (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    user_id TEXT NOT NULL,
                    from_account_id INTEGER,
                    to_account_id INTEGER,
                    amount REAL NOT NULL,
                    currency TEXT NOT NULL,
                    category TEXT,
                    description TEXT,
                    notes TEXT,
                    entry_type TEXT DEFAULT 'expense',
                    recurring_id INTEGER,
                    attachment_url TEXT,
                    location TEXT,
                    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY(from_account_id) REFERENCES accounts(id),
                    FOREIGN KEY(to_account_id) REFERENCES accounts(id)
                )
            ''')
            
            cursor.execute('''
                INSERT INTO entries_new (
                    id, user_id, from_account_id, to_account_id, amount, currency,
                    category, description, notes, entry_type, recurring_id,
                    attachment_url, location, timestamp, created_at
                )
                SELECT 
                    id, user_id, from_account_id, to_account_id, amount, currency,
                    category, description, notes, entry_type, recurring_id,
                    attachment_url, location, timestamp, created_at
                FROM entries
            ''')
            
            cursor.execute('DROP TABLE entries')
            cursor.execute('ALTER TABLE entries_new RENAME TO entries')
            logging.info("Successfully migrated entries table to remove status column")
        except sqlite3.OperationalError:
            # Column doesn't exist, no migration needed
            pass
        
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
        
        # Create metadata table for tracking updates
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS finance_metadata (
                user_id TEXT PRIMARY KEY,
                last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        ''')
        
        # Create indexes for better performance
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_accounts_user_id ON accounts(user_id)')
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_entries_user_id ON entries(user_id)')
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_investments_user_id ON investments(user_id)')
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_budgets_user_id ON budgets(user_id)')
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_tags_user_id ON tags(user_id)')
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_entry_tags_user_id ON entry_tags(user_id)')
        
        # Migration: Add date field to entries table if it doesn't exist
        try:
            cursor.execute('ALTER TABLE entries ADD COLUMN date DATE')
            logging.info("Added 'date' column to entries table")
        except sqlite3.OperationalError as e:
            if "duplicate column name" in str(e):
                logging.debug("'date' column already exists in entries table")
            else:
                raise
        
        # Update existing entries to have date field populated from timestamp
        cursor.execute('''
            UPDATE entries 
            SET date = DATE(timestamp) 
            WHERE date IS NULL AND timestamp IS NOT NULL
        ''')
        
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
        
        # Update finance metadata timestamp
        update_finance_metadata(user_id, db_path)
        
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


def calculate_account_balance(user_id, account_id, end_date=None, db_path=None):
    """Calculate current balance for an account based on entries."""
    if db_path is None or db_path == '':
        db_path = DATA_DB_PATH or 'db/data.db'
    
    # First verify the account belongs to the user
    account = get_user_account_by_id(user_id, account_id, db_path)
    if not account:
        raise DatabaseError('Account not found or does not belong to user')
    
    with get_db_connection(db_path) as conn:
        # Calculate money coming INTO the account (to_account_id)
        # For incoming money, we want the absolute value since it increases balance
        date_filter = 'AND timestamp <= ?' if end_date else ''
        params_in = [account_id, user_id] + ([end_date] if end_date else [])
        
        money_in = conn.execute(f'''
            SELECT COALESCE(SUM(ABS(amount)), 0) as total_in
            FROM entries 
            WHERE to_account_id = ? AND user_id = ? {date_filter}
        ''', params_in).fetchone()['total_in']
        
        # Calculate money going OUT of the account (from_account_id)
        # For outgoing money, we want the absolute value since it decreases balance
        params_out = [account_id, user_id] + ([end_date] if end_date else [])
        
        money_out = conn.execute(f'''
            SELECT COALESCE(SUM(ABS(amount)), 0) as total_out
            FROM entries 
            WHERE from_account_id = ? AND user_id = ? {date_filter}
        ''', params_out).fetchone()['total_out']
        
        balance = money_in - money_out
        return round(balance, 2)  # Round to 2 decimal places for currency


def get_account_balance_history(user_id, account_id, days_back=30, db_path=None):
    """Get balance history for an account over time."""
    if db_path is None or db_path == '':
        db_path = DATA_DB_PATH or 'db/data.db'
    
    # First verify the account belongs to the user
    account = get_user_account_by_id(user_id, account_id, db_path)
    if not account:
        raise DatabaseError('Account not found or does not belong to user')
    
    from datetime import datetime, timedelta
    
    history = []
    end_date = datetime.now()
    
    # Calculate balance for each day going back
    for i in range(days_back + 1):
        current_date = end_date - timedelta(days=i)
        balance = calculate_account_balance(user_id, account_id, current_date.isoformat(), db_path)
        history.append({
            'date': current_date.strftime('%Y-%m-%d'),
            'balance': balance
        })
    
    return list(reversed(history))  # Return chronologically


def get_user_accounts_with_balances(user_id, db_path=None):
    """Get all accounts for a user with current balances included."""
    accounts = get_user_accounts(user_id, db_path)
    
    # Add balance to each account
    for account in accounts:
        try:
            account['balance'] = calculate_account_balance(user_id, account['id'], None, db_path)
        except DatabaseError:
            account['balance'] = 0.0  # Default to 0 if calculation fails
            
    return accounts


def update_user_account(user_id, account_id, name=None, account_type=None, currency=None, institution=None, metadata=None, db_path=None):
    """Update an existing account for a user."""
    if db_path is None or db_path == '':
        db_path = DATA_DB_PATH or 'db/data.db'
    
    # First verify the account belongs to the user
    account = get_user_account_by_id(user_id, account_id, db_path)
    if not account:
        raise DatabaseError('Account not found or does not belong to user')
    
    # Build dynamic update query
    updates = []
    params = []
    
    if name is not None:
        updates.append('name = ?')
        params.append(name)
    if account_type is not None:
        updates.append('type = ?')
        params.append(account_type)
    if currency is not None:
        updates.append('currency = ?')
        params.append(currency)
    if institution is not None:
        updates.append('institution = ?')
        params.append(institution)
    if metadata is not None:
        updates.append('metadata = ?')
        params.append(metadata)
    
    if not updates:
        raise DatabaseError('No fields to update')
    
    # Add WHERE clause parameters
    params.extend([account_id, user_id])
    
    with get_db_connection(db_path) as conn:
        query = f"UPDATE accounts SET {', '.join(updates)} WHERE id = ? AND user_id = ?"
        cursor = conn.execute(query, params)
        conn.commit()
        
        if cursor.rowcount == 0:
            raise DatabaseError('Account not found or no changes made')
        
        return True


def delete_user_account(user_id, account_id, db_path=None):
    """Delete an account for a user (with safety checks)."""
    if db_path is None or db_path == '':
        db_path = DATA_DB_PATH or 'db/data.db'
    
    with get_db_connection(db_path) as conn:
        # Check if account has any transactions
        entry_count = conn.execute('''
            SELECT COUNT(*) as count FROM entries 
            WHERE (from_account_id = ? OR to_account_id = ?) AND user_id = ?
        ''', (account_id, account_id, user_id)).fetchone()['count']
        
        if entry_count > 0:
            raise DatabaseError(f'Cannot delete account: {entry_count} transactions exist. Delete transactions first.')
        
        # Delete the account
        cursor = conn.execute(
            'DELETE FROM accounts WHERE id = ? AND user_id = ?',
            (account_id, user_id)
        )
        conn.commit()
        
        if cursor.rowcount == 0:
            raise DatabaseError('Account not found or does not belong to user')
        
        return True


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
