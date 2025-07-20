#!/usr/bin/env python3
"""
Test script to verify the refactored OAuth and database modules work correctly.
"""

import sys
import os

# Add the current directory to Python path
sys.path.insert(0, os.path.dirname(__file__))

try:
    from database import initialize_database, get_db_connection, get_user_by_username
    print("✓ Database module imported successfully")
    
    from oauth import create_google_oauth_blueprint, setup_oauth_handlers
    print("✓ OAuth module imported successfully")
    
    # Test database initialization
    test_db = "/tmp/test_fintrack.db"
    initialize_database(test_db)
    print("✓ Database initialized successfully")
    
    # Test OAuth blueprint creation
    google_bp = create_google_oauth_blueprint("test-client-id", "test-client-secret")
    print("✓ Google OAuth blueprint created successfully")
    
    print("\n🎉 All modules are working correctly!")
    
except ImportError as e:
    print(f"❌ Import error: {e}")
    sys.exit(1)
except Exception as e:
    print(f"❌ Error: {e}")
    sys.exit(1)
