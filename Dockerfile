FROM nginx:1.27.3-alpine3.20
RUN rm /etc/nginx/conf.d/*
ADD demo.conf /etc/nginx/conf.d/
ADD index.html /usr/share/nginx/html/