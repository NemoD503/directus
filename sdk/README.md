# Directus JS SDK Revamped

The design goals for this rebuild:
- TypeScript first
- Modular/Composable architecture
- Lightweight and Dependency Free

## Composable Client

The client is split up in separate features you can mix and match to compose a client with only the features you need or want.

```ts
const client = useDirectus<Schema>('https://api.directus.io');
```

This client is currently an empty wrapper without any functionality.Before you can do anything with it you'll need to add some features.
The following composables are available/in progress:
- `rest()` REST request functions
  - adds `.request(...)` on the client
- `graphql()` GraphQL request functions
  - adds `.query(...)` on the client
- `auth()` authentication functions [wip]
  - adds `.login({ email, password })`, `.logout()`, `.refresh()` on the client
- `realtime()` websocket connectivity [wip]
  - adds `.subscribe(...)`, `.message(...)` on the client
- `subscription()` GraphQL Subscriptions [wip]
  - not sure yet but something like `.subscription()`

For this example we'll build a client including `rest` and `graphql`:
```ts
const client = useDirectus<Schema>('https://api.directus.io')
    .use(rest())
    .use(graphql());

// do a REST request
const restResult = await client.request(readItems('articles'));

// do a GraphQL request
const gqlResult = await client.query<OutputType>(`
    query {
        articles {
            id
            title
            author {
                first_name
            }
        }
    }
`);

```