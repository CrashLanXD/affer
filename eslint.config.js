import ignores from "./eslint/ignores.js";

import base from "./eslint/base.js";
import typescript from "./eslint/typescript.js";
import stylistic from "./eslint/stylistic.js";



export default [
  ignores,
  ...base,
  ...typescript,
  ...stylistic,
];
