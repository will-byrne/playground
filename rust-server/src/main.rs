#[tokio::main]
async fn main() {
    match rust_server::rocket_app().await {
        Ok(app) => {
            if let Err(e) = app.launch().await {
                eprintln!("Failed to launch rocket: {}", e);
            }
        }
        Err(e) => eprintln!("Failed to initialize app: {}", e),
    }
}

