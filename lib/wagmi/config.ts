import { http, createConfig, type Transport } from "wagmi";
import { injected } from "wagmi/connectors";
import { networkConfig } from "../config/network";

const chain = networkConfig.chain;

export const config = createConfig({
  chains: [chain],
  connectors: [
    injected(),
  ],
  transports: {
    [chain.id]: http(),
  } as Record<typeof chain.id, Transport>,
});

declare module "wagmi" {
  interface Register {
    config: typeof config;
  }
}
