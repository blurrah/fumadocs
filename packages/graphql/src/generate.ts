import { GraphQLFileLoader } from '@graphql-tools/graphql-file-loader';
import { loadSchema } from '@graphql-tools/load';
import { GraphQLObjectType, type GraphQLSchema } from 'graphql';
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';

/**
 * Generate GraphQL files
 */
export async function generateAll({
  input,
  output,
}: {
  input: string;
  output: string;
}): Promise<void> {
  // Load the schema from a local file path
  const schema = await loadSchema(input, {
    loaders: [new GraphQLFileLoader()],
  });

  const operations = generateOperations(schema);
  const types = generateTypes(schema);

  for (const operation of operations) {
    const path = join(output, `${operation.type}/${operation.name}.mdx`);
    await write(path, operation.content);
  }

  for (const type of types) {
    const path = join(output, `types/${type.name}.mdx`);
    await write(path, type.content);
  }
}

async function write(path: string, content: string): Promise<void> {
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, content);
}

/**
 * Generate MDX files for GraphQL operations
 * @param schema - The GraphQL schema
 * @returns - An array of operations
 */
function generateOperations(schema: GraphQLSchema): {
  name: string;
  type: string;
  content: string;
}[] {
  const operations: { name: string; type: string; content: string }[] = [];

  const queryType = schema.getQueryType();
  const mutationType = schema.getMutationType();
  const subscriptionType = schema.getSubscriptionType();

  const processFields = (type: GraphQLObjectType | null | undefined) => {
    if (!type) return;
    const fields = type.getFields();
    for (const [fieldName, field] of Object.entries(fields)) {
      const args = field.args.map(
        (arg) => `${arg.name}: ${arg.type.toString()}`,
      );
      const mdxContent = `
---
title: ${fieldName}
description: ${field.description ?? `Description for ${fieldName}`}
---

# ${fieldName}


${field.description ?? ''}

${args.length > 0 ? `## Arguments\n\n${args.map((arg) => `- ${arg}`).join('\n')}` : ''}
      `.trim();

      operations.push({
        name: fieldName,
        type: getOperationType(schema, type),
        content: mdxContent,
      });
    }
  };

  processFields(queryType);
  processFields(mutationType);
  processFields(subscriptionType);

  return operations;
}

function generateTypes(schema: GraphQLSchema): {
  name: string;
  content: string;
}[] {
  const types: { name: string; content: string }[] = [];
  const typeMap = schema.getTypeMap();

  for (const [typeName, type] of Object.entries(typeMap)) {
    if (
      type instanceof GraphQLObjectType &&
      !typeName.startsWith('__') &&
      type !== schema.getQueryType() &&
      type !== schema.getMutationType() &&
      type !== schema.getSubscriptionType()
    ) {
      const fields = type.getFields();
      const fieldDefinitions = Object.entries(fields).map(
        ([fieldName, field]) => {
          return `- ${fieldName}: ${field.type.toString()}`;
        },
      );

      const mdxContent = `
---
title: ${typeName}
description: Type definition for ${typeName}
---

  # ${typeName}

  ${type.description ?? ''}

  ${fieldDefinitions.length > 0 ? `## Fields\n\n${fieldDefinitions.join('\n')}` : ''}

 `.trim();

      types.push({
        name: typeName,
        content: mdxContent,
      });
    }
  }

  return types;
}

/**
 * Determines the operation type based on the GraphQL schema and field type.
 * @param schema - The GraphQL schema
 * @param fieldType - The GraphQL object type containing the field
 * @returns The operation type as a string: 'query', 'mutation', 'subscription', or 'type'
 */
function getOperationType(
  schema: GraphQLSchema,
  fieldType: GraphQLObjectType,
): string {
  if (fieldType === schema.getQueryType()) {
    return 'query';
  }
  if (fieldType === schema.getMutationType()) {
    return 'mutation';
  }
  if (fieldType === schema.getSubscriptionType()) {
    return 'subscription';
  }
  return 'type';
}
