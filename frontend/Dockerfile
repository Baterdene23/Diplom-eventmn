FROM node:20-alpine

WORKDIR /app

# NEXT_PUBLIC_* variables are baked into the frontend bundle at build time.
ARG NEXT_PUBLIC_API_URL=http://127.0.0.1:3000
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL

# Install dependencies
COPY package*.json ./
RUN npm install

# Copy source code
COPY . .

# Build
RUN npm run build

EXPOSE 3000

CMD ["npm", "start"]
