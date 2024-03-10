import { Plugin } from 'rollup';

declare function preserveDirectives(): Plugin;

declare const preserveDirective: typeof preserveDirectives;

export { preserveDirectives as default, preserveDirective };
