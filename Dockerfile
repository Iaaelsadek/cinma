# Use Node.js LTS as base
FROM node:20-slim

# Install Python 3 and system dependencies
RUN apt-get update && apt-get install -y \
    python3 \
    python3-pip \
    python3-venv \
    git \
    && rm -rf /var/lib/apt/lists/*

# Create app directory
WORKDIR /app

# Install Python dependencies
# Copy backend requirements first to leverage caching
COPY backend/requirements.txt ./backend/requirements.txt
# Create a virtual environment to avoid system package conflicts
RUN python3 -m venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH"
RUN pip install --no-cache-dir -r backend/requirements.txt

# Install Node.js dependencies
COPY package*.json ./
RUN npm install --omit=dev --legacy-peer-deps

# Copy the rest of the application source code
COPY . .

# Set environment variables
ENV PYTHON_BIN=/opt/venv/bin/python
ENV PORT=3001
ENV NODE_ENV=production

# Expose the API port
EXPOSE 3001

# Start the server
CMD ["node", "server/index.js"]
