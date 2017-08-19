import { promisify } from 'tsubaki';

import HandlesClient from './Client';

import { ICommand, Trigger } from '../interfaces/Command';
import { IConfig } from '../interfaces/Config';

import fs = require('fs');
import path = require('path');

/**
 * Manage command loading.
 */
export default class CommandRegistry extends Map<Trigger, ICommand> {
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
  public async load(): Promise<Map<Trigger, ICommand>> {
    const start = Date.now();

    this.clear();
    const files = await this._loadDir(this.directory);

    const failed = [];
    for (const file of files) {
      let mod: ICommand;
      const location = path.resolve(process.cwd(), file);

      try {
        delete require.cache[require.resolve(location)];
        mod = require(location);
      } catch (e) {
        failed.push(file);
        console.error(e); // tslint:disable-line no-console
        continue;
      }

      if (mod.disabled === true) continue;

      // if triggers are iterable
      if (Array.isArray(mod.triggers)) {
        for (const trigger of mod.triggers) this.set(trigger, mod);
      } else if (typeof mod.triggers === 'undefined') { // if no triggers are provided
        this.set(path.basename(file, '.js'), mod);
      } else {
        this.set(mod.triggers, mod);
      }
    }

    this.handles.emit('commandsLoaded', { commands: this, failed, time: Date.now() - start });
    return this;
  }

  /**
   * Get all the file paths recursively in a directory.
   * @param dir The directory to start at.
   */
  private async _loadDir(dir: string): Promise<string[]> {
    const readdir: (dir: string) => Promise<string[]> = promisify(fs.readdir);
    const stat: (path: string) => Promise<fs.Stats> = promisify(fs.stat);

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
}
