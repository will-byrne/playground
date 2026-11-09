# Dev shells for every project, all on the root flake's nixpkgs. Each project's
# .envrc loads its own with `use flake ..#<project>`, or run
# `nix develop .#<project>` from the repo root.
#
# The toolchains match what nix/packages.nix builds with, so what works in a
# shell works in `nix build` and `nix run`.
{ pkgs }:
let
  inherit (pkgs) lib;

  jdk = pkgs.jdk21_headless;

  javaShell =
    jdk:
    pkgs.mkShell {
      packages = [
        jdk
        (pkgs.maven.override { jdk_headless = jdk; })
      ];
    };

  toolchains = {
    ts = pkgs.mkShell {
      packages = [
        pkgs.bun
        pkgs.nodejs_22
        pkgs.typescript
        pkgs.typescript-language-server
        pkgs.biome
      ];
    };

    rust = pkgs.mkShell {
      packages = [
        pkgs.rustc
        pkgs.cargo
        pkgs.clippy
        pkgs.rustfmt
        pkgs.rust-analyzer
        # openssl-sys: rust-client links the system OpenSSL, rust-server
        # builds its own ("vendored", which needs perl)
        pkgs.pkg-config
        pkgs.openssl
        pkgs.perl
      ];
      # rust-analyzer finds the standard library sources here
      RUST_SRC_PATH = "${pkgs.rustPlatform.rustLibSrc}";
    };

    go = pkgs.mkShell {
      packages = [
        pkgs.go_1_26
        pkgs.gopls
        pkgs.gotools
        pkgs.golangci-lint
      ];
    };

    java = javaShell jdk;
  };

  # A toolchain plus extra packages or environment for one project.
  extend =
    toolchain: extra:
    pkgs.mkShell (
      {
        inputsFrom = [ toolchain ];
      }
      // extra
    );

  ofToolchain = toolchain: names: lib.genAttrs names (_: toolchain);
in
ofToolchain toolchains.ts [
  "ai-tdd-express-client"
  "angular-client"
  "astro-client"
  "effect-server"
  "elysia-server"
  "hono-server"
  "lit-client"
  "mantine-client"
  "react-client"
  "remix-client"
  "svelt-client"
  "tsrx-client"
]
// ofToolchain toolchains.rust [
  "rust-client"
  "rust-server"
]
// ofToolchain toolchains.go [ "go-server" ]
// ofToolchain toolchains.java [ "java-server" ]
// {
  # Its pom.xml targets Java 25.
  java-fusion-server = javaShell pkgs.jdk25_headless;

  # Schemathesis isn't in nixpkgs; `bun run fuzz` runs it through uvx.
  contract = extend toolchains.ts { packages = [ pkgs.uv ]; };

  # Playwright's own Chromium download doesn't run on NixOS; use nixpkgs'.
  e2e = extend toolchains.ts {
    packages = [ pkgs.chromium ];
    CHROMIUM_PATH = "${pkgs.chromium}/bin/chromium";
  };

  # The repo root: running the whole stack and working on the Nix files.
  default = pkgs.mkShell {
    packages = [
      pkgs.process-compose
      pkgs.mongosh
      pkgs.nixfmt
    ];
  };
}
