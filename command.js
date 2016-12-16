/**
 * Created by Will on 12/15/2016.
 */

const fsX = require('fs-extra');
const EventEmitter = require('events');
const path = require('path');

const NotACommandError = require('./errors/NotACommand');
const InvalidCommandError = require('./errors/InvalidCommand');

/**
 * @typedef {Object} Command - Structure of exported commands
 * @property {Iterable<String|RegExp>|String|RegExp} triggers
 * @extends {StoredCommand}
 */

/**
 * @typedef {Object} StoredCommand - Structure of command map used internally.
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
 * @returns {TrimmedContent} - Message content without any prefixes, null if invalid
 */

/**
 * @typedef {Function} CommandExecutor - Structure of any command execution functions.
 * @param {Message} message
 * @param {Array} args
 * @returns {*}
 */

/**
 * @typedef {Promise<String|null>|String|null} TrimmedContent
 */

class CommandHandler extends EventEmitter   {

    /**
     * @constructor
     * @param {Config} config
     */
    constructor(config = {}) {
        super();
        this.config = config;
        this.commands = this.loadCommands();
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

            let content = body || this.trimPrefix(message);
            return content ? resolve(content) : reject(content);
        }).then(resolved => {
            this.resolvedContent = resolved;
            return this.fetchCommand(resolved, message);
        }).then(cmd => {

            if(!cmd.validator) return cmd;
            if(typeof cmd.validator !== 'function') throw new Error('validator is not a function');

            const valid = cmd.validator(message, this.resolvedContent.split(' ').slice(1));

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
             * @property {StoredCommand} cmd
             */
            this.emit('commandStarted', { content: this.resolvedContent, cmd });

            return Promise.all([
                cmd,
                Promise.resolve(cmd.func(message, this.resolvedContent.split(' ').slice(1)))
            ]);
        }).then(([cmd, result]) => {

            /**
             * @event EventEmitter#commandFinished
             * @type {Object}
             * @property {Message} message
             * @property {StoredCommand} cmd
             * @property {*} result - The result of the command execution.
             */
            this.emit('commandFinished', { content: this.resolvedContent, cmd, result });

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
     * @returns {TrimmedContent}
     */
    trimPrefix(message) {
        if(this.config.validator && typeof this.config.validator === 'function')    {
            return this.config.validator(message);
        }   else    {
            if(!this.config.prefixes || this.config.prefixes.length === 0) this.config.prefixes = [ `<@${message.client.user.id}>`, `<@!${message.client.user.id}>` ];

            for(const pref of this.config.prefixes) if(message.content.startsWith(pref)) return message.content.substring(pref.length).trim();
            return null;
        }
    }

    /**
     * Fetch a command from given content.
     * @param {String} content
     * @param {Message} message
     * @returns {Promise.<StoredCommand>}
     */
    fetchCommand(content, message)  {
        const split = content.split(' ');
        return this.commands.then(commands => {

            if(typeof split[0] === 'string' && commands.get(split[0])) return commands.get(split[0]);

            for(const cmd of commands.keys())  {
                if(cmd instanceof RegExp)   {
                    if(content.match(cmd)) return commands.get(cmd);

                }   else if(typeof cmd === 'string')    {
                    if(content.startsWith(cmd)) return commands.get(cmd);
                }
            }

            return Promise.reject(new NotACommandError(message));
        });
    }

    /**
     * Load all commands into memory.
     * @returns {Promise.<Map.<String|RegExp, StoredCommand>>}
     */
    loadCommands() {
        return new Promise((resolve, reject) => {
            const files = [];
            const walker = fsX.walk(this.config.directory || './commands');

            walker.on('data', (data) => {
                if(data.stats.isFile()) files.push(data.path);
            });

            walker.on('errors', err => {
                console.error(err);
                return reject(err);
            });

            walker.on('end', () => {
                return resolve(files);
            });
        }).then(files => {
            const contents = new Map();
            for(const file of files)    {

                /**
                 * @type {Command}
                 */
                const mod = require(file);

                if(mod.disabled === false && (mod.disabled !== true || typeof mod.disabled !== 'undefined')) continue;

                if(mod.triggers && typeof mod.triggers[Symbol.iterator] === 'function' && typeof mod.triggers !== 'string' && !(mod.triggers instanceof RegExp))  {
                    for(const trigger of mod.triggers)  CommandHandler._setModule(contents, trigger, mod);
                }   else if(typeof mod === 'function')  {
                    CommandHandler._setModule(contents, path.basename(file, '.js'), { func: mod })
                }   else    {
                    CommandHandler._setModule(contents, mod.triggers, mod);
                }
            }
            return contents;
        });
    }

    /**
     * Adds a module to the given map.
     *
     * @param {Map} map
     * @param {String|RegExp} trigger
     * @param {Object} module
     * @private
     */
    static _setModule(map, trigger, module)  {
        map.set(trigger, {
            func: module.func,
            validator: module.validator,
            respond: module.respond,
            disabled: module.disabled
        });
    }
}

module.exports = CommandHandler;