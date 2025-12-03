#[tokio::main]
async fn main() {
    rust_server::rocket_app().await.launch().await.unwrap();
}