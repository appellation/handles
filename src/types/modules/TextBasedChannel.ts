import { TextChannel, DMChannel, GroupDMChannel } from 'discord.js';

export type TextBasedChannel = TextChannel | DMChannel | GroupDMChannel;
