import fs = require('fs');
import path = require('path');
import { promisify } from 'tsubaki';

import Command, { ICommand, InstantiableCommand } from '../structures/Command';
import HandlesClient, { IConfig } from './Client';

const readdir: (dir: string) => Promise<string[]> = promisify(fs.readdir);
const stat: (path: string) => Promise<fs.Stats> = promisify(fs.stat);

/**
 * Manage command loading.
 */
export default class Registry extends Set<InstantiableCommand> {

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
  public readonly handles!: HandlesClient;

  constructor(handles: HandlesClient, config: IConfig) {
    super();
    Object.defineProperty(this, 'handles', { value: handles });
    this.load(config.directory || './commands');
  }

  /**
   * Load all commands into memory.
   * @param directory The directory to load.
   */
  public async load(directory: string): Promise<this> {
    const start = Date.now();

    this.clear();
    let files: string[];
    try {
      files = await Registry._loadDir(directory);
    } catch (e) {
      this.handles.emit('error', e);
      return this;
    }

    const failed = [];
    for (const file of files) {
      let mod: InstantiableCommand | ICommand;
      const location = path.resolve(process.cwd(), file);

      try {
        delete require.cache[require.resolve(location)];
        mod = require(location);
      } catch (e) {
        failed.push(file);
        this.handles.emit('error', e);
        continue;
      }

      // setup command to handle basic exports
      if (typeof mod !== 'function') {
        /* tslint:disable */
        class BasicCommand extends Command {
          public async exec() {
            throw new Error(`command ${(this.constructor as typeof BasicCommand).triggers} has no exec method`);
          }
        }
        /* tslint:enable */

        const descriptors = Object.getOwnPropertyDescriptors(mod);
        Object.defineProperties(BasicCommand.prototype, descriptors);
        mod = BasicCommand;
      }

      if (!mod.triggers) mod.triggers = path.basename(location, '.js');
      this.add(mod);
    }

    this.handles.emit('loaded', { commands: this, failed, time: Date.now() - start });
    return this;
  }
}
