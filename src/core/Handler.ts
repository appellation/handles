import Context from '../structures/Context';
import { InstantiablePlugin } from './Plugin';

export default abstract class Handler extends Array<InstantiablePlugin> {
  public async run(context: Context) {
    for (const P of this) await new P(context);
  }
}
