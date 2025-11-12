# Terraform Deployment for Hapit

This directory contains Terraform configuration to deploy the hapit application to a local MicroK8s cluster.

## Prerequisites

- MicroK8s installed and running
- MicroK8s registry addon enabled (`microk8s enable registry`)
- Terraform installed

### Configure Docker for MicroK8s Registry

If not already configured, Docker needs to allow the insecure registry at `localhost:32000`:

```bash
# Create or edit Docker daemon configuration
sudo bash -c 'cat > /etc/docker/daemon.json << EOF
{
  "insecure-registries": ["localhost:32000"]
}
EOF'

# Restart Docker to apply changes
sudo systemctl restart docker

# Verify the configuration
docker info | grep -A 5 "Insecure Registries"
# If you see `Insecure Registries: localhost:32000`, that was sucessful.
```

### Push Image to Registry

Before deploying, build and push the hapit image to the local registry:

```bash
# Build and tag for local registry
docker build -t localhost:32000/hapit:latest .

# Push to microk8s registry
docker push localhost:32000/hapit:latest

# Verify image is in registry
curl -s http://localhost:32000/v2/hapit/tags/list
```

## Configuration

The Terraform configuration creates:

- **Namespace**: `hapit` - dedicated namespace for the application
- **Deployment**: Single replica running the hapit container
- **Service**: NodePort service exposing the application on port 30080

### Environment Variables

The deployment includes the following environment variables:

- `PORT=3000` - Application port
- `HOST=0.0.0.0` - Bind to all interfaces
- `NODE_ENV=production` - Run in production mode

## Usage

### Initialize Terraform

```bash
terraform init
```

### Preview Changes

```bash
terraform plan
```

### Deploy to MicroK8s

```bash
terraform apply
```

The application will be accessible at `http://localhost:30080`

### View Current State

```bash
terraform show
```

### Destroy Deployment

```bash
terraform destroy
```

## Outputs

After applying, Terraform provides:

- `namespace` - The namespace where hapit is deployed
- `deployment_name` - Name of the deployment
- `service_url` - URL to access the application

## Verify Deployment

```bash
# Check pods
microk8s kubectl get pods -n hapit

# Check service
microk8s kubectl get svc -n hapit

# Test the application
curl http://localhost:30080
```

## Files

- `main.tf` - Main Terraform configuration with provider, namespace, deployment, and service
- `outputs.tf` - Output values for easy reference
