import { Message } from 'discord.js';
import { promisify } from 'tsubaki';

import { IConfig } from '../interfaces/Config';
import Command, { Trigger } from '../structures/Command';
import HandlesClient from './Client';

import fs = require('fs');
import path = require('path');

const readdir: (dir: string) => Promise<string[]> = promisify(fs.readdir);
const stat: (path: string) => Promise<fs.Stats> = promisify(fs.stat);

/**
 * Manage command loading.
 */
export default class CommandRegistry extends Set<typeof Command> {

  /**
   * Get all the file paths recursively in a directory.
   * @param dir The directory to start at.
   */
  private static async _loadDir(dir: string): Promise<string[]> {
    const files = await readdir(dir);
    const list: string[] = [];

    await Promise.all(files.map(async (f) => {
      const currentPath = path.join(dir, f);
      const stats = await stat(currentPath);

      if (stats.isFile() && path.extname(currentPath) === '.js') {
        list.push(currentPath);
      } else if (stats.isDirectory()) {
        const files = await this._loadDir(currentPath);
        list.push(...files);
      }
    }));

    return list;
  }

  /**
   * Handles client.
   */
  public readonly handles: HandlesClient;

  /**
   * The directory from which to load commands.
   */
  public directory: string;

  constructor(handles: HandlesClient, config: IConfig) {
    super();

    this.handles = handles;
    this.directory = config.directory || './commands';

    this.load();
  }

  /**
   * Load all commands into memory.  Use when reloading commands.
   */
  public async load(): Promise<this> {
    const start = Date.now();

    this.clear();
    const files = await CommandRegistry._loadDir(this.directory);

    const failed = [];
    for (const file of files) {
      let mod: typeof Command;
      const location = path.resolve(process.cwd(), file);

      try {
        delete require.cache[require.resolve(location)];
        mod = require(location);
      } catch (e) {
        failed.push(file);
        console.error(e); // tslint:disable-line no-console
        continue;
      }

      this.add(mod);
    }

    this.handles.emit('commandsLoaded', { commands: this, failed, time: Date.now() - start });
    return this;
  }
}
