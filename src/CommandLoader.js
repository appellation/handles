
const fsX = require('fs-extra');
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
 * @returns {ValidationProcessor|boolean|Promise|string}
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

        this.config = config;
        if(!this.config.prefixes) this.config.prefixes = [];
        if(!this.config.directory) this.config.directory = './commands';

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
        return new Promise((resolve, reject) => {
            const files = [];
            const walker = fsX.walk(this.config.directory);

            walker.on('data', (data) => {
                if(data.stats.isFile() && path.extname(data.path) === '.js') files.push(data.path);
            });

            walker.on('errors', err => reject(err));
            walker.on('end', () => resolve(files));
        }).then(files => {
            const failed = [];
            for(const file of files)    {

                /**
                 * @type {Command}
                 */
                let mod;

                try {
                    clearRequire(file);
                    mod = require(file);
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
}

module.exports = CommandLoader;