import HandlesClient from './Client';

import { ICommand, Trigger } from './interfaces/ICommand';
import { IConfig } from './interfaces/IConfig';

import fs = require('fs');
import EventEmitter = require('events');
import path = require('path');
import clearRequire = require('clear-require');

/**
 * Manage command loading.
 * @param {HandlesClient} client - Handles client.
 * @extends {EventEmitter}
 * @constructor
 */
export default class CommandLoader extends EventEmitter {

  public client: HandlesClient;
  public commands: Map<Trigger, ICommand>;

  constructor(client: HandlesClient) {
    super();

    /**
     * Handles client.
     * @type {HandlesClient}
     */
    this.client = client;

    this.loadCommands();
  }

  get config(): IConfig {
    return this.client.config;
  }

  /**
   * Load all commands into memory.  Use when reloading commands.
   *
   * @fires CommandLoader#commandsLoaded
   * @returns {Promise.<Map.<Trigger, Command>>}
   */
  public loadCommands(): Promise<Map<Trigger, ICommand>> {
    /**
     * Currently loaded commands.
     * @type {Map<Trigger, Command>}
     */
    this.commands = new Map();
    return this._loadDir(this.config.directory).then((files) => {
      const failed = [];
      for (const file of files) {

        /**
         * @type {Command}
         */
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

      /**
       * @event HandlesClient#commandsLoaded
       * @type {Object}
       * @property {Map<Trigger, Command>} commands - Currently loaded commands.
       * @property {Array} failed - Directory listing of commands that failed to load.
       */
      this.client.emit('commandsLoaded', { commands: this.commands, failed });
      return this.commands;
    });
  }

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
