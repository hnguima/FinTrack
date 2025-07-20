# Use official Python image
FROM python:3.11-slim

WORKDIR /app

COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

# Expose Flask default port
EXPOSE 5000

# Set environment variables for Flask (optional, not needed for direct python execution)
# ENV FLASK_APP=user_api.py
# ENV FLASK_RUN_HOST=0.0.0.0

# Run the app with python so ssl_context is used
CMD ["python", "user_api.py"]
