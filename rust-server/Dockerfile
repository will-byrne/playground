# BUILDER
FROM rust:1.91 AS builder

RUN apt-get update && apt-get install -y musl-tools pkg-config libssl-dev
RUN rustup target add x86_64-unknown-linux-musl

WORKDIR /app

COPY Cargo.toml Cargo.lock ./
COPY src ./src

ENV OPENSSL_DIR="/usr"
ENV OPENSSL_LIB_DIR="/usr/lib"
ENV OPENSSL_INCLUDE_DIR="/usr/include"

RUN cargo build --release --target x86_64-unknown-linux-musl

# RUNTIME
FROM alpine:3.19

RUN apk add --no-cache ca-certificates

WORKDIR /app

ENV ROCKET_ADDRESS=0.0.0.0

COPY --from=builder /app/target/x86_64-unknown-linux-musl/release/rust-server /app/server

CMD ["./server"]

