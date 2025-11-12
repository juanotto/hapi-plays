# Hapit Application Deployment
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
        init_container {
          name  = "wait-for-postgres"
          image = "busybox:1.36"
          
          command = [
            "sh",
            "-c",
            "until nc -z postgres-service 5432; do echo 'Waiting for PostgreSQL...'; sleep 2; done; echo 'PostgreSQL is ready!'"
          ]
        }

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

          env {
            name  = "DB_HOST"
            value = "postgres-service"
          }

          env {
            name  = "DB_PORT"
            value = "5432"
          }

          env {
            name  = "DB_NAME"
            value = "hapit"
          }

          env {
            name  = "DB_USER"
            value = "hapit"
          }

          env {
            name  = "DB_PASSWORD"
            value = "hapit123"
          }
        }
      }
    }
  }
}

# Hapit Application Service (NodePort)
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
