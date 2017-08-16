import { promisify } from 'util';

import HandlesClient from './Client';

import { ICommand, Trigger } from '../interfaces/ICommand';
import { IConfig } from '../interfaces/IConfig';

import fs = require('fs');
import path = require('path');

/**
 * Manage command loading.
 */
export default class CommandRegistry extends Map {
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

    this.handles.emit('commandsLoaded', { commands: this, failed });
    return this;
  }

  /**
   * Get all the file paths recursively in a directory.
   * @param dir The directory to start at.
   */
  private async _loadDir(dir: string): Promise<string[]> {
    const readdir = promisify(fs.readdir);
    const stat = promisify(fs.stat);

    const files = await readdir(dir);
    const list: string[] = [];

    return Promise.all(files.map((f) => {
      const currentPath = path.join(dir, f);

      return new Promise(async (resolve, reject) => {
        const stats = await stat(currentPath);

        if (stats.isFile() && path.extname(currentPath) === '.js') {
          list.push(currentPath);
        } else if (stats.isDirectory()) {
          const files = await this._loadDir(currentPath);
          list.push(...files);
        }

        resolve();
      }).catch(console.error); // tslint:disable-line no-console
    })).then(() => list);
  }
}
