#!/bin/bash
# Create a Python virtual environment in the current directory
python3 -m venv venv

# Activate the virtual environment (for bash/zsh)
echo "To activate the virtual environment, run:"
echo "source venv/bin/activate"

# Install Flask if requirements.txt exists, otherwise prompt user
echo "To install requirements, run:"
echo "pip install -r requirements.txt"
