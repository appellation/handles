import Context from '../structures/Context';
import { InstantiablePlugin } from './Plugin';

export default abstract class Handler extends Array<InstantiablePlugin> {
  public async run(context: Context) {
    for (const Plugin of this) await new Plugin(context);
  }
}
