FROM node:20-alpine AS client-build
WORKDIR /client
COPY client/package*.json ./
RUN npm install
COPY client/ ./
ARG VITE_API_URL=/api
ENV VITE_API_URL=$VITE_API_URL
RUN npm run build

FROM nginx:1.27-alpine
COPY nginx/nginx.prod.conf /etc/nginx/conf.d/default.conf
COPY --from=client-build /client/dist /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]