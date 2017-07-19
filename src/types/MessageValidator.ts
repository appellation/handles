import { Message } from 'discord.js';

export type MessageValidator = (m: Message) => string | null;
