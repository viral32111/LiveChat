# Live Chat

[![Automate](https://github.com/viral32111/LiveChat/actions/workflows/automate.yml/badge.svg?branch=main)](https://github.com/viral32111/LiveChat/actions/workflows/automate.yml)
[![CodeQL](https://github.com/viral32111/LiveChat/actions/workflows/codeql.yml/badge.svg)](https://github.com/viral32111/LiveChat/actions/workflows/codeql.yml)

This is a real-time, ephemeral, room-based chat system, housed in a dynamic & modern web application.  

**15/06/2023: The official deployment (https://livechat.viral32111.cf) is no longer running as I've ran out of free credit on Google Cloud Platform! You'll need to deploy this yourself or run it locally to use it.**

## Usage

There is a publicly deployed instance of this project running on [Google Cloud's Compute Engine](https://cloud.google.com/compute) virtual machines (although the database is hosted on [MongoDB Atlas](https://www.mongodb.com/atlas/database)). It is available at https://livechat.viral32111.cf.

Alternatively you can run it locally by using the official [Docker image](https://github.com/users/viral32111/packages/container/package/livechat). You will need to set all the required environment variables (see [production.env](Server/production.env)).

## Progress

See the [Kanban board](https://github.com/users/viral32111/projects/9), [issues](https://github.com/viral32111/LiveChat/issues?q=is%3Aissue) and [milestones](https://github.com/viral32111/LiveChat/milestones) for tracking the project's progress.

## Development

This assumes you have a MongoDB server already up and running.

* Clone this repository (`git clone https://github.com/viral32111/LiveChat.git`)
* Switch to the [server](Server/) directory (`cd ./Server`)
* Install production & development dependencies (`npm install`)
* Setup up `development.env` & `test.env` environment variables files (copy [production.env](Server/production.env) and configure appropriately).
* Run unit & integration tests (`npm test`).
* Start project (`npm start`)
