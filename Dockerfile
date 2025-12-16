# Build stage: install deps and compile Angular app
FROM node:18-alpine AS build

WORKDIR /app

COPY package*.json ./
RUN npm ci --legacy-peer-deps --cache /tmp/npm-cache --prefer-offline --no-progress \
    && npm cache clean --force \
    && rm -rf /tmp/npm-cache

COPY . .

# Increase Node memory during Angular build to avoid OOM in constrained Docker environments
ENV NODE_OPTIONS=--max_old_space_size=4096
RUN npm run build -- --configuration production

# Runtime stage: serve with nginx
FROM nginx:1.25-alpine

COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist/visualizer /usr/share/nginx/html/visualizer

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
