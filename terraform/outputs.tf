output "namespace" {
  description = "The namespace where hapit is deployed"
  value       = kubernetes_namespace.hapit.metadata[0].name
}

output "service_url" {
  description = "URL to access the hapit service"
  value       = "http://localhost:30080"
}

output "deployment_name" {
  description = "Name of the hapit deployment"
  value       = kubernetes_deployment.hapit.metadata[0].name
}
