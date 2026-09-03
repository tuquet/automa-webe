import customHandlers from '@business/blocks/contentHandler';
import { toCamelCase } from '@/utils/helper';

function loadHandlers() {
  if (typeof import.meta !== 'undefined' && import.meta.glob) {
    const modules = import.meta.glob('./blocksHandler/*.js', { eager: true });
    return Object.entries(modules).reduce((acc, [path, module]) => {
      const name = path
        .split('/')
        .pop()
        .replace(/^handler|\.js$/g, '');
      acc[toCamelCase(name)] = module?.default ?? module;
      return acc;
    }, {});
  }
  const blocksHandler = require.context('./blocksHandler', false, /\.js$/);
  return blocksHandler.keys().reduce((acc, key) => {
    const name = key.replace(/^\.\/handler|\.js/g, '');
    acc[toCamelCase(name)] = blocksHandler(key).default;
    return acc;
  }, {});
}

const handlers = loadHandlers();

export default function () {
  return {
    ...(customHandlers() || {}),
    ...handlers,
  };
}
