
const EventEmitter = require('events').EventEmitter;
const Response = require('./Response');
const ValidationProcessor = require('./ValidationProcessor');
const Prompter = require('./Prompter');

/**
 * A message to be processed as a command.
 *
 * @param {CommandLoader} loader
 * @param {Message} message
 * @param {String} [body]
 * @extends EventEmitter
 * @constructor
 */
class CommandMessage extends EventEmitter {

    constructor(command, message, content)    {
        super();

        /**
         * The command loader to use for commands.
         * @type {Command}
         */
        this.command = command;

        /**
         * The message that triggered this command.
         * @type {Message}
         */
        this.message = message;

        /**
         * The body of the command, as provided in the original message.
         * @type {String}
         */
        this.body = content;

        /**
         * The command arguments.  Delimited by space unless quoted.
         * @type {?Array<String>}
         */
        this.args = null;

        /**
         * The response object for this command.
         * @type {Response}
         */
        this.response = new Response(this.message);

        /**
         * The validator object for this command.
         * @type {ValidationProcessor}
         */
        this.validator = new (ValidationProcessor)(this);
    }

    /**
     * Parse the arguments of the command body.
     * @return {Array.<String>}
     */
    resolveArgs()   {
        if(!Array.isArray(this.args)) this.args = [];
        if(typeof this.command.arguments !== 'function') return Promise.resolve();
        return this._iterateArgs(this.command.arguments(), this.body);
    }

    _iterateArgs(generator, content, result = null) {
        const next = generator.next(result);
        if(next.done) {
            this.emit('argumentsLoaded', this.args);
            return;
        }

        const arg = next.value;
        const matched = arg.matcher(content);

        if(typeof matched !== 'string') {
            generator.throw(new Error('Argument matchers must return a string representing an argument segment.'));
            return;
        }

        return new Promise((resolve, reject) => {
            content = content.substring(matched.length).trim();
            const resolved = arg.resolver(matched, this.message);
            if(resolved === null) {
                if(arg.optional) { // if the resolver failed but the argument is optional, resolve with null
                    resolve(null);
                } else { // if the resolver failed and the argument is not optional, prompt
                    const prompter = new Prompter(new Response(this.message, false));
                    prompter.collectPrompt(arg, matched.length === 0).then(response => {
                        this.args.push(response);
                        resolve(response);
                    }).catch(reason => {
                        reject({argument: arg, reason });
                    });
                }
            } else {
                this.args.push(resolved);
                resolve(resolved);
            }
        }).then(value => {
            return this._iterateArgs(generator, content, value);
        }).catch(e => {
            generator.return(null);
            return Promise.reject(e);
        });
    }
}

module.exports = CommandMessage;
