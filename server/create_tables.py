import mysql.connector

# Database connection
conn = mysql.connector.connect(
  host="localhost",
  user="your_username",
  password="your_password",
  database="your_database"
)

cursor = conn.cursor()

# Create table if not exists
create_table_query = """
CREATE TABLE IF NOT EXISTS finance_data (
  timestamp INT,
  code INT,
  description TEXT,
  entryGroup TEXT,
  value FLOAT,
  type ENUM('balance', 'investment', 'income', 'expense')
);
"""

cursor.execute(create_table_query)
conn.commit()

# Close the connection
cursor.close()


conn.close()