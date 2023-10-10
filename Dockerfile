# syntax=docker/dockerfile:1

# Start from Node.js
FROM node:20-alpine

# Use production mode
ENV NODE_ENV=production

# Copy the build artifact files
COPY --chown=1000:1000 . /app

# Switch to the normal user in the project directory
USER 1000:1000
WORKDIR /app

# Install production dependencies
RUN yarn install --prod --frozen-lockfile --non-interactive

# Configure the project
ENV EXPRESS_LISTEN_ADDRESS=0.0.0.0 \
	EXPRESS_LISTEN_PORT=5000 \
	EXPRESS_CLIENT_DIRECTORY=/app/client

# Publish the server port
EXPOSE 5000/tcp

# Launch the server
ENTRYPOINT [ "node" ]
CMD [ "/app/server" ]
