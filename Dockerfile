# Start from Node.js
FROM node:18

# Configure the project directory
ARG LIVECHAT_DIRECTORY=/usr/local/livechat

# Create the project directory
RUN mkdir --verbose --parents ${LIVECHAT_DIRECTORY}

# Add the server project files
COPY ./server/package.json ${LIVECHAT_DIRECTORY}/package.json
COPY ./server/package-lock.json ${LIVECHAT_DIRECTORY}/package-lock.json

# Add the server & client code
COPY ./server/dist/ ${LIVECHAT_DIRECTORY}/dist/
COPY ./client/ ${LIVECHAT_DIRECTORY}/client/

# Add the default production environment variables file
COPY ./server/production.env ${LIVECHAT_DIRECTORY}/production.env

# Switch to the project directory
WORKDIR ${LIVECHAT_DIRECTORY}

# Install production dependencies
RUN npm clean-install --omit=dev

# Start project in current directory
CMD [ "/usr/local/livechat" ]
