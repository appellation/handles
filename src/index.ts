import Plugin from './core/Plugin';
import Registry from './core/Registry';

import Argument from './middleware/Argument';

import Command from './structures/Command';
import Context from './structures/Context';

import Error from './util/Error';
import Queue from './util/Queue';
import Runnable from './util/Runnable';

export default Registry;

export {
  Argument,
  Command,
  Context,
  Error,
  Plugin,
  Queue,
  Registry,
  Runnable,
};
