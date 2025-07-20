"""
RESTful Finance API endpoints for FinTrack.
Handles accounts, entries, investments, budgets, and tags with user-based authentication.
"""
import logging
from flask import Blueprint, request, jsonify
from core.token_auth import token_required
from core.db_manager import (
    get_user_accounts, create_user_account, get_user_account_by_id,
    get_user_entries, create_user_entry,
    get_user_investments, create_user_investment,
    get_user_budgets, create_user_budget,
    get_user_tags, create_user_tag,
    add_user_entry_tag, remove_user_entry_tag,
    DatabaseError
)

# Create Blueprint
finance_bp = Blueprint('finance', __name__)

# --- ACCOUNTS ENDPOINTS ---

@finance_bp.route('/api/accounts', methods=['GET'])
@token_required
def get_accounts(current_user_id):
    """Get all accounts for the current user."""
    try:
        accounts = get_user_accounts(current_user_id)
        return jsonify(accounts)
    except DatabaseError as e:
        logging.error("Database error fetching accounts: %s", str(e))
        return jsonify({'message': 'Failed to fetch accounts'}), 500
    except Exception as e:
        logging.error("Error fetching accounts: %s", str(e))
        return jsonify({'message': 'Failed to fetch accounts'}), 500

@finance_bp.route('/api/accounts', methods=['POST'])
@token_required
def create_account(current_user_id):
    """Create a new account for the current user."""
    try:
        data = request.get_json()
        if not data or 'name' not in data:
            return jsonify({'message': 'Account name is required'}), 400
        
        account_id = create_user_account(
            current_user_id, 
            data['name'], 
            data.get('type'), 
            data.get('currency'), 
            data.get('institution'), 
            data.get('metadata')
        )
        
        return jsonify({'id': account_id, 'message': 'Account created successfully'}), 201
    except DatabaseError as e:
        logging.error("Database error creating account: %s", str(e))
        return jsonify({'message': 'Failed to create account'}), 500
    except Exception as e:
        logging.error("Error creating account: %s", str(e))
        return jsonify({'message': 'Failed to create account'}), 500

@finance_bp.route('/api/accounts/<int:account_id>', methods=['GET'])
@token_required
def get_account(current_user_id, account_id):
    """Get a specific account by ID."""
    try:
        account = get_user_account_by_id(current_user_id, account_id)
        if not account:
            return jsonify({'message': 'Account not found'}), 404
        return jsonify(account)
    except DatabaseError as e:
        logging.error("Database error fetching account: %s", str(e))
        return jsonify({'message': 'Failed to fetch account'}), 500
    except Exception as e:
        logging.error("Error fetching account: %s", str(e))
        return jsonify({'message': 'Failed to fetch account'}), 500

# --- ENTRIES ENDPOINTS ---

@finance_bp.route('/api/entries', methods=['GET'])
@token_required
def get_entries(current_user_id):
    """Get all entries for the current user."""
    try:
        entries = get_user_entries(current_user_id)
        return jsonify(entries)
    except DatabaseError as e:
        logging.error("Database error fetching entries: %s", str(e))
        return jsonify({'message': 'Failed to fetch entries'}), 500
    except Exception as e:
        logging.error("Error fetching entries: %s", str(e))
        return jsonify({'message': 'Failed to fetch entries'}), 500

@finance_bp.route('/api/entries', methods=['POST'])
@token_required
def create_entry(current_user_id):
    """Create a new entry for the current user."""
    try:
        data = request.get_json()
        if not data or 'amount' not in data or 'currency' not in data:
            return jsonify({'message': 'Amount and currency are required'}), 400
        
        entry_id = create_user_entry(
            current_user_id,
            data['amount'],
            data['currency'],
            data.get('from_account_id'),
            data.get('to_account_id'),
            data.get('category'),
            data.get('description'),
            data.get('notes')
        )
        
        return jsonify({'id': entry_id, 'message': 'Entry created successfully'}), 201
    except DatabaseError as e:
        logging.error("Database error creating entry: %s", str(e))
        return jsonify({'message': 'Failed to create entry'}), 500
    except Exception as e:
        logging.error("Error creating entry: %s", str(e))
        return jsonify({'message': 'Failed to create entry'}), 500

# --- INVESTMENTS ENDPOINTS ---

@finance_bp.route('/api/investments', methods=['GET'])
@token_required
def get_investments(current_user_id):
    """Get all investments for the current user."""
    try:
        investments = get_user_investments(current_user_id)
        return jsonify(investments)
    except DatabaseError as e:
        logging.error("Database error fetching investments: %s", str(e))
        return jsonify({'message': 'Failed to fetch investments'}), 500
    except Exception as e:
        logging.error("Error fetching investments: %s", str(e))
        return jsonify({'message': 'Failed to fetch investments'}), 500

