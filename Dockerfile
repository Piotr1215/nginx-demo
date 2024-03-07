FROM nginx:1.25.4-alpine3.18
RUN rm /etc/nginx/conf.d/*
ADD demo.conf /etc/nginx/conf.d/
ADD index.html /usr/share/nginx/html/