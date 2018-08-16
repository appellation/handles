import fs = require('fs');
import path = require('path');
import { promisify } from 'tsubaki';

import Command, { ICommand, InstantiableCommand } from '../structures/Command';

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
   * Load all commands into memory.
   * @param directoryOrFile The directory or file location to load.
   */
  public async load(directoryOrFile: string): Promise<string[]> {
    this.clear();
    const stats = await stat(directoryOrFile);

    let files: string[];
    if (stats.isDirectory()) files = await Registry._loadDir(directoryOrFile);
    else if (stats.isFile()) files = [directoryOrFile];
    else throw new Error('unexpected command location type');

    const failed = [];
    for (const file of files) {
      let mod: InstantiableCommand | ICommand | { default: InstantiableCommand | ICommand };
      const location = path.resolve(process.cwd(), file);

      try {
        delete require.cache[require.resolve(location)];
        mod = require(location);
      } catch (e) {
        failed.push(file);
        continue;
      }

      if ('default' in mod) mod = mod.default;

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

    return failed;
  }
}
