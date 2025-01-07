from flask import Flask, request, jsonify
import mysql.connector
from mysql.connector import Error
from datetime import datetime, timedelta, timezone
import calendar
import os

# Create Flask app
app = Flask(__name__)

# CORS configuration
from flask_cors import CORS
CORS(app)

# Database connection setup
db_host = "localhost"
db_user = "hngui"
db_password = "cube"
db_name = "fintrackdb"
db_port = 3306

# Establish the database connection pool
def get_db_connection():
    try:
        connection = mysql.connector.connect(
            host=db_host,
            user=db_user,
            password=db_password,
            database=db_name,
            port=db_port
        )
        if connection.is_connected():
            return connection
    except Error as e:
        print(f"Error: {e}")
        return None

# Function to get start and end dates
def get_start_and_end_dates():
    query = """
        SELECT 
            MIN(timestamp) AS minTimestamp, 
            MAX(timestamp) AS maxTimestamp 
        FROM entries
    """
    connection = get_db_connection()
    cursor = connection.cursor(dictionary=True)
    cursor.execute(query)
    result = cursor.fetchone()
    connection.close()

    min_timestamp = datetime.fromtimestamp(result['minTimestamp'], tz=timezone.utc)
    max_timestamp = datetime.fromtimestamp(result['maxTimestamp'], tz=timezone.utc)

    date_limits = {
        'minYear': min_timestamp.year,
        'minMonth': min_timestamp.month,
        'maxYear': max_timestamp.year,
        'maxMonth': max_timestamp.month
    }

    return date_limits

# Initialize date limits globally
date_limits = get_start_and_end_dates()

# Home route
@app.route('/')
def home():
    return "Welcome to my server!"

# Route to get entries for a specific month and year
@app.route('/entries', methods=['GET'])
def get_entries():
    month = int(request.args.get('month'))
    year = int(request.args.get('year'))

    if not month or not year or not month or not year or int(month) < 1 or int(month) > 12 or int(year) < 2000 or int(year) > datetime.now().year:
        return "Invalid month or year", 400

    try:
        start_date = datetime(year=int(year), month=int(month), day=1, tzinfo=timezone.utc)
        print(month)
        end_date = datetime(year=int(year), month=month, day=calendar.monthrange(year, month)[-1], tzinfo=timezone.utc) - timedelta(seconds=1)


        query = "SELECT * FROM entries WHERE timestamp BETWEEN %s AND %s"
        connection = get_db_connection()
        cursor = connection.cursor(dictionary=True)
        cursor.execute(query, (start_date.timestamp(), end_date.timestamp()))
        results = cursor.fetchall()
        connection.close()

        return jsonify(results)

    except Error as e:
        return str(e), 500

# Route to get the date limits
@app.route('/datelimits', methods=['GET'])
def get_date_limits():
    return jsonify(date_limits)

# Run the Flask app
if __name__ == '__main__':
    app.run(host='0.0.0.0', port=3001, threaded=True)
