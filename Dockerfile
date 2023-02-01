# Start from my Node.js image
FROM ghcr.io/viral32111/nodejs:18

# Configure the project directory
ARG MATRIXBOT_DIRECTORY=/usr/local/matrix-bot

# Create the project directory
RUN mkdir --verbose --parents ${MATRIXBOT_DIRECTORY} && \
	chown --changes --recursive ${USER_ID}:${USER_ID} ${MATRIXBOT_DIRECTORY}

# Add the project files & code
COPY --chown=${USER_ID}:${USER_ID} ./package.json ${MATRIXBOT_DIRECTORY}/package.json
COPY --chown=${USER_ID}:${USER_ID} ./package-lock.json ${MATRIXBOT_DIRECTORY}/package-lock.json
COPY --chown=${USER_ID}:${USER_ID} ./dist/ ${MATRIXBOT_DIRECTORY}/dist/

# Switch to the regular user, in the project directory
USER ${USER_ID}:${USER_ID}
WORKDIR ${MATRIXBOT_DIRECTORY}

# Install production dependencies
RUN npm clean-install --omit=dev

# Start project in current directory
CMD [ "/usr/local/matrix-bot" ]
