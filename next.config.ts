import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // A aba "Pregação" virou "Escalas": links antigos continuam funcionando.
  async redirects() {
    return [
      { source: "/pregacao", destination: "/escalas", permanent: true },
      { source: "/pregacao/:data/:culto", destination: "/escalas/:data/:culto", permanent: true },
    ];
  },
};

export default nextConfig;
