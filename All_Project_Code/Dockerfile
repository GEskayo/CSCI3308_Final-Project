# Use Node.js LTS image
FROM node:lts

# Set the working directory in the container
WORKDIR /home/node/app

# Copy package.json and package-lock.json from the src directory
COPY src/package*.json ./

# Install dependencies
RUN npm install
RUN npm install multer

# Copy the rest of the app source code from the src directory
COPY src/ .

# Expose the port the app runs on
EXPOSE 3000

# Define the command to run the app
CMD ["node", "index.js"]
