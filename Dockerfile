# Build stage
FROM node:18-alpine AS build
WORKDIR /app

# Install dependencies (prefer npm ci for reproducible installs)
COPY package*.json ./
RUN npm ci --silent

# Copy source and build (Vite outputs to /dist)
COPY . .
RUN npm run build

# Production stage - serve with nginx
FROM nginx:stable-alpine
# Remove default nginx static content
RUN rm -rf /usr/share/nginx/html/*
# Copy built Vite app (dist)
COPY --from=build /app/dist /usr/share/nginx/html
# Replace default nginx config with our SPA-friendly config
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 8080
CMD ["nginx", "-g", "daemon off;"]
