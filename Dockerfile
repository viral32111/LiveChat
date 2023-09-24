# syntax=docker/dockerfile:1

# Start from Node.js
FROM node:20

# Copy the project files
COPY --chown=0:0 . /app

# Switch to the project directory
WORKDIR /app

# Install production dependencies
RUN npm clean-install --omit=dev

# Configure the defaults
ENV NODE_ENV=production \
	HTTP_SERVER_ADDRESS=0.0.0.0 \
	HTTP_SERVER_PORT=5000 \
	EXPRESS_CLIENT_DIRECTORY=/app/client

# Publish the server port
EXPOSE 5000/tcp

# Launch the server
ENTRYPOINT [ "node" ]
CMD [ "/app/server" ]
