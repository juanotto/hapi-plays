terraform {
  required_providers {
    kubernetes = {
      source  = "hashicorp/kubernetes"
      version = "~> 2.23"
    }
  }
}

provider "kubernetes" {
  config_path = "~/.kube/config"
}

# Create hapit namespace
resource "kubernetes_namespace" "hapit" {
  metadata {
    name = "hapit"
  }
}

# Create deployment
resource "kubernetes_deployment" "hapit" {
  metadata {
    name      = "hapit"
    namespace = kubernetes_namespace.hapit.metadata[0].name
    labels = {
      app = "hapit"
    }
  }

  spec {
    replicas = 1

    selector {
      match_labels = {
        app = "hapit"
      }
    }

    template {
      metadata {
        labels = {
          app = "hapit"
        }
      }

      spec {
        container {
          name  = "hapit"
          image = "localhost:32000/hapit:latest"

          port {
            container_port = 3000
          }

          env {
            name  = "PORT"
            value = "3000"
          }

          env {
            name  = "HOST"
            value = "0.0.0.0"
          }

          env {
            name  = "NODE_ENV"
            value = "production"
          }
        }
      }
    }
  }
}

# Create NodePort service
resource "kubernetes_service" "hapit" {
  metadata {
    name      = "hapit-service"
    namespace = kubernetes_namespace.hapit.metadata[0].name
  }

  spec {
    type = "NodePort"

    selector = {
      app = "hapit"
    }

    port {
      port        = 3000
      target_port = 3000
      node_port   = 30080
    }
  }
}
