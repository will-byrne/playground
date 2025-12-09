# BUILDER
FROM rust:alpine3.22 AS builder

RUN apk add pkgconf openssl-dev

WORKDIR /app

COPY Cargo.toml Cargo.lock ./
COPY src ./src

ENV OPENSSL_DIR="/usr"
ENV OPENSSL_LIB_DIR="/usr/lib"
ENV OPENSSL_INCLUDE_DIR="/usr/include"

RUN cargo build --release 

# RUNTIME
FROM alpine:3.19

RUN apk add --no-cache ca-certificates openssl-dev

WORKDIR /app

ENV ROCKET_ADDRESS=0.0.0.0

COPY --from=builder /app/target/release/rust-server /app/server

CMD ["./server"]

