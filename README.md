# task-management-system-302621-302631 (backend_node_express workspace)

## Cloud preview URLs (hardcoded for this workspace)

- Frontend origin (CORS): `https://vscode-internal-11829-beta.beta01.cloud.kavia.ai:3000`
- Backend API base: `https://vscode-internal-11829-beta.beta01.cloud.kavia.ai:3001`

### CORS behavior

The Express backend allows CORS from:

1. The env-configured frontend URL (`NEXT_PUBLIC_FRONTEND_URL`)
2. The hardcoded cloud preview origin above (to prevent preview misconfiguration)

If you change preview URLs, update `backend_node_express/src/app.js` accordingly.