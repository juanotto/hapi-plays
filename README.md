# Hapit - Sports Playbook Application# Hapi Plays



A monorepo containing the Hapit application for managing sports playbooks and teams.Project to learn hapi and related stack. The application handles a sports playbook app, users can create and share plays with their teammates.



## Project Structure## Prerequisites



```- Node.js v22+

hapit/- npm

├── backend/          # Node.js Hapi.js API server- Docker

├── frontend/         # Frontend application (coming soon)

└── terraform/        # Infrastructure as code for Kubernetes deployment## How to run it

```

```Install dependencies

## Backendnpm install

```

The backend is a Hapi.js REST API server with authentication and database integration.

```Run the app

**Technology Stack:**npm run dev

- Node.js 22 with Hapi.js framework```

- PostgreSQL (production) / SQLite (development)

- JWT authenticationThe application will be available at `http://localhost:3000` by default

- Kubernetes deployment with Terraform

### Run for production

See [backend/README.md](./backend/README.md) for detailed backend documentation.

```Run for production

## Frontendnpm start

```

Coming soon.

## Configuration

## Infrastructure

The application uses an env file to set variables when running locally. Chech `.env` in the root of the project.

The application is deployed to MicroK8s using Terraform for infrastructure management.

## Docker

**Components:**

- Kubernetes namespace (`hapit`)### Building the Image

- PostgreSQL database with persistent storage

- Backend API service (NodePort on 30080)```bash

- Init container pattern for database readinessdocker build -t hapit .

```

See [terraform/README.md](./terraform/README.md) for deployment instructions.

### Running a Container

## Development

```bash

### Backend Developmentdocker run -p 3000:3000 hapit

```bash```

cd backend

npm install### Run in Background

npm run dev  # Uses SQLite for local development

``````bash

docker run -d -p 3000:3000 hapit

### Production Deployment```

```bash

cd terraform## Kubernetes Deployment

terraform init

terraform applyThe project supports deployment to MicroK8s using Terraform. The application is deployed to a dedicated `hapit` namespace with a NodePort service accessible on port 30080.

```

See [terraform/README.md](terraform/README.md) for detailed deployment instructions.

## License

## Testing

ISC

### Run All Tests

```bash
npm test
```

### Run a file

```bash
npm run test:file <path_to_specs>
```

## Manual Testing

### API Endpoints

- `GET /api/teams` - List all teams
- `POST /api/teams` - Create a new team
- `GET /api/teams/:id` - Get specific team
- `PUT /api/teams/:id` - Update team
- `DELETE /api/teams/:id` - Delete team

### Example cURL Commands

```bash
# Create a play
curl -X POST http://localhost:3000/api/teams \
    -H "Content-Type: application/json" \
    -d '{"name": "Lions", "description": "Best pickleball team!", "maxMembers": 5}'

# List teams
curl http://localhost:3000/api/teams
```

## Environment Variables

Create a `.env` file in the root directory:

```env
# Application Configuration
PORT=3000
HOST=0.0.0.0
NODE_ENV=development
```
