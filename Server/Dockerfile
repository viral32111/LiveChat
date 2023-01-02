# Start from my Node.js image
FROM ghcr.io/viral32111/nodejs:18

# Configure the project directory
ARG LIVECHAT_DIRECTORY=/usr/local/livechat

# Create the project directory
RUN mkdir --verbose --parents ${LIVECHAT_DIRECTORY} && \
	chown --changes --recursive ${USER_ID}:${USER_ID} ${LIVECHAT_DIRECTORY}

# Add the server-side project files
COPY --chown=${USER_ID}:${USER_ID} ./package.json ${LIVECHAT_DIRECTORY}/package.json
COPY --chown=${USER_ID}:${USER_ID} ./package-lock.json ${LIVECHAT_DIRECTORY}/package-lock.json

# Add the server-side code
COPY --chown=${USER_ID}:${USER_ID} ./dist/ ${LIVECHAT_DIRECTORY}/dist/

# Switch to the regular user in the project directory
USER ${USER_ID}:${USER_ID}
WORKDIR ${LIVECHAT_DIRECTORY}

# Install production dependencies
RUN npm clean-install --omit=dev

# Start project in current directory
CMD [ "/usr/local/livechat" ]
