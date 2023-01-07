# Start from my Node.js image
FROM ghcr.io/viral32111/nodejs:18

# Configure the project directory
ARG LIVECHAT_DIRECTORY=/usr/local/livechat

# Create the project directory
RUN mkdir --verbose --parents ${LIVECHAT_DIRECTORY} && \
	chown --changes --recursive ${USER_ID}:${USER_ID} ${LIVECHAT_DIRECTORY}

# Add the server project files
COPY --chown=${USER_ID}:${USER_ID} ./server/package.json ${LIVECHAT_DIRECTORY}/package.json
COPY --chown=${USER_ID}:${USER_ID} ./server/package-lock.json ${LIVECHAT_DIRECTORY}/package-lock.json

# Add the server & client code
COPY --chown=${USER_ID}:${USER_ID} ./server/dist/ ${LIVECHAT_DIRECTORY}/dist/
COPY --chown=${USER_ID}:${USER_ID} ./client/ ${LIVECHAT_DIRECTORY}/client/

# Add the default production environment variables file
COPY --chown=${USER_ID}:${USER_ID} ./server/production.env ${LIVECHAT_DIRECTORY}/production.env

# Switch to the regular user in the project directory
USER ${USER_ID}:${USER_ID}
WORKDIR ${LIVECHAT_DIRECTORY}

# Install production dependencies
RUN npm clean-install --omit=dev

# Start project in current directory
CMD [ "/usr/local/livechat" ]
