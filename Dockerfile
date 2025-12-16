# Build Angular app
FROM node:18-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci --legacy-peer-deps
COPY . .
ENV NODE_OPTIONS=--max_old_space_size=4096
RUN npm run build -- --configuration production

# Serve with nginx
FROM nginx:1.25-alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist/visualizer /usr/share/nginx/html/visualizer
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
