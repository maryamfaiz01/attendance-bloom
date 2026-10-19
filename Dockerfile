FROM node:20-alpine

# Hugging Face Spaces uses port 7860 by default
ENV PORT=7860
EXPOSE 7860

# Create non-root user (UID 1000 required by HF Spaces)
RUN addgroup -g 1000 nodeuser && \
    adduser -u 1000 -G nodeuser -s /bin/sh -D nodeuser

WORKDIR /app

# Copy dependency specifications
COPY package*.json ./
RUN npm install

# Copy full application code
COPY . .

# Ensure nodeuser has write permissions to database and uploads directory
RUN chown -R nodeuser:nodeuser /app

USER nodeuser

CMD ["npm", "start"]
