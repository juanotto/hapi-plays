# Create hapit namespace
resource "kubernetes_namespace" "hapit" {
  metadata {
    name = "hapit"
  }
}
