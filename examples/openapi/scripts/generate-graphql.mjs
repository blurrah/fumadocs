import { generateFiles } from 'fumadocs-graphql';
import { rimrafSync } from 'rimraf';

rimrafSync('./content/docs/(graphql)', {
  filter(v) {
    return !v.endsWith('index.mdx') && !v.endsWith('meta.json');
  },
});

void generateFiles({
  input: './schema.graphql',
  output: './content/docs/(graphql)',
});
