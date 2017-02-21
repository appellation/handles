const fs = require('fs');
const EventEmitter = require('events').EventEmitter;
const path = require('path');
const clearRequire = require('clear-require');

/**
 * @typedef {Object|Function} Command - Structure of exported commands.  Can also be a single function.
 * @property {Iterable<Trigger>|Trigger} [triggers] - Defaults to the file name.
 * @property {boolean} [disabled=false] - Whether the command is globally disabled
 * @property {CommandExecutor} func - The command function to execute.
 * @property {CommandValidator} [validator] - Function to call to determine whether the command is valid.
 */

/**
 * @typedef {String|RegExp} Trigger - A command trigger.
 */

/**
 * @typedef {Object} Config - Structure of command handler options.
 * @property {Array<String>} [prefixes] - Prefixes to use, if any (automatically includes mentions).
 * @property {Boolean} [respond=false] - Whether to automatically output validation and command failure errors.
 * @property {String} [directory] - Where your command files are located; defaults to `./commands`
 * @property {MessageValidator} [validator] - Valid command forms (defaults to prefixed).
 * @property {boolean} [ignoreInvalid=true] - Whether to internally ignore invalid command errors.
 * @property {Function<ValidationProcessor>} ValidationProcessor - A reference to a validation processor that extends the internal one (uninstantiated).
 */

/**
 * @typedef {Function} MessageValidator - Function to determine if a message contains a command.
 * @param {Message} message
 * @returns {ResolvedContent}
 */

/**
 * @typedef {Function} CommandValidator - Validates whether a command is valid to be executed.
 * @param {ValidationProcessor} validator
 * @param {CommandMessage} message
 * @returns {*} - Evaluated for truthiness when determining validity.
 */

/**
 * @typedef {Function} CommandExecutor - Structure of any command execution functions.
 * @param {Response} response
 * @param {Message} message
 * @param {Array<String>} args
 * @param {CommandMessage} command
 * @returns {*} - The result of the command.
 */

/**
 * @typedef {String|null} ResolvedContent - Message content without any prefixes, null if invalid.
 */

/**
 * Manage command loading.
 *
 * @param {Config} config
 * @extends EventEmitter
 * @constructor
 */
class CommandLoader extends EventEmitter   {

    constructor(config = {}) {
        super();

        this.config = Object.assign({
            prefixes: [],
            directory: './commands'
        }, config);

        this.loadCommands();
    }

    /**
     * Load all commands into memory.  Use when reloading commands.
     *
     * @fires CommandLoader#commandsLoaded
     * @returns {Promise.<Map.<Trigger, Command>>}
     */
    loadCommands() {
        this.commands = new Map();
        return this._loadDir(this.config.directory).then(files => {
            const failed = [];
            for(const file of files)    {

                /**
                 * @type {Command}
                 */
                let mod;
                const location = path.join(process.cwd(), file);

                try {
                    clearRequire(location);
                    mod = require(location);
                }   catch(e)    {
                    failed.push(file);
                    console.error(e); // eslint-disable-line no-console
                    continue;
                }

                if (mod.disabled === true) continue;

                // if triggers are iterable
                if (mod.triggers && typeof mod.triggers[Symbol.iterator] === 'function' && typeof mod.triggers !== 'string' && !(mod.triggers instanceof RegExp)) {
                    for (const trigger of mod.triggers)  this.commands.set(trigger, mod);

                } else if (typeof mod === 'function') { // if a single function is exported
                    this.commands.set(path.basename(file, '.js'), {func: mod});
                } else if (typeof mod.triggers === 'undefined') {   // if no triggers are provided
                    this.commands.set(path.basename(file, '.js'), mod);
                } else  {
                    this.commands.set(mod.triggers, mod);
                }
            }

            /**
             * @event CommandLoader#commandsLoaded
             * @type {object}
             * @property {Map<Trigger, Command>} commands - Currently loaded commands.
             * @property {Array} failed - Directory listing of commands that failed to load.
             */
            this.emit('commandsLoaded', {commands: this.commands, failed});
        });
    }

    _loadDir(dir) {
        return new Promise((resolve, reject) => {
            fs.readdir(dir, (err, files) => {
                if(err) return reject(err);

                const loading = [];
                const list = [];

                for(const f of files) {
                    const currentPath = path.join(dir, f);

                    loading.push(
                        new Promise((resolve, reject) => {
                            fs.stat(currentPath, (err, stat) => {
                                if(err) return reject(err);

                                if(stat.isFile() && path.extname(currentPath) === '.js') {
                                    list.push(currentPath);
                                    resolve();
                                } else if(stat.isDirectory()) {
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