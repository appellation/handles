const fs = require('fs');
const EventEmitter = require('events');
const path = require('path');
const clearRequire = require('clear-require');

/**
 * Manage command loading.
 * @param {Config} config - Configuration options for the command handler.
 * @extends {EventEmitter}
 * @constructor
 */
class CommandLoader extends EventEmitter {

  constructor(config = {}) {
    super();

    /**
     * Configuration for handles.
     * @type {Config}
     */
    this.config = config;

    this.loadCommands();
  }

  /**
   * Load all commands into memory.  Use when reloading commands.
   *
   * @fires CommandLoader#commandsLoaded
   * @returns {Promise.<Map.<Trigger, Command>>}
   */
  loadCommands() {
    /**
     * Currently loaded commands.
     * @type {Map<Trigger, Command>}
     */
    this.commands = new Map();
    return this._loadDir(this.config.directory).then(files => {
      const failed = [];
      for (const file of files) {

        /**
         * @type {Command}
         */
        let mod;
        const location = path.resolve(process.cwd(), file);

        try {
          clearRequire(location);
          mod = require(location);
        } catch (e) {
          failed.push(file);
          console.error(e); // eslint-disable-line no-console
          continue;
        }

        if (typeof mod === 'function') mod = new mod(this.config.commandParams);

        if (mod.disabled === true) continue;

        // if triggers are iterable
        if (mod.triggers && typeof mod.triggers[Symbol.iterator] === 'function' && typeof mod.triggers !== 'string' && !(mod.triggers instanceof RegExp)) {
          for (const trigger of mod.triggers) this.commands.set(trigger, mod);
        } else if (typeof mod.triggers === 'undefined') { // if no triggers are provided
          this.commands.set(path.basename(file, '.js'), mod);
        } else {
          this.commands.set(mod.triggers, mod);
        }
      }

      /**
       * @event CommandLoader#commandsLoaded
       * @type {Object}
       * @property {Map<Trigger, Command>} commands - Currently loaded commands.
       * @property {Array} failed - Directory listing of commands that failed to load.
       */
      this.emit('commandsLoaded', { commands: this.commands, failed });
    });
  }

  _loadDir(dir) {
    return new Promise((resolve, reject) => {
      fs.readdir(dir, (err, files) => {
        if (err) return reject(err);

        const loading = [];
        const list = [];

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
                  this._loadDir(currentPath).then(files => {
                    list.push(...files);
                    resolve();
                  });
                } else {
                  resolve();
                }
              });
            }).catch(console.error) // eslint-disable-line no-console
          );
        }
        return Promise.all(loading).then(() => resolve(list));
      });
    });
  }
}

module.exports = CommandLoader;
