# Hapi Plays

Project to learn hapi and related stack. The application handles a sports playbook app, users can create and share plays with their teammates.

## Prerequisites

- Node.js v22+
- npm
- Docker

## How to run it

```Install dependencies
npm install
```

```Run the app
npm run dev
```

The application will be available at `http://localhost:3000` by default

### Run for production

```Run for production
npm start
```

## Configuration

The application uses an env file to set variables when running locally. Chech `.env` in the root of the project.

## Docker

### Building the Image

```bash
docker build -t hapit .
```

### Running a Container

```bash
docker run -p 3000:3000 hapit
```

### Run in Background

```bash
docker run -d -p 3000:3000 hapit
```

## Kubernetes Deployment

The project supports deployment to MicroK8s using Terraform. The application is deployed to a dedicated `hapit` namespace with a NodePort service accessible on port 30080.

See [terraform/README.md](terraform/README.md) for detailed deployment instructions.

## Testing

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
