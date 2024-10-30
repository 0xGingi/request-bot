const { Client, GatewayIntentBits, Events, REST, Routes, ApplicationCommandOptionType } = require('discord.js');
const fs = require('fs').promises;
const path = require('path');
require('dotenv').config();

class RequestBot {
    constructor() {
        if (!process.env.TOKEN || !process.env.ADMIN_ID) {
            throw new Error('Missing required environment variables (TOKEN or ADMIN_ID)');
        }

        this.client = new Client({
            intents: [
                GatewayIntentBits.Guilds,
                GatewayIntentBits.GuildMessages,
                GatewayIntentBits.DirectMessages,
            ]
        });

        this.adminId = process.env.ADMIN_ID;
        this.requests = {};
        this.statusEmojis = {
            pending: '⏳',
            'in progress': '🔄',
            fulfilled: '✅',
            rejected: '❌',
            delayed: '⏰'
        };

        this.client.on('error', this.handleError.bind(this));
        this.client.on(Events.ClientReady, this.onReady.bind(this));
        this.client.on(Events.InteractionCreate, this.handleInteraction.bind(this));

        this.loadRequests();
    }

    handleError(error) {
        console.error('Discord client error:', error);
    }

    async loadRequests() {
        try {
            const data = await fs.readFile('requests.json', 'utf-8');
            this.requests = JSON.parse(data);
        } catch (error) {
            if (error.code === 'ENOENT') {
                this.requests = {};
                await this.saveRequests();
            } else {
                console.error('Error loading requests:', error);
            }
        }
    }

    async saveRequests() {
        try {
            await fs.writeFile('requests.json', JSON.stringify(this.requests, null, 2));
        } catch (error) {
            console.error('Error saving requests:', error);
            throw error;
        }
    }

    async registerCommands() {
        const commands = [
            {
                name: 'request',
                description: 'Request a movie or TV show for Jellyfin/Plex',
                options: [{
                    name: 'title',
                    type: ApplicationCommandOptionType.String,
                    description: 'The title of the movie or TV show',
                    required: true
                }]
            },
            {
                name: 'status',
                description: 'Update the status of a request (Admin only)',
                options: [
                    {
                        name: 'request_id',
                        type: ApplicationCommandOptionType.String,
                        description: 'The ID of the request',
                        required: true
                    },
                    {
                        name: 'status',
                        type: ApplicationCommandOptionType.String,
                        description: 'New status for the request',
                        required: true,
                        choices: [
                            { name: 'In Progress', value: 'in progress' },
                            { name: 'Fulfilled', value: 'fulfilled' },
                            { name: 'Rejected', value: 'rejected' },
                            { name: 'Delayed', value: 'delayed' }
                        ]
                    }
                ]
            },
            {
                name: 'clear',
                description: 'Clear all requests with a specific status (Admin only)',
                options: [{
                    name: 'status',
                    type: ApplicationCommandOptionType.String,
                    description: 'Status of requests to clear',
                    required: true,
                    choices: [
                        { name: 'Pending', value: 'pending' },
                        { name: 'In Progress', value: 'in progress' },
                        { name: 'Fulfilled', value: 'fulfilled' },
                        { name: 'Rejected', value: 'rejected' },
                        { name: 'Delayed', value: 'delayed' }
                    ]
                }]
            },            
            {
                name: 'list',
                description: 'List all requests (Admin only)',
                options: [{
                    name: 'status',
                    type: ApplicationCommandOptionType.String,
                    description: 'Filter requests by status',
                    required: false,
                    choices: [
                        { name: 'Pending', value: 'pending' },
                        { name: 'In Progress', value: 'in progress' },
                        { name: 'Fulfilled', value: 'fulfilled' },
                        { name: 'Rejected', value: 'rejected' },
                        { name: 'Delayed', value: 'delayed' }
                    ]
                }]
            }
        ];

        const rest = new REST({ version: '10' }).setToken(process.env.TOKEN);

        try {
            await rest.put(Routes.applicationCommands(this.client.user.id), { body: commands });
        } catch (error) {
            console.error('Error registering commands:', error);
        }
    }

    async onReady() {
        console.log(`Bot is ready! Logged in as ${this.client.user.tag}`);
        await this.registerCommands();
    }

    async handleInteraction(interaction) {
        if (!interaction.isCommand()) return;

        switch (interaction.commandName) {
            case 'request':
                await this.handleRequest(interaction);
                break;
            case 'status':
                await this.handleStatus(interaction);
                break;
            case 'list':
                await this.handleList(interaction);
                break;
            case 'clear':
                await this.handleClear(interaction);
                break;
        }
    }

