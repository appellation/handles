import Client from './core/Client';
import CommandHandler from './core/CommandHandler';
import CommandRegistry from './core/CommandRegistry';

import CommandMessage from './structures/CommandMessage';
import Prompter from './structures/Prompter';
import Response from './structures/Response';

import Argument from './middleware/Argument';
import Validator from './middleware/Validator';

export * from './interfaces/Command';
export * from './interfaces/Config';
export * from './interfaces/Middleware';

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
