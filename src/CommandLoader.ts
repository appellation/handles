import HandlesClient from './Client';

import { ICommand, Trigger } from './interfaces/ICommand';

import clearRequire = require('clear-require');
import fs = require('fs');
import path = require('path');

/**
 * Manage command loading.
 */
export default class CommandLoader {
  /**
   * Handles client.
   */
  public readonly client: HandlesClient;

  /**
   * Loaded commands.
   */
  public readonly commands: Map<Trigger, ICommand> = new Map();

  constructor(client: HandlesClient) {
    this.client = client;

    this.loadCommands();
  }

  /**
   * Load all commands into memory.  Use when reloading commands.
   */
  public loadCommands(): Promise<Map<Trigger, ICommand>> {
    this.commands.clear();
    return this._loadDir(this.client.config.directory || './commands').then((files) => {
      const failed = [];
      for (const file of files) {
        let mod: ICommand;
        const location = path.resolve(process.cwd(), file);

        try {
          clearRequire(location);
          mod = require(location);
        } catch (e) {
          failed.push(file);
          console.error(e); // tslint:disable-line no-console
          continue;
        }

        if (mod.disabled === true) continue;

        // if triggers are iterable
        if (Array.isArray(mod.triggers)) {
          for (const trigger of mod.triggers) this.commands.set(trigger, mod);
        } else if (typeof mod.triggers === 'undefined') { // if no triggers are provided
          this.commands.set(path.basename(file, '.js'), mod);
        } else {
          this.commands.set(mod.triggers, mod);
        }
      }

      this.client.emit('commandsLoaded', { commands: this.commands, failed });
      return this.commands;
    });
  }

  /**
   * Get all the file paths recursively in a directory.
   * @param dir The directory to start at.
   */
  private _loadDir(dir: string): Promise<string[]> {
    return new Promise((resolve, reject) => {
      fs.readdir(dir, (err, files) => {
        if (err) return reject(err);

        const loading: Array<Promise<void | {}>> = [];
        const list: string[] = [];

        for (const f of files) {
          const currentPath = path.join(dir, f);

          loading.push(
            new Promise((resolve, reject) => {
              fs.stat(currentPath, (err, stat) => {
                if (err) return reject(err);

                if (stat.isFile() && path.extname(currentPath) === '.js') {
                  list.push(currentPath);
                  resolve();
                } else if (stat.isDirectory()) {
                  this._loadDir(currentPath).then((files) => {
                    list.push(...files);
                    resolve();
                  });
                } else {
                  resolve();
                }
              });
            }).catch(console.error), // tslint:disable-line no-console
          );
        }
        return Promise.all(loading).then(() => resolve(list));
      });
    });
  }
}
