FROM node:16

ADD . /sweeper-defender
WORKDIR /sweeper-defender

RUN yarn

EXPOSE 3000

CMD ["yarn","start"]