@finance_bp.route('/api/investments', methods=['POST'])
@token_required
def create_investment(current_user_id):
    """Create a new investment for the current user."""
    try:
        data = request.get_json()
        if not data:
            return jsonify({'message': 'Investment data is required'}), 400
        
        investment_id = create_user_investment(
            current_user_id,
            data.get('account_id'),
            data.get('asset_type'),
            data.get('symbol'),
            data.get('quantity'),
            data.get('value'),
            data.get('currency')
        )
        
        return jsonify({'id': investment_id, 'message': 'Investment created successfully'}), 201
    except DatabaseError as e:
        logging.error("Database error creating investment: %s", str(e))
        return jsonify({'message': 'Failed to create investment'}), 500
    except Exception as e:
        logging.error("Error creating investment: %s", str(e))
        return jsonify({'message': 'Failed to create investment'}), 500

# --- BUDGETS ENDPOINTS ---

@finance_bp.route('/api/budgets', methods=['GET'])
@token_required
def get_budgets(current_user_id):
    """Get all budgets for the current user."""
    try:
        budgets = get_user_budgets(current_user_id)
        return jsonify(budgets)
    except DatabaseError as e:
        logging.error("Database error fetching budgets: %s", str(e))
        return jsonify({'message': 'Failed to fetch budgets'}), 500
    except Exception as e:
        logging.error("Error fetching budgets: %s", str(e))
        return jsonify({'message': 'Failed to fetch budgets'}), 500

@finance_bp.route('/api/budgets', methods=['POST'])
@token_required
def create_budget(current_user_id):
    """Create a new budget for the current user."""
    try:
        data = request.get_json()
        if not data or 'amount' not in data:
            return jsonify({'message': 'Budget amount is required'}), 400
        
        budget_id = create_user_budget(
            current_user_id,
            data['amount'],
            data.get('name'),
            data.get('category'),
            data.get('account_id'),
            data.get('period'),
            data.get('start_date'),
            data.get('end_date'),
            data.get('goal_type'),
            data.get('description')
        )
        
        return jsonify({'id': budget_id, 'message': 'Budget created successfully'}), 201
    except DatabaseError as e:
        logging.error("Database error creating budget: %s", str(e))
        return jsonify({'message': 'Failed to create budget'}), 500
    except Exception as e:
        logging.error("Error creating budget: %s", str(e))
        return jsonify({'message': 'Failed to create budget'}), 500

# --- TAGS ENDPOINTS ---

@finance_bp.route('/api/tags', methods=['GET'])
@token_required
def get_tags(current_user_id):
    """Get all tags for the current user."""
    try:
        tags = get_user_tags(current_user_id)
        return jsonify(tags)
    except DatabaseError as e:
        logging.error("Database error fetching tags: %s", str(e))
        return jsonify({'message': 'Failed to fetch tags'}), 500
    except Exception as e:
        logging.error("Error fetching tags: %s", str(e))
        return jsonify({'message': 'Failed to fetch tags'}), 500

@finance_bp.route('/api/tags', methods=['POST'])
@token_required
def create_tag(current_user_id):
    """Create a new tag for the current user."""
    try:
        data = request.get_json()
        if not data or 'name' not in data:
            return jsonify({'message': 'Tag name is required'}), 400
        
        tag_id = create_user_tag(current_user_id, data['name'])
        return jsonify({'id': tag_id, 'message': 'Tag created successfully'}), 201
    except DatabaseError as e:
        if 'already exists' in str(e):
            return jsonify({'message': str(e)}), 409
        logging.error("Database error creating tag: %s", str(e))
        return jsonify({'message': 'Failed to create tag'}), 500
    except Exception as e:
        logging.error("Error creating tag: %s", str(e))
        return jsonify({'message': 'Failed to create tag'}), 500

# --- ENTRY TAGS ENDPOINTS ---

@finance_bp.route('/api/entries/<int:entry_id>/tags', methods=['POST'])
@token_required
def add_entry_tag(current_user_id, entry_id):
    """Add a tag to an entry."""
    try:
        data = request.get_json()
        if not data or 'tag_id' not in data:
            return jsonify({'message': 'Tag ID is required'}), 400
        
        add_user_entry_tag(current_user_id, entry_id, data['tag_id'])
        return jsonify({'message': 'Tag added to entry successfully'}), 201
    except DatabaseError as e:
        if 'not found' in str(e):
            return jsonify({'message': str(e)}), 404
        logging.error("Database error adding entry tag: %s", str(e))
        return jsonify({'message': 'Failed to add tag to entry'}), 500
    except Exception as e:
        logging.error("Error adding entry tag: %s", str(e))
        return jsonify({'message': 'Failed to add tag to entry'}), 500

@finance_bp.route('/api/entries/<int:entry_id>/tags/<int:tag_id>', methods=['DELETE'])
@token_required
def remove_entry_tag(current_user_id, entry_id, tag_id):
    """Remove a tag from an entry."""
    try:
        remove_user_entry_tag(current_user_id, entry_id, tag_id)
        return jsonify({'message': 'Tag removed from entry successfully'})
    except DatabaseError as e:
        if 'not found' in str(e):
            return jsonify({'message': str(e)}), 404
        logging.error("Database error removing entry tag: %s", str(e))
        return jsonify({'message': 'Failed to remove tag from entry'}), 500
    except Exception as e:
        logging.error("Error removing entry tag: %s", str(e))
        return jsonify({'message': 'Failed to remove tag from entry'}), 500
