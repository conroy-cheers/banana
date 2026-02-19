{
  description = "Banana simulation dev shell";

  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";
    flake-utils.url = "github:numtide/flake-utils";
  };

  outputs = { self, nixpkgs, flake-utils }:
    flake-utils.lib.eachDefaultSystem (system:
      let
        pkgs = import nixpkgs { inherit system; };
      in
      {
        devShells.default = pkgs.mkShell {
          packages = with pkgs; [
            nodejs_22
            nodePackages.http-server
            nodePackages.eslint
            nodePackages.prettier
          ];

          shellHook = ''
            echo "Dev shell ready: node $(node --version), npm $(npm --version)"
            echo "Start local server: http-server -c-1 ."
          '';
        };
      });
}
