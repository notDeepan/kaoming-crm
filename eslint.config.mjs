import nextVitals from 'eslint-config-next/core-web-vitals';
import nextTypescript from 'eslint-config-next/typescript';

const config = [
  { ignores: ['.next/**', '.local/**', 'node_modules/**', '.npm-cache/**', 'graphify-out/**', 'next-env.d.ts'] },
  ...nextVitals,
  ...nextTypescript,
];

export default config;
