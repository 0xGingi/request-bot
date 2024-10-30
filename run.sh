docker stop request-bot
docker rm request-bot
docker run -d --name request-bot --restart unless-stopped --env-file .env -v $(pwd)/requests.json:/app/requests.json 0xgingi/request-bot:latest