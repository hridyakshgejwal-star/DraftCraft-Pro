FROM node:24-alpine
WORKDIR /app
RUN npm init -y && npm install --save-exact yjs@13.6.33 ws@8.22.0
COPY collaboration/server.mjs /app/server.mjs
USER node
ENV HOST=0.0.0.0 PORT=8787 DRAFTCRAFT_COLLAB_DATA=/data
EXPOSE 8787
CMD ["node","server.mjs"]
