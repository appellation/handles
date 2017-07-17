import Response from '../Response';
import { MessageValidator } from '../types/MessageValidator';

export interface IConfig {
  prefixes: Set<string>;
  argsSuffix: string;
  userID: string;
  directory: string;
  validator: MessageValidator;
  Response: typeof Response;
}
