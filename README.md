# Discord Request Bot

A Discord bot that manages media requests for Jellyfin/Plex servers. Users can request movies or TV shows, and administrators can manage these requests with various status updates.

## Features

- Users can request movies/TV shows using slash commands
- Admins receive DM notifications for new requests
- Admins can update request status (in progress, fulfilled, rejected, delayed)
- Users receive DM notifications when their request status changes
- Status tracking with visual indicators (emojis)
- Request listing with status filtering
- Persistent storage of requests using JSON
- Dockerized for easy deployment

## Prerequisites

- Docker or NodeJS
- Discord Bot Token
- Discord User ID (for admin)

## Setup

1. Clone the repository:
    ```bash
    git clone https://github.com/0xgingi/request-bot.git
    cd request-bot
    ```
2. Create a `.env` file and add your Discord bot token and admin user ID:
    ```bash
    TOKEN=your_discord_bot_token
    ADMIN_ID=your_discord_user_id
    ```
3. Create an empty requests.json file:
    ```json
    {}
    ```
4. Run the Docker container:
    ```bash
    ./run.sh
    ```

## Usage

### User Commands
- `/request <title>` - Request a movie or TV show

### Admin Commands
- `/status <request_id> <status>` - Update the status of a request
  - Available statuses: in progress, fulfilled, rejected, delayed
- `/list [status]` - List all requests, optionally filtered by status
  - Available filters: pending, in progress, fulfilled, rejected, delayed
- `/clear <status>` - Clear all requests with a specific status
## Status Indicators
- ⏳ Pending
- 🔄 In Progress
- ✅ Fulfilled
- ❌ Rejected
- ⏰ Delayed

## Manual Deployment

1. Clone the repository:
    ```bash
    git clone https://github.com/0xgingi/request-bot.git
    cd request-bot
    ```
2. Create a `.env` file and add your Discord bot token and admin user ID:
    ```bash
    TOKEN=your_discord_bot_token
    ADMIN_ID=your_discord_user_id
    ```
3. Create an empty requests.json file:
    ```json
    {}
    ```
4. Install Node Dependencies:
    ```bash
    npm install
    ```
5. Start the bot:
    ```bash
    npm start
    ```