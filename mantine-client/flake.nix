{
  description = "Playwright development environment";
  inputs.flake-utils.url = "github:numtide/flake-utils";
  inputs.nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";
  inputs.playwright.url = "github:pietdevries94/playwright-web-flake";

  outputs = { self, flake-utils, nixpkgs, playwright }:
    flake-utils.lib.eachDefaultSystem (system:
      let
        overlay = final: prev: {
          inherit (playwright.packages.${system}) playwright-test playwright-driver;
        };
        pkgs = import nixpkgs {
          inherit system;
          overlays = [ overlay ];
        };
      in
      {
        devShells = {
          default = pkgs.mkShell {
            packages = [
              pkgs.nodejs

              # Alternatively, you can use a specific major version of Node.js

              # pkgs.nodejs-22_x

              # Use corepack to install npm/pnpm/yarn as specified in package.json
              pkgs.corepack

              # To install a specific alternative package manager directly,
              # comment out one of these to use an alternative package manager.

              pkgs.yarn
              # pkgs.pnpm
              # pkgs.bun

              # Required to enable the language server
              pkgs.nodePackages.typescript
              pkgs.nodePackages.typescript-language-server

              # Python is required on NixOS if the dependencies require node-gyp

              # pkgs.python3
              pkgs.playwright-test
            ];
            shellHook = ''
              export PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1
              export PLAYWRIGHT_BROWSERS_PATH="${pkgs.playwright-driver.browsers}"
            '';
          };
        };
      });
}
