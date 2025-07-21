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
    calculate_account_balance, get_account_balance_history,
    get_user_accounts_with_balances, update_user_account, delete_user_account,
    get_transactions_with_search, get_transaction_categories, create_transaction,
    update_transaction, delete_transaction, get_spending_by_category,
    get_finance_last_updated, update_finance_metadata,
    DatabaseError
)

# Create Blueprint
finance_bp = Blueprint('finance', __name__)

# --- CACHE MANAGEMENT ENDPOINTS ---

@finance_bp.route('/api/finance/timestamp', methods=['GET'])
@token_required
def get_finance_timestamp(current_user_id):
    """Get current user's finance data timestamp for cache validation."""
    try:
        timestamp = get_finance_last_updated(current_user_id)
        if timestamp:
            return jsonify({'last_updated': timestamp}), 200
        else:
            # No data yet, trigger metadata creation
            update_finance_metadata(current_user_id)
            timestamp = get_finance_last_updated(current_user_id)
            return jsonify({'last_updated': timestamp}), 200
    except Exception as e:
        logging.error("Error fetching finance timestamp: %s", str(e))
        return jsonify({'message': 'Failed to fetch timestamp'}), 500

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

@finance_bp.route('/api/accounts/<int:account_id>', methods=['PUT'])
@token_required
def update_account(current_user_id, account_id):
    """Update a specific account."""
    try:
        data = request.get_json()
        if not data:
            return jsonify({'message': 'No data provided'}), 400
        
        success = update_user_account(
            current_user_id, 
            account_id,
            name=data.get('name'),
            account_type=data.get('type'),
            currency=data.get('currency'),
            institution=data.get('institution'),
            metadata=data.get('metadata')
        )
        
        if success:
            return jsonify({'message': 'Account updated successfully'}), 200
        else:
            return jsonify({'message': 'Failed to update account'}), 400
            
    except DatabaseError as e:
        logging.error("Database error updating account: %s", str(e))
        return jsonify({'message': str(e)}), 404 if 'not found' in str(e).lower() else 500
    except Exception as e:
        logging.error("Error updating account: %s", str(e))
        return jsonify({'message': 'Failed to update account'}), 500

@finance_bp.route('/api/accounts/<int:account_id>', methods=['DELETE'])
@token_required
def delete_account(current_user_id, account_id):
    """Delete a specific account."""
    try:
        success = delete_user_account(current_user_id, account_id)
        
        if success:
            return jsonify({'message': 'Account deleted successfully'}), 200
        else:
            return jsonify({'message': 'Failed to delete account'}), 400
            
    except DatabaseError as e:
        logging.error("Database error deleting account: %s", str(e))
        return jsonify({'message': str(e)}), 400 if 'transactions exist' in str(e) else 404
    except Exception as e:
        logging.error("Error deleting account: %s", str(e))
        return jsonify({'message': 'Failed to delete account'}), 500

@finance_bp.route('/api/accounts/summary', methods=['GET'])
@token_required
def get_accounts_summary(current_user_id):
    """Get all accounts with current balances."""
    try:
        accounts = get_user_accounts_with_balances(current_user_id)
        return jsonify(accounts)
    except DatabaseError as e:
        logging.error("Database error fetching accounts summary: %s", str(e))
        return jsonify({'message': 'Failed to fetch accounts summary'}), 500
    except Exception as e:
        logging.error("Error fetching accounts summary: %s", str(e))
        return jsonify({'message': 'Failed to fetch accounts summary'}), 500

@finance_bp.route('/api/accounts/<int:account_id>/balance', methods=['GET'])
@token_required
def get_account_balance(current_user_id, account_id):
    """Get current balance for a specific account."""
    try:
        balance = calculate_account_balance(current_user_id, account_id)
        return jsonify({'account_id': account_id, 'balance': balance})
    except DatabaseError as e:
        logging.error("Database error calculating balance: %s", str(e))
        return jsonify({'message': str(e)}), 404 if 'not found' in str(e).lower() else 500
    except Exception as e:
        logging.error("Error calculating balance: %s", str(e))
        return jsonify({'message': 'Failed to calculate balance'}), 500

@finance_bp.route('/api/accounts/<int:account_id>/balance/history', methods=['GET'])
@token_required
def get_balance_history(current_user_id, account_id):
    """Get balance history for a specific account."""
    try:
        # Get days parameter from query string (default 30)
        days = request.args.get('days', 30, type=int)
        if days < 1 or days > 365:
            return jsonify({'message': 'Days must be between 1 and 365'}), 400
        
        history = get_account_balance_history(current_user_id, account_id, days)
        return jsonify({'account_id': account_id, 'history': history})
    except DatabaseError as e:
        logging.error("Database error fetching balance history: %s", str(e))
        return jsonify({'message': str(e)}), 404 if 'not found' in str(e).lower() else 500
    except Exception as e:
        logging.error("Error fetching balance history: %s", str(e))
        return jsonify({'message': 'Failed to fetch balance history'}), 500

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
        if not data or 'amount' not in data:
            return jsonify({'message': 'Amount is required'}), 400
        
        # Use the comprehensive transaction creation function
        entry_id = create_transaction(current_user_id, data)
        
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

# --- ADVANCED TRANSACTION ENDPOINTS ---

