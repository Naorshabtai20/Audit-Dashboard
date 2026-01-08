# Build stage
FROM node:18-alpine AS build
WORKDIR /app

# Install dependencies (prefer npm ci for reproducible installs)
COPY package*.json ./
RUN npm ci --silent

# Copy source and build
COPY . .
RUN npm run build

# Production stage - serve with nginx
FROM nginx:stable-alpine
# Remove default nginx static content
RUN rm -rf /usr/share/nginx/html/*
# Copy built React app
COPY --from=build /app/build /usr/share/nginx/html
# Replace default nginx config with our SPA-friendly config
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 8080
CMD ["nginx", "-g", "daemon off;"]
