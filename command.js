/**
 * Created by Will on 12/15/2016.
 */

const fsX = require('fs-extra');
const EventEmitter = require('events');
const path = require('path');

const NotACommandError = require('./errors/NotACommand');
const InvalidCommandError = require('./errors/InvalidCommand');

/**
 * @typedef {Object|Function} Command - Structure of exported commands
 * @property {Iterable<String|RegExp>|String|RegExp} triggers
 * @property {boolean} [disabled] - Whether the command is globally disabled
 * @property {CommandExecutor} func - The command function to execute.
 * @property {Validator} [validator] - Function to call to determine whether the command is valid.
 * @property {boolean} [respond] - Whether to automatically send the CommandExecutor response to the channel the command was sent in.
 */

/**
 * @typedef {Object} Config - Structure of handler configuration.
 * @property {Array<String>} [prefixes]
 * @property {String} [directory] - Where your commands are located; defaults to `./commands`
 * @property {Validator} [validator] - Valid command forms (defaults to prefixed).
 * @property {boolean} [respond] - Whether to automatically send the CommandExecutor response to the channel the command was sent in.
 * @property {boolean} [ignoreInvalid] - Whether to internally ignore invalid command errors.
 */

/**
 * @typedef {Function} Validator - Structure of any validator functions.
 * @param {Message} message
 * @param {Array} [args] - Args are only passed to command-level validators.
 * @returns {ResolvedContent} - Message content without any prefixes, null if invalid
 */

/**
 * @typedef {Function} CommandExecutor - Structure of any command execution functions.
 * @param {Message} message
 * @param {Array} args
 * @returns {*}
 */

/**
 * @typedef {String|null} ResolvedContent
 */

class CommandHandler extends EventEmitter   {

    /**
     * @constructor
     * @param {Config} config
     */
    constructor(config = {}) {
        super();

        this.config = config;
        if(!this.config.prefixes) this.config.prefixes = [];
        if(!this.config.directory) this.config.directory = './commands';

        this.loadCommands();
    }

    /**
     * Handle commands.
     *
     * @param {Message} message
     * @param {String} [body]
     * @fires CommandHandler#commandStarted
     * @fires CommandHandler#commandFinished
     * @returns {Promise.<*>}
     */
    handle(message, body) {

        return new Promise((resolve, reject) => {
            if(message.author.bot) return reject(null);

            let content = body || this.resolvePrefix(message);
            return content ? resolve(content) : reject(content);
        }).then(resolved => {
            this.resolvedContent = resolved;

            const cmd = this.fetchCommand(resolved, message);
            if(!cmd.validator) return cmd;
            if(typeof cmd.validator !== 'function') throw new Error('validator is not a function');

            const valid = cmd.validator(message, CommandHandler._argumentify(this.trimmedContent));

            if(valid instanceof Promise)    {
                return valid.then(() => cmd).catch(reason => {
                    return Promise.reject(new InvalidCommandError(message, cmd, reason));
                });
            }   else if(typeof valid === 'boolean')    {
                return valid ? cmd : Promise.reject(new InvalidCommandError(message, cmd, 'Invalid command.'));
            }   else if(valid)  {
                return Promise.reject(new InvalidCommandError(message, cmd, valid));
            }   else    {
                return cmd;
            }

        }).then(cmd => {
            if(typeof cmd.func !== 'function') throw new Error('unable to execute command: no function provided');

            /**
             * @event EventEmitter#commandStarted
             * @type {Object}
             * @property {Message} message
             * @property {ResolvedContent} content
             * @property {Command} cmd
             */
            this.emit('commandStarted', { message, content: this.resolvedContent, cmd });

            return Promise.all([
                cmd,
                Promise.resolve(cmd.func(message, CommandHandler._argumentify(this.trimmedContent), this))
            ]);
        }).then(([cmd, result]) => {

            /**
             * @event EventEmitter#commandFinished
             * @type {Object}
             * @property {Message} message
             * @property {ResolvedContent} content
             * @property {Command} cmd
             * @property {*} result - The result of the command execution.
             */
            this.emit('commandFinished', { message, content: this.resolvedContent, cmd, result });

            if((this.config.respond || cmd.respond) && (typeof result === 'string' || typeof result === 'number')) message.channel.sendMessage(result).catch(() => null);
            return result;
        }).catch(err => {
            if(!err) return;
            if((typeof this.config.ignoreInvalid === 'undefined' || this.config.ignoreInvalid === true) && err instanceof NotACommandError) return;
            return Promise.reject(err);
        });
    }

    /**
     * @param {Message} message
     * @returns {ResolvedContent}
     */
    resolvePrefix(message) {
        if(this.config.validator && typeof this.config.validator === 'function')    {
            return this.config.validator(message);
        }   else    {

            this.config.prefixes.concat([ `<@${message.client.user.id}>`, `<@!${message.client.user.id}>` ]);
            for(const pref of this.config.prefixes) if(message.content.startsWith(pref)) return message.content.substring(pref.length).trim();
            return null;
        }
    }

    /**
     * Fetch a command from given content.
     *
     * @param {String} content - Should not contain prefixes
     * @param {Message} [message] - Only used for returning an error when no command is found.
     * @returns {Command|NotACommand}
     */
    fetchCommand(content, message)  {
        const split = content.trim().toLowerCase().split(' ');
        if(typeof split[0] === 'string' && this.commands.has([0])) {
            this.trimmedContent = split.slice(1).join(' ');
            return this.commands.get(split[0]);
        }

        for(const [trigger, cmd] of this.commands)  {
            const regex = (trigger instanceof RegExp) ? trigger : new RegExp(`^${trigger}\\s*`, 'i');
            if(regex.test(content)) {
                this.trimmedContent = content.replace(regex, '').trim();
                return cmd;
            }
        }

        return new NotACommandError(message);
    }

    /**
     * Load all commands into memory.  Use when reloading commands.
     *
     * @fires CommandHandler#loaded
     * @returns {Promise.<Map.<String|RegExp, Command>>}
     */
    loadCommands() {
        this.commands = new Map();
        return new Promise((resolve, reject) => {
            const files = [];
            const walker = fsX.walk(this.config.directory);

            walker.on('data', (data) => {
                if(data.stats.isFile() && path.extname(data.path) === '.js') files.push(data.path);
            });

            walker.on('errors', err => {
                return reject(err);
            });

            walker.on('end', () => {
                return resolve(files);
            });
        }).then(files => {
            for(const file of files)    {

                /**
                 * @type {Command}
                 */
                const mod = require(file);
                if(mod.disabled === false && (mod.disabled !== true || typeof mod.disabled !== 'undefined')) continue;

                if(mod.triggers && typeof mod.triggers[Symbol.iterator] === 'function' && typeof mod.triggers !== 'string' && !(mod.triggers instanceof RegExp))  {
                    for(const trigger of mod.triggers)  this._setModule(trigger, mod);

                }   else if(typeof mod === 'function')  {
                    this._setModule(path.basename(file, '.js'), { func: mod })
                }   else    {
                    this._setModule(mod.triggers, mod);
                }
            }

            /**
             * @event EventEmitter#loaded
             */
            this.emit('loaded');
        });
    }

    /**
     * Adds a module to the map.
     *
     * @param {String|RegExp} trigger
     * @param {Command} module
     * @private
     */
    _setModule(trigger, module)  {
        this.commands.set(trigger, module);
    }

    /**
     * Make a string into arguments.
     * @param {String} string
     * @returns {Array}
     * @private
     */
    static _argumentify(string)   {
        return string ? string.split(' ') : [];
    }
}

module.exports = CommandHandler;