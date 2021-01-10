FROM nginx:stable-alpine
RUN rm /etc/nginx/conf.d/*
ADD demo.conf /etc/nginx/conf.d/
ADD index.html /usr/share/nginx/html/