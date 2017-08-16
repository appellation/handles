import Client from './core/Client';
import CommandHandler from './core/CommandHandler';
import CommandRegistry from './core/CommandRegistry';

import CommandMessage from './structures/CommandMessage';
import Prompter from './structures/Prompter';
import Response from './structures/Response';

import Argument from './middleware/Argument';
import Validator from './middleware/Validator';

export * from './interfaces/ICommand';
export * from './interfaces/IConfig';
export * from './interfaces/IMiddleware';

export { MessageValidator } from './types/MessageValidator';

export {
  Argument,
  Client,
  CommandHandler,
  CommandRegistry,
  CommandMessage,
  Prompter,
  Response,
  Validator,
};
