# Use the official Node.js base image optimized for Apify Actors
FROM apify/actor-node:20

# Copy package.json and package-lock.json first to leverage Docker layer caching
COPY package*.json ./

# Install only production dependencies and clear npm cache to keep container light
RUN npm --quiet set progress=false \
    && npm install --omit=dev --omit=optional \
    && echo "Installed NPM packages:" \
    && (npm list --omit=dev --all || true) \
    && rm -rf ~/.npm

# Copy the rest of the application files
COPY . ./

# Command to run the Actor
CMD npm start --silent
