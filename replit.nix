{pkgs}: {
  deps = [
    pkgs.libxcrypt
    pkgs.libyaml
    pkgs.glibcLocales
    pkgs.postgresql
    pkgs.openssl
  ];
}