    async handleRequest(interaction) {
        try {
            const title = interaction.options.getString('title');
            const requestId = this.generateRequestId();

            this.requests[requestId] = {
                userId: interaction.user.id,
                username: interaction.user.username,
                title: title,
                status: 'pending',
                requestedAt: new Date().toISOString(),
            };

            await this.saveRequests();

            await interaction.reply({
                content: `Your request for **${title}** has been submitted! (ID: ${requestId})`,
                ephemeral: true
            });

            const admin = await this.client.users.fetch(this.adminId);
            await admin.send(`New request from ${interaction.user.username}:\n• Title: **${title}**\n• Request ID: \`${requestId}\``);
        } catch (error) {
            console.error('Error handling request:', error);
            await interaction.reply({
                content: 'An error occurred while processing your request. Please try again later.',
                ephemeral: true
            });
        }
    }

    async handleStatus(interaction) {
        try {
            if (interaction.user.id !== this.adminId) {
                await interaction.reply({
                    content: "You don't have permission to use this command.",
                    ephemeral: true
                });
                return;
            }

            const requestId = interaction.options.getString('request_id');
            const newStatus = interaction.options.getString('status');

            if (!this.requests[requestId]) {
                await interaction.reply({
                    content: "Invalid request ID.",
                    ephemeral: true
                });
                return;
            }

            const request = this.requests[requestId];
            request.status = newStatus;
            request.updatedAt = new Date().toISOString();
            await this.saveRequests();

            const requester = await this.client.users.fetch(request.userId);
            await requester.send(`Status update for your request **${request.title}**: ${this.statusEmojis[newStatus]} ${newStatus}`);

            await interaction.reply({
                content: `Request ${requestId} status updated to ${newStatus}.`,
                ephemeral: true
            });
        } catch (error) {
            console.error('Error handling status update:', error);
            await interaction.reply({
                content: 'An error occurred while updating the status. Please try again later.',
                ephemeral: true
            });
        }
    }

    async handleList(interaction) {
        try {
            if (interaction.user.id !== this.adminId) {
                await interaction.reply({
                    content: "You don't have permission to use this command.",
                    ephemeral: true
                });
                return;
            }

            const filterStatus = interaction.options.getString('status');
            const requests = Object.entries(this.requests)
                .filter(([_, req]) => !filterStatus || req.status === filterStatus)
                .map(([id, req]) => `${this.statusEmojis[req.status]} \`${id}\` **${req.title}** (by ${req.username})`);

            if (requests.length === 0) {
                await interaction.reply({
                    content: filterStatus ? `No requests with status: ${filterStatus}` : 'No requests found',
                    ephemeral: true
                });
                return;
            }

            const response = requests.join('\n');
            await interaction.reply({
                content: `**Requests${filterStatus ? ` (${filterStatus})` : ''}:**\n${response}`,
                ephemeral: true
            });
        } catch (error) {
            console.error('Error handling list:', error);
            await interaction.reply({
                content: 'An error occurred while listing requests. Please try again later.',
                ephemeral: true
            });
        }
    }

    async handleClear(interaction) {
        try {
            if (interaction.user.id !== this.adminId) {
                await interaction.reply({
                    content: "You don't have permission to use this command.",
                    ephemeral: true
                });
                return;
            }
    
            const statusToClear = interaction.options.getString('status');
            const initialCount = Object.keys(this.requests).length;
            
            this.requests = Object.fromEntries(
                Object.entries(this.requests).filter(([_, request]) => request.status !== statusToClear)
            );
            
            const clearedCount = initialCount - Object.keys(this.requests).length;
            await this.saveRequests();
    
            await interaction.reply({
                content: `Cleared ${clearedCount} request${clearedCount !== 1 ? 's' : ''} with status "${statusToClear}".`,
                ephemeral: true
            });
        } catch (error) {
            console.error('Error handling clear:', error);
            await interaction.reply({
                content: 'An error occurred while clearing requests. Please try again later.',
                ephemeral: true
            });
        }
    }    

    generateRequestId() {
        let requestId;
        do {
            requestId = Math.floor(Math.random() * 9000 + 1000).toString();
        } while (this.requests[requestId]);
        return requestId;
    }

    start() {
        this.client.login(process.env.TOKEN);
    }
}

const bot = new RequestBot();
bot.start();