@finance_bp.route('/api/entries/search', methods=['GET'])
@token_required
def search_transactions(current_user_id):
    """Search and filter transactions with advanced parameters."""
    try:
        search_params = {}
        
        # Extract search parameters from query string
        if request.args.get('category'):
            search_params['category'] = request.args.get('category')
        if request.args.get('entry_type'):
            search_params['entry_type'] = request.args.get('entry_type')
        if request.args.get('status'):
            search_params['status'] = request.args.get('status')
        if request.args.get('description'):
            search_params['description'] = request.args.get('description')
        if request.args.get('amount_min'):
            search_params['amount_min'] = float(request.args.get('amount_min'))
        if request.args.get('amount_max'):
            search_params['amount_max'] = float(request.args.get('amount_max'))
        if request.args.get('date_from'):
            search_params['date_from'] = request.args.get('date_from')
        if request.args.get('date_to'):
            search_params['date_to'] = request.args.get('date_to')
        if request.args.get('account_id'):
            search_params['account_id'] = int(request.args.get('account_id'))
        if request.args.get('limit'):
            search_params['limit'] = int(request.args.get('limit'))
        if request.args.get('offset'):
            search_params['offset'] = int(request.args.get('offset'))
        
        transactions = get_transactions_with_search(current_user_id, search_params)
        return jsonify(transactions)
        
    except ValueError as e:
        return jsonify({'message': 'Invalid parameter format'}), 400
    except DatabaseError as e:
        logging.error("Database error searching transactions: %s", str(e))
        return jsonify({'message': 'Failed to search transactions'}), 500
    except Exception as e:
        logging.error("Error searching transactions: %s", str(e))
        return jsonify({'message': 'Failed to search transactions'}), 500

@finance_bp.route('/api/entries/categories', methods=['GET'])
@token_required
def get_categories(current_user_id):
    """Get all transaction categories used by the user."""
    try:
        categories = get_transaction_categories(current_user_id)
        return jsonify(categories)
    except DatabaseError as e:
        logging.error("Database error fetching categories: %s", str(e))
        return jsonify({'message': 'Failed to fetch categories'}), 500
    except Exception as e:
        logging.error("Error fetching categories: %s", str(e))
        return jsonify({'message': 'Failed to fetch categories'}), 500

@finance_bp.route('/api/entries', methods=['PUT'])
@finance_bp.route('/api/entries/<int:entry_id>', methods=['PUT'])
@token_required
def update_entry(current_user_id, entry_id=None):
    """Update an existing transaction."""
    try:
        data = request.get_json()
        if not data:
            return jsonify({'message': 'Request data is required'}), 400
        
        # Get entry_id from URL parameter or request data
        if entry_id is None and 'id' in data:
            entry_id = data['id']
        
        if not entry_id:
            return jsonify({'message': 'Transaction ID is required'}), 400
        
        success = update_transaction(current_user_id, entry_id, data)
        if success:
            return jsonify({'message': 'Transaction updated successfully'})
        else:
            return jsonify({'message': 'Failed to update transaction'}), 500
            
    except DatabaseError as e:
        if 'not found' in str(e):
            return jsonify({'message': str(e)}), 404
        logging.error("Database error updating transaction: %s", str(e))
        return jsonify({'message': 'Failed to update transaction'}), 500
    except Exception as e:
        logging.error("Error updating transaction: %s", str(e))
        return jsonify({'message': 'Failed to update transaction'}), 500

@finance_bp.route('/api/entries/<int:entry_id>', methods=['DELETE'])
@token_required
def delete_entry(current_user_id, entry_id):
    """Delete a transaction."""
    try:
        success = delete_transaction(current_user_id, entry_id)
        if success:
            return jsonify({'message': 'Transaction deleted successfully'})
        else:
            return jsonify({'message': 'Failed to delete transaction'}), 500
            
    except DatabaseError as e:
        if 'not found' in str(e):
            return jsonify({'message': str(e)}), 404
        logging.error("Database error deleting transaction: %s", str(e))
        return jsonify({'message': 'Failed to delete transaction'}), 500
    except Exception as e:
        logging.error("Error deleting transaction: %s", str(e))
        return jsonify({'message': 'Failed to delete transaction'}), 500

@finance_bp.route('/api/entries/bulk', methods=['POST'])
@token_required
def bulk_create_entries(current_user_id):
    """Create multiple transactions at once."""
    try:
        data = request.get_json()
        if not data or 'transactions' not in data:
            return jsonify({'message': 'Transactions array is required'}), 400
        
        results = []
        for transaction in data['transactions']:
            try:
                transaction_id = create_transaction(current_user_id, transaction)
                results.append({'success': True, 'id': transaction_id})
            except Exception as e:
                results.append({'success': False, 'error': str(e)})
        
        return jsonify({'results': results})
        
    except Exception as e:
        logging.error("Error creating bulk transactions: %s", str(e))
        return jsonify({'message': 'Failed to create bulk transactions'}), 500

@finance_bp.route('/api/analytics/spending', methods=['GET'])
@token_required
def get_spending_analysis(current_user_id):
    """Get spending analysis by category."""
    try:
        date_range = {}
        if request.args.get('start_date'):
            date_range['start_date'] = request.args.get('start_date')
        if request.args.get('end_date'):
            date_range['end_date'] = request.args.get('end_date')
        
        analysis = get_spending_by_category(current_user_id, date_range or None)
        return jsonify(analysis)
        
    except DatabaseError as e:
        logging.error("Database error getting spending analysis: %s", str(e))
        return jsonify({'message': 'Failed to get spending analysis'}), 500
    except Exception as e:
        logging.error("Error getting spending analysis: %s", str(e))
        return jsonify({'message': 'Failed to get spending analysis'}), 500
