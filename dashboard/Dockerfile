FROM nginx:alpine

# Copy dashboard files to nginx html directory
COPY dashboard.html /usr/share/nginx/html/index.html
COPY dashboard.css /usr/share/nginx/html/dashboard.css
COPY dashboard.js /usr/share/nginx/html/dashboard.js

# Copy nginx configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
