import { MessageValidator } from './MessageValidator';
import Response from '../Response';

export type Config = {
  prefixes: Set<string>,
  argsSuffix: string,
  userID: string,
  directory: string,
  validator: MessageValidator,
  Response: typeof Response,
};
