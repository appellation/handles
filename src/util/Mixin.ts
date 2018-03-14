export default function Mixin(ctors: Array<{ prototype: any }>) {
  return (target: { prototype: any }) => {
    for (const ctor of ctors) {
      Object.defineProperties(target.prototype, Object.getOwnPropertyDescriptors(ctor.prototype));
    }
  };
}
